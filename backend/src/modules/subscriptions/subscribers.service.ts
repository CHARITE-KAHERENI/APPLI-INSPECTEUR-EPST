import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { UserEntity } from '../users/entities/user.entity';
import { QuerySubscribersDto } from './dto/query-subscribers.dto';
import { SubscriberEntity } from './entities/subscriber.entity';
import { SubscriptionPlanEntity } from './entities/subscription-plan.entity';

const TRIAL_DAYS = 14;

/**
 * Cycle de vie des comptes facturables (`subscribers`) — création de
 * l'essai gratuit, résolution du compte de l'utilisateur courant,
 * application d'un paiement réussi. Le rafraîchissement périodique des
 * statuts (essai/abonnement/pack expiré -> lecture seule) est fait par
 * `SubscriptionsSchedulerService` (cron), pas ici.
 */
@Injectable()
export class SubscribersService {
  constructor(
    @InjectRepository(SubscriberEntity)
    private readonly repository: Repository<SubscriberEntity>,
  ) {}

  private trialEndsAt(): Date {
    const date = new Date();
    date.setDate(date.getDate() + TRIAL_DAYS);
    return date;
  }

  /**
   * Active automatiquement l'essai gratuit de 14 jours à la création d'un
   * établissement — voir `EtablissementsService.create` (PROMPT 7, point 1).
   * Accès complet pendant l'essai : aucune restriction de fonctionnalité
   * n'est modélisée ici (5 formulaires, PDF illimités, hors-ligne — déjà
   * sans restriction ailleurs dans l'application), seul le statut compte.
   */
  createTrialForEtablissement(
    etablissementId: string,
  ): Promise<SubscriberEntity> {
    return this.repository.save(
      this.repository.create({
        accountType: 'etablissement',
        etablissementId,
        status: 'essai',
        trialEndsAt: this.trialEndsAt(),
      }),
    );
  }

  createTrialForInspecteur(inspecteurId: string): Promise<SubscriberEntity> {
    return this.repository.save(
      this.repository.create({
        accountType: 'inspecteur',
        inspecteurId,
        status: 'essai',
        trialEndsAt: this.trialEndsAt(),
      }),
    );
  }

  /**
   * Compte facturable de l'utilisateur courant. `null` pour les rôles non
   * facturables (`enseignant`, `ige_admin`, `super_admin`) ou si
   * l'utilisateur n'est rattaché à aucune fiche annuaire — ces cas ne
   * sont jamais soumis à la restriction de lecture seule, voir
   * `SubscriptionGuard`.
   */
  findByUser(user: UserEntity): Promise<SubscriberEntity | null> {
    if (user.role === 'chef_etablissement' && user.etablissementId) {
      return this.repository.findOne({
        where: { etablissementId: user.etablissementId },
        relations: ['currentPlan'],
      });
    }
    if (user.role === 'inspecteur' && user.inspecteurId) {
      return this.repository.findOne({
        where: { inspecteurId: user.inspecteurId },
        relations: ['currentPlan'],
      });
    }
    return Promise.resolve(null);
  }

  async isReadOnly(user: UserEntity): Promise<boolean> {
    const subscriber = await this.findByUser(user);
    if (!subscriber) {
      return false;
    }
    return (
      subscriber.status === 'lecture_seule' || subscriber.status === 'expire'
    );
  }

