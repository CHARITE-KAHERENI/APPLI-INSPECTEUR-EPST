import { PAYMENT_METHODS } from '@c3-digital/shared';
import type { PaymentMethod } from '@c3-digital/shared';
import { IsIn, IsString, MinLength } from 'class-validator';

export class CheckoutDto {
  /** Code de la formule (ex: "mensuel", "annuel", "pack_10"). */
  @IsString()
  @MinLength(1)
  planCode: string;

  @IsIn(PAYMENT_METHODS)
  paymentMethod: PaymentMethod;
}
