import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, IsNull, LessThan, Not, Repository } from 'typeorm';
import { SubscriberEntity } from './entities/subscriber.entity';
import { SubscriptionNotificationsService } from './subscription-notifications.service';

const REMINDER_WINDOW_DAYS = 3;

/**
 * Rafraîchissement quotidien des statuts d'abonnement (PROMPT 7, point 3)
 * et relances avant expiration (point 5) :
 * - essai / abonnement / pack expiré sans renouvellement -> `lecture_seule`
 *   (aucun renouvellement automatique réel n'est débité tant qu'aucune
 *   passerelle réelle n'est branchée : `auto_renew` est conservé pour un
 *   futur job de renouvellement automatique, mais n'est pas exploité ici) ;
 * - notification "bientôt terminé" (J-3) pour l'essai et l'abonnement.
 */
@Injectable()
export class SubscriptionsSchedulerService {
  private readonly logger = new Logger(SubscriptionsSchedulerService.name);

  constructor(
    @InjectRepository(SubscriberEntity)
    private readonly repository: Repository<SubscriberEntity>,
    private readonly notifications: SubscriptionNotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async refreshSubscriptions(): Promise<void> {
    const expiredTrials = await this.expireTrials();
    const expiredPeriods = await this.expireAbonnements();
    const expiredPacks = await this.expirePacks();
    const reminders = await this.sendUpcomingReminders();
    this.logger.log(
      `Rafraîchissement abonnements : ${expiredTrials} essai(s) expiré(s), ` +
        `${expiredPeriods} abonnement(s) expiré(s), ${expiredPacks} pack(s) épuisé(s)/expiré(s), ` +
        `${reminders} relance(s) envoyée(s).`,
    );
  }

  private async expireTrials(): Promise<number> {
    const now = new Date();
    const subscribers = await this.repository.find({
      where: { status: 'essai', trialEndsAt: LessThan(now) },
    });
    for (const subscriber of subscribers) {
      subscriber.status = 'lecture_seule';
      await this.repository.save(subscriber);
      await this.notifications.record(
        subscriber.id,
        'essai_termine',
        "Votre période d'essai gratuite de 14 jours est terminée. Choisissez une formule pour continuer à créer des inspections.",
      );
    }
    return subscribers.length;
  }

  private async expireAbonnements(): Promise<number> {
    const now = new Date();
    const subscribers = await this.repository.find({
      where: {
        status: 'actif',
        currentPeriodEndsAt: LessThan(now),
        packInspectionsRemaining: IsNull(),
      },
    });
    for (const subscriber of subscribers) {
      subscriber.status = 'lecture_seule';
      await this.repository.save(subscriber);
      await this.notifications.record(
        subscriber.id,
        'abonnement_termine',
        'Votre abonnement est arrivé à échéance. Renouvelez-le pour continuer à créer des inspections.',
      );
    }
    return subscribers.length;
  }

  private async expirePacks(): Promise<number> {
    const now = new Date();
    const subscribers = await this.repository
      .createQueryBuilder('subscriber')
      .where('subscriber.status = :status', { status: 'actif' })
      .andWhere('subscriber.pack_inspections_remaining IS NOT NULL')
      .andWhere(
        '(subscriber.pack_expires_at < :now OR subscriber.pack_inspections_remaining <= 0)',
        { now },
      )
      .getMany();
    for (const subscriber of subscribers) {
      subscriber.status = 'lecture_seule';
      await this.repository.save(subscriber);
      await this.notifications.record(
        subscriber.id,
        'pack_termine',
        "Votre pack d'inspections est épuisé ou a expiré (validité 6 mois). Choisissez une nouvelle formule pour continuer.",
      );
    }
    return subscribers.length;
  }

  private async sendUpcomingReminders(): Promise<number> {
    const now = new Date();
    const windowEnd = new Date(now);
    windowEnd.setDate(windowEnd.getDate() + REMINDER_WINDOW_DAYS);

    const trialsEnding = await this.repository.find({
      where: { status: 'essai', trialEndsAt: Between(now, windowEnd) },
    });
    const abonnementsEnding = await this.repository.find({
      where: {
        status: 'actif',
        currentPeriodEndsAt: Between(now, windowEnd),
        packInspectionsRemaining: IsNull(),
      },
    });
    const packsEnding = await this.repository.find({
      where: {
        status: 'actif',
        packExpiresAt: Between(now, windowEnd),
        packInspectionsRemaining: Not(IsNull()),
      },
    });

    let count = 0;
    for (const subscriber of trialsEnding) {
      if (
        await this.alreadyRemindedToday(subscriber.id, 'essai_bientot_termine')
      )
        continue;
      await this.notifications.record(
        subscriber.id,
        'essai_bientot_termine',
        `Votre période d'essai gratuite se termine le ${subscriber.trialEndsAt.toLocaleDateString('fr-FR')}. Choisissez une formule pour ne pas perdre l'accès à la création d'inspections.`,
      );
      count += 1;
    }
    for (const subscriber of abonnementsEnding) {
      if (
        await this.alreadyRemindedToday(
          subscriber.id,
          'abonnement_bientot_termine',
        )
      )
        continue;
      await this.notifications.record(
        subscriber.id,
        'abonnement_bientot_termine',
        `Votre abonnement se termine le ${subscriber.currentPeriodEndsAt?.toLocaleDateString('fr-FR')}. Vérifiez le renouvellement automatique ou renouvelez manuellement.`,
      );
      count += 1;
    }
    for (const subscriber of packsEnding) {
      if (await this.alreadyRemindedToday(subscriber.id, 'pack_bientot_epuise'))
        continue;
      await this.notifications.record(
        subscriber.id,
        'pack_bientot_epuise',
        `Votre pack d'inspections expire le ${subscriber.packExpiresAt?.toLocaleDateString('fr-FR')} (il reste ${subscriber.packInspectionsRemaining} inspection(s)). Pensez à le renouveler.`,
      );
      count += 1;
    }
    return count;
  }

  /** Évite d'envoyer la même relance plusieurs fois par jour si le cron est rejoué. */
  private async alreadyRemindedToday(
    subscriberId: string,
    type:
      | 'essai_bientot_termine'
      | 'abonnement_bientot_termine'
      | 'pack_bientot_epuise',
  ): Promise<boolean> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const existing = await this.notifications.findAllScopedBySubscriberIds([
      subscriberId,
    ]);
    return existing.some(
      (notification) =>
        notification.type === type && notification.sentAt >= startOfDay,
    );
  }
}
