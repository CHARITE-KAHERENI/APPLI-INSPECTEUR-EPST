import type { FormSubmissionStatus } from '@c3-digital/shared';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { UserEntity } from '../users/entities/user.entity';
import { CreateFormSubmissionDto } from './dto/create-form-submission.dto';
import { DashboardStats, FormCodeStats } from './dto/dashboard-stats.dto';
import { QueryFormSubmissionDto } from './dto/query-form-submission.dto';
import { FormSubmissionEntity } from './entities/form-submission.entity';
import { FormTemplateEntity } from '../form-templates/entities/form-template.entity';
import { computeOverallScore } from './overall-score.util';

@Injectable()
export class FormSubmissionsService {
  constructor(
    @InjectRepository(FormSubmissionEntity)
    private readonly repository: Repository<FormSubmissionEntity>,
    @InjectRepository(FormTemplateEntity)
    private readonly templateRepository: Repository<FormTemplateEntity>,
  ) {}

  async create(dto: CreateFormSubmissionDto): Promise<FormSubmissionEntity> {
    const sections = dto.sections ?? [];
    const template = await this.templateRepository.findOne({
      where: { id: dto.templateId },
    });
    const overall = template
      ? computeOverallScore(template.definition, sections)
      : { percentage: null, mention: null };

    const submission = this.repository.create({
      ...dto,
      sections,
      signatures: dto.signatures ?? [],
      status: 'brouillon',
      overallPercentage:
        overall.percentage !== null ? overall.percentage.toFixed(2) : null,
      overallMention: overall.mention,
    });
    return this.repository.save(submission);
  }

  /** Utilisé en interne (sync, PDF) — sans vérification d'autorisation. */
  async findOne(id: string): Promise<FormSubmissionEntity> {
    const submission = await this.repository.findOne({
      where: { id },
      relations: ['etablissement'],
    });
    if (!submission) {
      throw new NotFoundException(`Formulaire "${id}" introuvable.`);
    }
    return submission;
  }

  /**
   * Détail d'un formulaire, avec vérification qu'il entre dans le
   * périmètre de visibilité de `user` (voir `isInScope`) — utilisé par
   * les routes web (`GET /form-submissions/:id`) et le PDF.
   */
  async findOneScoped(
    id: string,
    user: UserEntity,
  ): Promise<FormSubmissionEntity> {
    const submission = await this.findOne(id);
    if (!this.isInScope(submission, user)) {
      throw new ForbiddenException(
        "Ce formulaire n'est pas dans votre périmètre.",
      );
    }
    return submission;
  }

  /**
   * Liste des formulaires visibles par `user`, filtrée par rôle (voir
   * `applyScope`) puis par les filtres de la page "Inspections" (web).
   */
  findAllScopedForUser(
    user: UserEntity,
    query: QueryFormSubmissionDto,
  ): Promise<FormSubmissionEntity[]> {
    const qb = this.scopedQueryBuilder(user);

    if (query.formCode) {
      qb.andWhere('submission.formCode = :formCode', {
        formCode: query.formCode,
      });
    }
    if (query.etablissementId) {
      qb.andWhere('submission.etablissementId = :filterEtablissementId', {
        filterEtablissementId: query.etablissementId,
      });
    }
    if (query.inspecteurId) {
      qb.andWhere('submission.inspecteurId = :filterInspecteurId', {
        filterInspecteurId: query.inspecteurId,
      });
    }
    if (query.status) {
      qb.andWhere('submission.status = :status', { status: query.status });
    }
    if (query.schoolYear) {
      qb.andWhere('submission.schoolYear = :schoolYear', {
        schoolYear: query.schoolYear,
      });
    }
    if (query.dateFrom) {
      qb.andWhere('submission.createdAt >= :dateFrom', {
        dateFrom: query.dateFrom,
      });
    }
    if (query.dateTo) {
      qb.andWhere('submission.createdAt <= :dateTo', { dateTo: query.dateTo });
    }

    return qb.orderBy('submission.createdAt', 'DESC').getMany();
  }

