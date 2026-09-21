import { PAYMENT_STATUSES } from '@c3-digital/shared';
import type { PaymentStatus } from '@c3-digital/shared';
import { IsIn, IsOptional } from 'class-validator';

export class QueryPaymentsDto {
  @IsOptional()
  @IsIn(PAYMENT_STATUSES)
  status?: PaymentStatus;
}
