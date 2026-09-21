import type { PaymentMethod } from '@c3-digital/shared';

export interface InitiatePaymentParams {
  paymentId: string;
  amountFc: number;
  paymentMethod: PaymentMethod;
}

export interface InitiatePaymentResult {
  /** Référence de transaction côté passerelle — renvoyée telle quelle par le webhook de confirmation. */
  providerReference: string;
  /** Texte/URL à présenter au client (web/mobile) pour finaliser le paiement (ex: code USSD, lien 3-D Secure...). */
  redirectInstructions: string;
}

/**
 * Interface générique d'intégration des passerelles de paiement (PROMPT 7,
 * point 4) : mobile money locale (M-Pesa, Orange Money, Airtel Money) et
 * carte bancaire. `MockPaymentGateway` est l'implémentation par défaut ;
 * chaque passerelle réelle devra fournir sa propre implémentation
 * (appel à l'API du fournisseur dans `initiatePayment`) et sera
 * sélectionnée par `payment_method` dans `PaymentGatewayRegistry` — voir
 * `payment-gateway.module.ts`. La confirmation du paiement (asynchrone,
 * déclenchée par le fournisseur) passe systématiquement par
 * `POST /subscriptions/webhooks/:provider`, indépendamment de la
 * passerelle utilisée.
 */
export interface PaymentGatewayService {
  /** Identifiant de la passerelle, ex: "mock" (à remplacer par "mpesa-live", "orange-money-live"...). */
  readonly provider: string;

  initiatePayment(
    params: InitiatePaymentParams,
  ): Promise<InitiatePaymentResult>;
}

export const PAYMENT_GATEWAY = 'PAYMENT_GATEWAY';
