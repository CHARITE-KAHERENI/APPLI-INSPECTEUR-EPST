import { FORM_CODES } from '@c3-digital/shared';
import type { FormCode, FormSubmissionStatus } from '@c3-digital/shared';
import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

const STATUSES: FormSubmissionStatus[] = ['brouillon', 'soumis', 'synchronise'];

/** Filtres de la page "Inspections" (web) — voir `FormSubmissionsService.findAllScopedForUser`. */
export class QueryFormSubmissionDto {
  @IsOptional()
  @IsIn(FORM_CODES)
  formCode?: FormCode;

  @IsOptional()
  @IsUUID()
  etablissementId?: string;

  @IsOptional()
  @IsUUID()
  inspecteurId?: string;

  @IsOptional()
  @IsIn(STATUSES)
  status?: FormSubmissionStatus;

  @IsOptional()
  @IsString()
  schoolYear?: string;

  /** Bornes de période sur `createdAt` (ISO 8601). */
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
