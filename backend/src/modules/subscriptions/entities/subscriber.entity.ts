import type {
  SubscriberAccountType,
  SubscriberStatus,
} from '@c3-digital/shared';
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
import { EtablissementEntity } from '../../etablissements/entities/etablissement.entity';
import { InspecteurEntity } from '../../inspecteurs/entities/inspecteur.entity';
import { SubscriptionPlanEntity } from './subscription-plan.entity';

/**
 * Table `subscribers` : un compte facturable (un établissement OU un
 * inspecteur — jamais les deux, voir la contrainte `ck_subscribers_account_ref`
 * de la migration). Créé automatiquement en statut `essai` à la création
 * de la fiche annuaire correspondante — voir
 * `EtablissementsService.create` / `InspecteursService.create`.
 */
@Entity({ name: 'subscribers' })
export class SubscriberEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'account_type', type: 'varchar', length: 20 })
  accountType: SubscriberAccountType;

  @Column({ name: 'etablissement_id', type: 'uuid', nullable: true })
  etablissementId: string | null;

  @ManyToOne(() => EtablissementEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'etablissement_id' })
  etablissement: EtablissementEntity | null;

  @Column({ name: 'inspecteur_id', type: 'uuid', nullable: true })
  inspecteurId: string | null;

  @ManyToOne(() => InspecteurEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'inspecteur_id' })
  inspecteur: InspecteurEntity | null;

  @Index()
  @Column({ type: 'varchar', length: 20, default: 'essai' })
  status: SubscriberStatus;

  @Column({ name: 'trial_ends_at', type: 'timestamptz' })
  trialEndsAt: Date;

  @Column({ name: 'current_plan_id', type: 'uuid', nullable: true })
  currentPlanId: string | null;

  @ManyToOne(() => SubscriptionPlanEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'current_plan_id' })
  currentPlan: SubscriptionPlanEntity | null;

  @Column({
    name: 'current_period_ends_at',
    type: 'timestamptz',
    nullable: true,
  })
  currentPeriodEndsAt: Date | null;

  @Column({ name: 'auto_renew', type: 'boolean', default: false })
  autoRenew: boolean;

  @Column({
    name: 'pack_inspections_remaining',
    type: 'integer',
    nullable: true,
  })
  packInspectionsRemaining: number | null;

  @Column({ name: 'pack_expires_at', type: 'timestamptz', nullable: true })
  packExpiresAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
