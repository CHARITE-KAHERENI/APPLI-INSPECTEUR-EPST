import { Injectable, Logger } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { FormSubmissionEntity } from '../form-submissions/entities/form-submission.entity';
import { computeOverallScore } from '../form-submissions/overall-score.util';
import { FormTemplateEntity } from '../form-templates/entities/form-template.entity';
import { SubscriberEntity } from '../subscriptions/entities/subscriber.entity';
import { FormSubmissionVersionEntity } from './entities/form-submission-version.entity';
import { BatchSyncSubmissionsDto } from './dto/batch-sync-submissions.dto';
import { SyncSubmissionItemDto } from './dto/sync-submission-item.dto';
import { SyncResultDto, SyncStatusResponseDto } from './dto/sync-result.dto';

/**
 * Traite la file de synchronisation envoyée par l'application mobile
 * hors-ligne (voir mobile/lib/core/sync).
 *
 * Politique de résolution de conflit ("privilégie la version locale la
 * plus récente mais conserve un historique des deux versions") :
 *
 * 1. Si aucun `form_submissions` n'existe encore pour cet identifiant :
 *    simple création.
 * 2. Sinon, on compare `item.clientUpdatedAt` à la valeur déjà stockée.
 *    Si le serveur a déjà une version locale au moins aussi récente
 *    (typiquement une resynchronisation en retard, ou une double
 *    tentative réseau), on ne réécrit rien : réponse idempotente
 *    `applied: false`.
 * 3. Sinon, la version reçue est la plus récente : avant de l'appliquer,
 *    l'état actuel est archivé dans `form_submission_versions`. Si
 *    l'appareil avait fourni `baseServerUpdatedAt` (le `updatedAt`
 *    serveur qu'il connaissait) et que celui-ci ne correspond plus à
 *    `updatedAt` actuel, cela signifie qu'une modification serveur
 *    indépendante a eu lieu entre-temps (ex: changement de statut via une
 *    future interface web) : un vrai conflit est alors marqué
 *    (`isConflict`), mais la version locale est tout de même appliquée —
 *    l'ancienne version reste consultable dans l'historique.
 */