  findById(id: string): Promise<SubscriberEntity | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['currentPlan'],
    });
  }

  /**
   * Applique un paiement confirmé (`status: 'reussi'`) : passe le compte
   * en `actif`, et selon le type de formule, prolonge la période
   * (abonnement mensuel/annuel) ou crédite des inspections (pack à
   * l'usage, cumulable, valable 6 mois à partir de ce paiement).
   */
  async applySuccessfulPayment(
    subscriberId: string,
    plan: SubscriptionPlanEntity,
  ): Promise<SubscriberEntity> {
    const subscriber = await this.repository.findOneOrFail({
      where: { id: subscriberId },
    });
    subscriber.status = 'actif';
    subscriber.currentPlanId = plan.id;

    if (plan.kind === 'abonnement') {
      const periodEnd = new Date();
      if (plan.billingPeriod === 'annuel') {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }
      subscriber.currentPeriodEndsAt = periodEnd;
      subscriber.autoRenew = plan.autoRenewDefault;
    } else {
      const packExpiry = new Date();
      packExpiry.setDate(packExpiry.getDate() + (plan.packValidityDays ?? 180));
      // Cumulable avec un pack en cours (ex: rachat avant épuisement) ; la
      // date de validité repart du paiement le plus récent.
      subscriber.packInspectionsRemaining =
        (subscriber.packInspectionsRemaining ?? 0) +
        (plan.packInspections ?? 0);
      subscriber.packExpiresAt = packExpiry;
    }

    return this.repository.save(subscriber);
  }

  /** Décrémente le solde d'un pack à l'usage lors de la création d'une inspection — voir `SubscriptionGuard`. */
  async consumePackInspection(subscriberId: string): Promise<void> {
    const subscriber = await this.repository.findOne({
      where: { id: subscriberId },
    });
    if (
      subscriber?.packInspectionsRemaining != null &&
      subscriber.packInspectionsRemaining > 0
    ) {
      subscriber.packInspectionsRemaining -= 1;
      await this.repository.save(subscriber);
    }
  }

  /**
   * Restreint la liste aux comptes de la zone IGE de l'utilisateur
   * (`ige_admin`) — mêmes règles que
   * `FormSubmissionsService.applyScope` ; sans restriction pour
   * `super_admin`.
   */
  private scopedQueryBuilder(
    user: UserEntity,
  ): SelectQueryBuilder<SubscriberEntity> {
    const qb = this.repository
      .createQueryBuilder('subscriber')
      .leftJoinAndSelect('subscriber.etablissement', 'etablissement')
      .leftJoinAndSelect('subscriber.inspecteur', 'inspecteur')
      .leftJoinAndSelect('subscriber.currentPlan', 'currentPlan');

    if (user.role === 'ige_admin') {
      if (user.zone) {
        qb.andWhere('(etablissement.zone = :zone OR inspecteur.zone = :zone)', {
          zone: user.zone,
        });
      } else {
        qb.andWhere('1 = 0');
      }
    }
    // super_admin : aucune restriction.
    return qb;
  }

  findAllScoped(
    user: UserEntity,
    query: QuerySubscribersDto,
  ): Promise<SubscriberEntity[]> {
    const qb = this.scopedQueryBuilder(user);
    if (query.status) {
      qb.andWhere('subscriber.status = :status', { status: query.status });
    }
    if (query.accountType) {
      qb.andWhere('subscriber.accountType = :accountType', {
        accountType: query.accountType,
      });
    }
    qb.orderBy('subscriber.createdAt', 'DESC');
    return qb.getMany();
  }

  async countsByStatus(user: UserEntity): Promise<Record<string, number>> {
    const base = this.scopedQueryBuilder(user);
    const [trialCount, activeCount, readOnlyCount] = await Promise.all([
      base
        .clone()
        .andWhere('subscriber.status = :s', { s: 'essai' })
        .getCount(),
      base
        .clone()
        .andWhere('subscriber.status = :s', { s: 'actif' })
        .getCount(),
      base
        .clone()
        .andWhere('subscriber.status = :s', { s: 'lecture_seule' })
        .getCount(),
    ]);
    return { trialCount, activeCount, readOnlyCount };
  }

  /** IDs de comptes visibles par l'utilisateur — utilisé par `PaymentsService` pour scoper l'historique de paiement. */
  async scopedIds(user: UserEntity): Promise<string[]> {
    const rows = await this.scopedQueryBuilder(user)
      .select('subscriber.id', 'id')
      .getRawMany<{ id: string }>();
    return rows.map((row) => row.id);
  }
}
