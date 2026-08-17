import type { BillingPeriod, SubscriptionPlanKind } from '@c3-digital/shared';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Table `subscription_plans` : les 3 formules payantes du PROMPT 7 —
 * mensuel/annuel (`kind: 'abonnement'`) et pack à l'usage (`kind: 'pack'`,
 * une ligne par taille 10/20/50) — voir `seed-subscription-plans.ts`.
 */
@Entity({ name: 'subscription_plans' })
export class SubscriptionPlanEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 30, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 150 })
  label: string;

  @Column({ type: 'varchar', length: 20 })
  kind: SubscriptionPlanKind;

  @Column({ name: 'price_fc', type: 'numeric', precision: 12, scale: 2 })
  priceFc: string;

  @Column({
    name: 'billing_period',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  billingPeriod: BillingPeriod | null;

  @Column({ name: 'pack_inspections', type: 'integer', nullable: true })
  packInspections: number | null;

  @Column({ name: 'pack_validity_days', type: 'integer', nullable: true })
  packValidityDays: number | null;

  @Column({ name: 'auto_renew_default', type: 'boolean', default: false })
  autoRenewDefault: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