@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(private readonly dataSource: DataSource) {}

  async syncSubmissions(
    dto: BatchSyncSubmissionsDto,
  ): Promise<SyncResultDto[]> {
    const results: SyncResultDto[] = [];
    for (const item of dto.submissions) {
      try {
        results.push(await this.syncOne(item));
      } catch (error) {
        this.logger.error(
          `Échec de synchronisation pour localId=${item.localId}`,
          error as Error,
        );
        results.push({
          localId: item.localId,
          submissionId: item.id,
          status: 'error',
          applied: false,
          conflict: false,
          message: error instanceof Error ? error.message : 'Erreur inconnue',
        });
      }
    }
    return results;
  }

  getStatus(): SyncStatusResponseDto {
    return { status: 'ok', serverTime: new Date().toISOString() };
  }

  /**
   * Historique consultable d'un formulaire : la version actuelle (issue de
   * `form_submissions`) suivie des versions remplacées lors des
   * synchronisations précédentes (`form_submission_versions`, la plus
   * récente d'abord), avec leur motif d'archivage — permet à l'IGE de
   * consulter les deux versions lorsqu'un conflit a été détecté.
   */
  async getSubmissionHistory(submissionId: string): Promise<{
    current: FormSubmissionEntity | null;
    versions: FormSubmissionVersionEntity[];
  }> {
    const submissionRepo = this.dataSource.getRepository(FormSubmissionEntity);
    const versionRepo = this.dataSource.getRepository(
      FormSubmissionVersionEntity,
    );

    const [current, versions] = await Promise.all([
      submissionRepo.findOne({ where: { id: submissionId } }),
      versionRepo.find({
        where: { submissionId },
        order: { archivedAt: 'DESC' },
      }),
    ]);

    return { current, versions };
  }

  private async syncOne(item: SyncSubmissionItemDto): Promise<SyncResultDto> {
    return this.dataSource.transaction(async (manager) => {
      const submissionRepo = manager.getRepository(FormSubmissionEntity);
      const versionRepo = manager.getRepository(FormSubmissionVersionEntity);

      const existing = await submissionRepo.findOne({ where: { id: item.id } });
      const clientUpdatedAt = new Date(item.clientUpdatedAt);
      const overall = await this.computeOverallScoreFor(
        manager,
        item.templateId,
        item.sections,
      );

      if (!existing) {
        // Vérification "best-effort" de la lecture seule (PROMPT 7, point
        // 3) : l'app mobile n'a pas encore d'authentification (voir
        // README, "Prochaines étapes"), donc `/sync/submissions` reste un
        // endpoint ouvert et ce contrôle ne s'applique que si l'entrée
        // porte déjà un `etablissementId`/`inspecteurId` (annuaire relié
        // côté mobile) — sans ces identifiants, rien n'est bloqué ici.
        const readOnly = await this.isAccountReadOnly(
          manager,
          item.etablissementId,
          item.inspecteurId,
        );
        if (readOnly) {
          return {
            localId: item.localId,
            submissionId: item.id,
            status: 'error',
            applied: false,
            conflict: false,
            message:
              'Compte en lecture seule (essai gratuit ou abonnement expiré) : impossible de créer une ' +
              'nouvelle inspection. Consultez GET /subscriptions/plans pour choisir une formule.',
          };
        }

        const created = submissionRepo.create({
          id: item.id,
          templateId: item.templateId,
          formCode: item.formCode,
          reportNumber: item.reportNumber,
          schoolYear: item.schoolYear,
          header: item.header,
          sections: item.sections,
          signatures: item.signatures,
          status: item.status,
          createdBy: item.createdBy ?? null,
          deviceId: item.deviceId ?? null,
          clientUpdatedAt,
          submittedAt: item.status !== 'brouillon' ? new Date() : null,
          syncedAt: new Date(),
          etablissementId: item.etablissementId ?? null,
          enseignantId: item.enseignantId ?? null,
          inspecteurId: item.inspecteurId ?? null,
          overallPercentage:
            overall.percentage !== null ? overall.percentage.toFixed(2) : null,
          overallMention: overall.mention,
        });
        const saved = await submissionRepo.save(created);
        return this.toResult(item, saved, { applied: true, conflict: false });
      }

      const hasNewerOrEqualLocal =
        !existing.clientUpdatedAt ||
        clientUpdatedAt.getTime() >= existing.clientUpdatedAt.getTime();

      if (!hasNewerOrEqualLocal) {
        // Le serveur possède déjà une version locale plus récente que celle
        // envoyée (resynchronisation en retard) : on ne perd rien en ne
        // faisant rien.
        return this.toResult(item, existing, {
          applied: false,
          conflict: false,
          message: 'Le serveur possède déjà une version locale plus récente.',
        });
      }

      const isConflict = Boolean(
        item.baseServerUpdatedAt &&
        new Date(item.baseServerUpdatedAt).getTime() !==
          existing.updatedAt.getTime(),
      );

      await versionRepo.save(
        versionRepo.create({
          submissionId: existing.id,
          snapshot: {
            header: existing.header,
            sections: existing.sections,
            signatures: existing.signatures,
            status: existing.status,
            clientUpdatedAt: existing.clientUpdatedAt
              ? existing.clientUpdatedAt.toISOString()
              : null,
            updatedAt: existing.updatedAt.toISOString(),
          },
          isConflict,
          reason: isConflict ? 'sync_conflict' : 'sync_update',
        }),
      );

      existing.header = item.header;
      existing.sections = item.sections;
      existing.signatures = item.signatures;
      existing.status = item.status;
      existing.clientUpdatedAt = clientUpdatedAt;
      existing.syncedAt = new Date();
      existing.overallPercentage =
        overall.percentage !== null ? overall.percentage.toFixed(2) : null;
      existing.overallMention = overall.mention;
      if (item.status !== 'brouillon' && !existing.submittedAt) {
        existing.submittedAt = new Date();
      }
      if (item.deviceId) {
        existing.deviceId = item.deviceId;
      }
      if (item.etablissementId) {
        existing.etablissementId = item.etablissementId;
      }
      if (item.enseignantId) {
        existing.enseignantId = item.enseignantId;
      }
      if (item.inspecteurId) {
        existing.inspecteurId = item.inspecteurId;
      }

      const saved = await submissionRepo.save(existing);
      return this.toResult(item, saved, {
        applied: true,
        conflict: isConflict,
      });
    });
  }

  /**
   * Recharge la définition du template pour calculer le score de
   * synthèse final de l'entrée reçue (voir
   * `overall-score.util.ts#computeOverallScore`) — dénormalisé sur
   * `form_submissions` pour les agrégations du tableau de bord IGE.
   * Le template pouvant avoir été désactivé depuis (nouvelle version),
   * on le recherche par `id` sans filtrer sur `isActive`.
   */
  private async computeOverallScoreFor(
    manager: EntityManager,
    templateId: string,
    sections: SyncSubmissionItemDto['sections'],
  ): Promise<{ percentage: number | null; mention: string | null }> {
    const template = await manager
      .getRepository(FormTemplateEntity)
      .findOne({ where: { id: templateId } });
    if (!template) {
      return { percentage: null, mention: null };
    }
    return computeOverallScore(template.definition, sections);
  }

  private async isAccountReadOnly(
    manager: EntityManager,
    etablissementId?: string | null,
    inspecteurId?: string | null,
  ): Promise<boolean> {
    if (!etablissementId && !inspecteurId) {
      return false;
    }
    const subscriber = await manager.getRepository(SubscriberEntity).findOne({
      where: etablissementId
        ? { etablissementId }
        : { inspecteurId: inspecteurId as string },
    });
    if (!subscriber) {
      return false;
    }
    return (
      subscriber.status === 'lecture_seule' || subscriber.status === 'expire'
    );
  }

  private toResult(
    item: SyncSubmissionItemDto,
    submission: FormSubmissionEntity,
    extra: { applied: boolean; conflict: boolean; message?: string },
  ): SyncResultDto {
    return {
      localId: item.localId,
      submissionId: submission.id,
      status: 'synced',
      applied: extra.applied,
      conflict: extra.conflict,
      serverUpdatedAt: submission.updatedAt.toISOString(),
      message: extra.message,
    };
  }
}
