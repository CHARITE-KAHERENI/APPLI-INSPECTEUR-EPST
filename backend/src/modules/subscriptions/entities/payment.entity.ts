import type { PaymentMethod, PaymentStatus } from '@c3-digital/shared';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SubscriberEntity } from './subscriber.entity';
import { SubscriptionPlanEntity } from './subscription-plan.entity';

/**
 * Table `payments` : journal des transactions (mobile money / carte
 * bancaire). `webhookPayload` conserve le corps brut reçu de la passerelle
 * pour audit — voir `PaymentGatewayService` (interface générique, mock
 * pour l'instant, à connecter aux comptes marchands réels).
 */
@Entity({ name: 'payments' })
export class PaymentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'subscriber_id', type: 'uuid' })
  subscriberId: string;

  @ManyToOne(() => SubscriberEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subscriber_id' })
  subscriber: SubscriberEntity;

  @Column({ name: 'plan_id', type: 'uuid' })
  planId: string;

  @ManyToOne(() => SubscriptionPlanEntity)
  @JoinColumn({ name: 'plan_id' })
  plan: SubscriptionPlanEntity;

  @Column({ name: 'amount_fc', type: 'numeric', precision: 12, scale: 2 })
  amountFc: string;

  @Column({ name: 'payment_method', type: 'varchar', length: 30 })
  paymentMethod: PaymentMethod;

  @Index()
  @Column({ type: 'varchar', length: 20, default: 'en_attente' })
  status: PaymentStatus;

  /** Identifiant de la passerelle (ex: "mock", futur "mpesa-live"...). */
  @Column({ type: 'varchar', length: 30, nullable: true })
  provider: string | null;

  /** Référence de transaction côté passerelle externe. */
  @Column({
    name: 'provider_reference',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  providerReference: string | null;

  @Column({ name: 'webhook_payload', type: 'jsonb', nullable: true })
  webhookPayload: Record<string, unknown> | null;

  @Column({ name: 'initiated_at', type: 'timestamptz' })
  initiatedAt: Date;

  @Column({ name: 'confirmed_at', type: 'timestamptz', nullable: true })
  confirmedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
