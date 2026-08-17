import type { SubscriptionNotificationType } from '@c3-digital/shared';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SubscriberEntity } from './subscriber.entity';

/**
 * Table `subscription_notifications` : relances envoyées avant expiration
 * de l'essai / de l'abonnement / du pack — générées par
 * `SubscriptionsSchedulerService` (cron quotidien), consultables sur la
 * page "Abonnements" (web).
 */
@Entity({ name: 'subscription_notifications' })
export class SubscriptionNotificationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'subscriber_id', type: 'uuid' })
  subscriberId: string;

  @ManyToOne(() => SubscriberEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subscriber_id' })
  subscriber: SubscriberEntity;

  @Column({ type: 'varchar', length: 40 })
  type: SubscriptionNotificationType;

  @Column({ type: 'text' })
  message: string;

  @Column({ name: 'sent_at', type: 'timestamptz' })
  sentAt: Date;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
