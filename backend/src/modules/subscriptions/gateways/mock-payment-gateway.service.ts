import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  InitiatePaymentParams,
  InitiatePaymentResult,
  PaymentGatewayService,
} from './payment-gateway.interface';

/**
 * Implémentation par défaut de `PaymentGatewayService`, à remplacer par
 * les vraies intégrations M-Pesa / Orange Money / Airtel Money / carte
 * bancaire lorsque les comptes marchands seront disponibles (PROMPT 7,
 * point 4). Ne débite rien : elle simule seulement l'ouverture d'une
 * transaction côté fournisseur et renvoie une référence que le webhook de
 * confirmation (`POST /subscriptions/webhooks/mock`) devra rappeler.
 *
 * En développement/démonstration, la confirmation peut être déclenchée
 * manuellement via ce même endpoint webhook (voir `backend/README.md`,
 * section "Abonnements & paiement").
 */
@Injectable()
export class MockPaymentGateway implements PaymentGatewayService {
  readonly provider = 'mock';

  initiatePayment(
    params: InitiatePaymentParams,
  ): Promise<InitiatePaymentResult> {
    const providerReference = `MOCK-${randomUUID()}`;
    return Promise.resolve({
      providerReference,
      redirectInstructions:
        `Paiement simulé (${params.paymentMethod}) de ${params.amountFc} FC — ` +
        `en attente de confirmation. Référence : ${providerReference}.`,
    });
  }
}
