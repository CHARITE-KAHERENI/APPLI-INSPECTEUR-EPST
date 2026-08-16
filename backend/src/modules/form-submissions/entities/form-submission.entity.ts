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
import { FormTemplateEntity } from '../../form-templates/entities/form-template.entity';

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

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
