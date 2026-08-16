import { FORM_CODES } from '@c3-digital/shared';
import type {
  FormCode,
  SectionResponse,
  SignatureResponse,
} from '@c3-digital/shared';
import { IsArray, IsIn, IsObject, IsOptional, IsString } from 'class-validator';

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
}
