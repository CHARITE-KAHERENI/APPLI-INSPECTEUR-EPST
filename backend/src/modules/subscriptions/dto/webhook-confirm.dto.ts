import { IsIn, IsOptional, IsString } from 'class-validator';

/**
 * Corps générique attendu du webhook de confirmation de paiement — voir
 * `payment-gateway.interface.ts`. Une passerelle réelle (M-Pesa, Orange
 * Money, Airtel Money, carte bancaire) enverra probablement un format
 * différent : adapter ce DTO (ou ajouter un mapping par `:provider` dans
 * `SubscriptionsController.handleWebhook`) lors du branchement réel, en
 * conservant `providerReference`/`status` comme contrat minimal interne.
 */
export class WebhookConfirmDto {
  /** Référence renvoyée par `PaymentGatewayService.initiatePayment` lors du checkout. */
  @IsString()
  providerReference: string;

  @IsIn(['reussi', 'echoue'])
  status: 'reussi' | 'echoue';

  @IsOptional()
  @IsString()
  message?: string;
}
