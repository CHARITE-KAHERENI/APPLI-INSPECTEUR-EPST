import type { FormSubmissionStatus } from '@c3-digital/shared';
import { IsIn } from 'class-validator';

const STATUSES: FormSubmissionStatus[] = ['brouillon', 'soumis', 'synchronise'];

export class UpdateFormSubmissionStatusDto {
  @IsIn(STATUSES)
  status: FormSubmissionStatus;
}
