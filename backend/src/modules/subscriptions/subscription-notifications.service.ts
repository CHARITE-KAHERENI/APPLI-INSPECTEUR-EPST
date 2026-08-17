import type { SubscriptionNotificationType } from '@c3-digital/shared';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionNotificationEntity } from './entities/subscription-notification.entity';

/**
 * Relances envoyées avant expiration (essai/abonnement/pack) — voir
 * PROMPT 7, point 5 ("relances automatiques par notification avant
 * expiration"). Persistées en base pour être affichées sur la page
 * "Abonnements" (web) ; aucun canal d'envoi réel (e-mail/SMS) n'est
 * branché ici — voir `backend/README.md`.
 */
@Injectable()
export class SubscriptionNotificationsService {
  constructor(
    @InjectRepository(SubscriptionNotificationEntity)
    private readonly repository: Repository<SubscriptionNotificationEntity>,
  ) {}

  record(
    subscriberId: string,
    type: SubscriptionNotificationType,
    message: string,
  ): Promise<SubscriptionNotificationEntity> {
    const notification = this.repository.create({
      subscriberId,
      type,
      message,
      sentAt: new Date(),
    });
    return this.repository.save(notification);
  }

  findAllScopedBySubscriberIds(
    subscriberIds: string[],
  ): Promise<SubscriptionNotificationEntity[]> {
    if (subscriberIds.length === 0) {
      return Promise.resolve([]);
    }
    return this.repository.find({
      where: subscriberIds.map((subscriberId) => ({ subscriberId })),
      order: { sentAt: 'DESC' },
      take: 100,
    });
  }
}
