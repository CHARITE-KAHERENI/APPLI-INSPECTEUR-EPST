import { FORM_CODES } from '@c3-digital/shared';
import type {
  FormCode,
  SectionResponse,
  SignatureResponse,
} from '@c3-digital/shared';
import { IsArray, IsIn, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateFormSubmissionDto {
  @IsString()
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
  @IsOptional()
  sections?: SectionResponse[];

  @IsArray()
  @IsOptional()
  signatures?: SignatureResponse[];

  @IsOptional()
  @IsString()
  createdBy?: string;

  @IsOptional()
  @IsString()
  deviceId?: string;

  /**
   * Liens optionnels vers l'annuaire (voir `shared/src/types/directory.ts`)
   * — utilisés pour l'autorisation par rôle et les agrégations du tableau
   * de bord, distincts du texte libre de `header`.
   */
  @IsOptional()
  @IsUUID()
  etablissementId?: string;

  @IsOptional()
  @IsUUID()
  enseignantId?: string;

  @IsOptional()
  @IsUUID()
  inspecteurId?: string;
}
