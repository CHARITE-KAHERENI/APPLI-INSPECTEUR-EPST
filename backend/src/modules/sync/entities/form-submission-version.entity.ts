import type {
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
} from 'typeorm';
import { FormSubmissionEntity } from '../../form-submissions/entities/form-submission.entity';

/** Pourquoi une version a été archivée. */
export type FormSubmissionVersionReason =
  'sync_update' | 'sync_conflict' | 'status_change';

/** Instantané complet du contenu d'un `FormSubmission` remplacé. */
export interface FormSubmissionSnapshot {
  header: FormHeaderValues;
  sections: SectionResponse[];
  signatures: SignatureResponse[];
  status: FormSubmissionStatus;
  clientUpdatedAt: string | null;
  updatedAt: string;
}

/**
 * Table `form_submission_versions` : historique des versions remplacées
 * lors d'une synchronisation. Permet à l'IGE de consulter la version
 * serveur qui existait avant qu'une synchronisation ne la remplace par la
 * version locale la plus récente (voir `SyncService`), en particulier en
 * cas de conflit détecté (`isConflict`).
 */
@Entity({ name: 'form_submission_versions' })
export class FormSubmissionVersionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'submission_id', type: 'uuid' })
  submissionId: string;

  @ManyToOne(() => FormSubmissionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'submission_id' })
  submission: FormSubmissionEntity;

  @Column({ type: 'jsonb' })
  snapshot: FormSubmissionSnapshot;

  @Index()
  @Column({ name: 'is_conflict', type: 'boolean', default: false })
  isConflict: boolean;

  @Column({ type: 'varchar', length: 30 })
  reason: FormSubmissionVersionReason;

  @CreateDateColumn({ name: 'archived_at', type: 'timestamptz' })
  archivedAt: Date;
}
