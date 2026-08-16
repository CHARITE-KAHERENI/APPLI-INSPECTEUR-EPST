import { FORM_CODES } from '@c3-digital/shared';
import type {
  FormCode,
  SectionResponse,
  SignatureResponse,
} from '@c3-digital/shared';
import {
  IsArray,
  IsIn,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

const SUBMISSION_STATUSES = ['brouillon', 'soumis', 'synchronise'] as const;

/**
 * Une entrée de la file de synchronisation mobile (`sync_queue` côté
 * appareil) : un formulaire — brouillon ou soumis — à faire connaître au
 * serveur.
 */
export class SyncSubmissionItemDto {
  /** Identifiant local de la file de synchronisation, réémis tel quel dans le résultat. */
  @IsString()
  localId: string;

  /**
   * Identifiant stable généré par l'appareil mobile lors de la création du
   * formulaire (voir `FormDraft.id` côté mobile) — devient l'identifiant
   * définitif du `form_submissions` correspondant. Permet des tentatives de
   * synchronisation répétées sans jamais créer de doublon.
   */
  @IsUUID()
  id: string;

  @IsUUID()
  templateId: string;

  @IsIn(FORM_CODES)
  formCode: FormCode;

  @IsString()
  reportNumber: string;

  @IsString()
  schoolYear: string;

  @IsObject()
  header: Record<string, string | number | null>;

  @IsArray()
  sections: SectionResponse[];

  @IsArray()
  signatures: SignatureResponse[];

  @IsIn(SUBMISSION_STATUSES)
  status: (typeof SUBMISSION_STATUSES)[number];

  /** Horodatage (ISO 8601) de la dernière modification locale de ce formulaire. */
  @IsISO8601()
  clientUpdatedAt: string;

  /**
   * `updatedAt` serveur tel que connu par l'appareil lors de sa dernière
   * synchronisation réussie de ce formulaire (absent si jamais synchronisé
   * avec succès). Sert à détecter qu'une modification serveur a eu lieu
   * entre-temps (ex: changement de statut via une future interface web) —
   * voir `SyncService.syncOne`.
   */
  @IsOptional()
  @IsISO8601()
  baseServerUpdatedAt?: string;

  @IsOptional()
  @IsString()
  createdBy?: string;

  @IsOptional()
  @IsString()
  deviceId?: string;
}
