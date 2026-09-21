import type {
  FormCode,
  FormHeaderValues,
  FormSubmissionStatus,
  SectionResponse,
  SignatureResponse,
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
import { EnseignantEntity } from '../../enseignants/entities/enseignant.entity';
import { EtablissementEntity } from '../../etablissements/entities/etablissement.entity';
import { FormTemplateEntity } from '../../form-templates/entities/form-template.entity';
import { InspecteurEntity } from '../../inspecteurs/entities/inspecteur.entity';

/** Statuts possibles, alignés sur `FormSubmissionStatus` (shared). */
export const FORM_SUBMISSION_STATUSES: FormSubmissionStatus[] = [
  'brouillon',
  'soumis',
  'synchronise',
];

/**
 * Table `form_submissions` : les formulaires remplis par les inspecteurs
 * (saisis potentiellement hors-ligne sur mobile, puis synchronisés).
 */
@Entity({ name: 'form_submissions' })
export class FormSubmissionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'template_id', type: 'uuid' })
  templateId: string;

  @ManyToOne(() => FormTemplateEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'template_id' })
  template: FormTemplateEntity;

  @Index()
  @Column({ name: 'form_code', type: 'varchar', length: 20 })
  formCode: FormCode;

  @Column({ name: 'report_number', type: 'varchar', length: 100 })
  reportNumber: string;

  @Column({ name: 'school_year', type: 'varchar', length: 20 })
  schoolYear: string;

  @Column({ type: 'jsonb', default: {} })
  header: FormHeaderValues;

  @Column({ type: 'jsonb', default: [] })
  sections: SectionResponse[];

  @Column({ type: 'jsonb', default: [] })
  signatures: SignatureResponse[];

  @Index()
  @Column({ type: 'varchar', length: 20, default: 'brouillon' })
  status: FormSubmissionStatus;

  @Column({ name: 'created_by', type: 'varchar', length: 255, nullable: true })
  createdBy: string | null;

  @Column({ name: 'device_id', type: 'varchar', length: 255, nullable: true })
  deviceId: string | null;

  @Column({ name: 'submitted_at', type: 'timestamptz', nullable: true })
  submittedAt: Date | null;

  @Column({ name: 'synced_at', type: 'timestamptz', nullable: true })
  syncedAt: Date | null;

  /**
   * Horodatage de la dernière modification côté appareil mobile (distinct
   * de `updatedAt`, géré par le serveur) — utilisé par le module `sync`
   * pour départager la version locale la plus récente lors d'une
   * synchronisation. Voir `modules/sync/sync.service.ts`.
   */
  @Column({ name: 'client_updated_at', type: 'timestamptz', nullable: true })
  clientUpdatedAt: Date | null;

  /**
   * Liens relationnels optionnels vers l'annuaire — voir la migration
   * `CreateAuthAndDirectory` : utilisés pour l'autorisation par rôle
   * (`modules/auth`) et les agrégations du tableau de bord, pas pour
   * l'affichage (qui reste basé sur `header`, la source de vérité fidèle
   * au document officiel).
   */
  @Index()
  @Column({ name: 'etablissement_id', type: 'uuid', nullable: true })
  etablissementId: string | null;

  @ManyToOne(() => EtablissementEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'etablissement_id' })
  etablissement: EtablissementEntity | null;

  @Column({ name: 'enseignant_id', type: 'uuid', nullable: true })
  enseignantId: string | null;

  @ManyToOne(() => EnseignantEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'enseignant_id' })
  enseignant: EnseignantEntity | null;

  @Index()
  @Column({ name: 'inspecteur_id', type: 'uuid', nullable: true })
  inspecteurId: string | null;

  @ManyToOne(() => InspecteurEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'inspecteur_id' })
  inspecteur: InspecteurEntity | null;

  /**
   * Score de synthèse final, dénormalisé — voir
   * `overall-score.util.ts#computeOverallScore` et la migration
   * `AddOverallScoreToFormSubmissions`. `null` tant que le calcul n'a pas
   * pu aboutir (ex : brouillon incomplet).
   */
  @Column({
    name: 'overall_percentage',
    type: 'numeric',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  overallPercentage: string | null;

  @Column({
    name: 'overall_mention',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  overallMention: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