  /** Cartes de synthèse + graphique du tableau de bord IGE (web), dans le périmètre de `user`. */
  async stats(user: UserEntity): Promise<DashboardStats> {
    const base = this.scopedQueryBuilder(user);

    const byFormCodeRaw = await base
      .clone()
      .select('submission.formCode', 'formCode')
      .addSelect('COUNT(*)', 'count')
      .addSelect('AVG(submission.overallPercentage)', 'averagePercentage')
      .groupBy('submission.formCode')
      .getRawMany<{
        formCode: string;
        count: string;
        averagePercentage: string | null;
      }>();

    const byFormCode: FormCodeStats[] = byFormCodeRaw.map((row) => ({
      formCode: row.formCode as FormCodeStats['formCode'],
      count: Number(row.count),
      averagePercentage:
        row.averagePercentage !== null ? Number(row.averagePercentage) : null,
    }));

    const totalInspections = byFormCode.reduce(
      (sum, row) => sum + row.count,
      0,
    );

    const activeEtablissementsRow = await base
      .clone()
      .select('COUNT(DISTINCT submission.etablissementId)', 'count')
      .getRawOne<{ count: string }>();

    const latest = await base
      .clone()
      .orderBy('submission.createdAt', 'DESC')
      .limit(10)
      .getMany();

    return {
      totalInspections,
      byFormCode,
      activeEtablissements: Number(activeEtablissementsRow?.count ?? 0),
      latest,
    };
  }

  /**
   * Fait avancer le cycle de vie du formulaire : brouillon -> soumis ->
   * synchronise. Horodate automatiquement `submittedAt` / `syncedAt`.
   */
  async updateStatus(
    id: string,
    status: FormSubmissionStatus,
  ): Promise<FormSubmissionEntity> {
    const submission = await this.findOne(id);
    submission.status = status;
    if (status === 'soumis' && !submission.submittedAt) {
      submission.submittedAt = new Date();
    }
    if (status === 'synchronise' && !submission.syncedAt) {
      submission.syncedAt = new Date();
    }
    return this.repository.save(submission);
  }

  private scopedQueryBuilder(
    user: UserEntity,
  ): SelectQueryBuilder<FormSubmissionEntity> {
    const qb = this.repository
      .createQueryBuilder('submission')
      .leftJoin('submission.etablissement', 'etablissement');
    this.applyScope(qb, user);
    return qb;
  }

  /**
   * Restreint la requête au périmètre du rôle de `user` — voir PROMPT 6 :
   * - `super_admin`         : tout
   * - `ige_admin`           : sa zone (`user.zone`, ex: "Nord-Kivu 2"),
   *   comparée à `etablissement.zone` ; si `user.zone` n'est pas défini,
   *   traité comme un accès non restreint (compte IGE non encore affecté
   *   à une zone précise)
   * - `chef_etablissement`  : son établissement (`user.etablissementId`)
   * - `inspecteur`          : ses propres inspections (`user.inspecteurId`)
   * - `enseignant`          : les formulaires le concernant (`user.enseignantId`)
   *
   * Un rôle scopé dont l'identifiant de rattachement n'est pas configuré
   * (compte incomplet) ne voit rien, plutôt que de se voir attribuer par
   * défaut un accès plus large que prévu.
   */
  private applyScope(
    qb: SelectQueryBuilder<FormSubmissionEntity>,
    user: UserEntity,
  ): void {
    switch (user.role) {
      case 'super_admin':
        return;
      case 'ige_admin':
        if (user.zone) {
          qb.andWhere('etablissement.zone = :userZone', {
            userZone: user.zone,
          });
        }
        return;
      case 'chef_etablissement':
        if (!user.etablissementId) {
          qb.andWhere('1 = 0');
          return;
        }
        qb.andWhere('submission.etablissementId = :scopeEtablissementId', {
          scopeEtablissementId: user.etablissementId,
        });
        return;
      case 'inspecteur':
        if (!user.inspecteurId) {
          qb.andWhere('1 = 0');
          return;
        }
        qb.andWhere('submission.inspecteurId = :scopeInspecteurId', {
          scopeInspecteurId: user.inspecteurId,
        });
        return;
      case 'enseignant':
        if (!user.enseignantId) {
          qb.andWhere('1 = 0');
          return;
        }
        qb.andWhere('submission.enseignantId = :scopeEnseignantId', {
          scopeEnseignantId: user.enseignantId,
        });
        return;
    }
  }

  private isInScope(
    submission: FormSubmissionEntity,
    user: UserEntity,
  ): boolean {
    switch (user.role) {
      case 'super_admin':
        return true;
      case 'ige_admin':
        return !user.zone || submission.etablissement?.zone === user.zone;
      case 'chef_etablissement':
        return (
          Boolean(user.etablissementId) &&
          submission.etablissementId === user.etablissementId
        );
      case 'inspecteur':
        return (
          Boolean(user.inspecteurId) &&
          submission.inspecteurId === user.inspecteurId
        );
      case 'enseignant':
        return (
          Boolean(user.enseignantId) &&
          submission.enseignantId === user.enseignantId
        );
    }
  }
}
