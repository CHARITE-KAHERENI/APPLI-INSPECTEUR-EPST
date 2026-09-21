import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { UserEntity } from '../users/entities/user.entity';
import { CheckoutDto } from './dto/checkout.dto';
import { QueryPaymentsDto } from './dto/query-payments.dto';
import { WebhookConfirmDto } from './dto/webhook-confirm.dto';
import { PaymentEntity } from './entities/payment.entity';
import type { PaymentGatewayService } from './gateways/payment-gateway.interface';
import { PAYMENT_GATEWAY } from './gateways/payment-gateway.interface';
import { SubscribersService } from './subscribers.service';
import { SubscriptionNotificationsService } from './subscription-notifications.service';
import { SubscriptionPlansService } from './subscription-plans.service';

/**
 * Achat (checkout) et confirmation (webhook) des formules payantes — voir
 * PROMPT 7, point 4. `checkout` ouvre une transaction `en_attente` via
 * `PaymentGatewayService` (mock pour l'instant) ; le compte n'est activé
 * (`applySuccessfulPayment`) qu'à la confirmation, jamais au checkout
 * lui-même, pour rester fidèle à un paiement mobile money réel
 * (asynchrone, confirmé par webhook).
 */
@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(PaymentEntity)
    private readonly repository: Repository<PaymentEntity>,
    private readonly subscribersService: SubscribersService,
    private readonly plansService: SubscriptionPlansService,
    private readonly notifications: SubscriptionNotificationsService,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGatewayService,
  ) {}

  async checkout(
    user: UserEntity,
    dto: CheckoutDto,
  ): Promise<{ payment: PaymentEntity; redirectInstructions: string }> {
    const subscriber = await this.subscribersService.findByUser(user);
    if (!subscriber) {
      throw new ForbiddenException(
        "Aucun compte facturable n'est rattaché à cet utilisateur.",
      );
    }
    const plan = await this.plansService.findByCode(dto.planCode);

    const payment = await this.repository.save(
      this.repository.create({
        subscriberId: subscriber.id,
        planId: plan.id,
        amountFc: plan.priceFc,
        paymentMethod: dto.paymentMethod,
        status: 'en_attente',
        provider: this.gateway.provider,
        initiatedAt: new Date(),
      }),
    );

    const result = await this.gateway.initiatePayment({
      paymentId: payment.id,
      amountFc: Number(plan.priceFc),
      paymentMethod: dto.paymentMethod,
    });
    payment.providerReference = result.providerReference;
    await this.repository.save(payment);

    return { payment, redirectInstructions: result.redirectInstructions };
  }

  /**
   * Reçoit la confirmation d'une passerelle (`provider` — non utilisé
   * pour router la logique aujourd'hui, une seule passerelle mock étant
   * branchée, mais conservé dans la route pour que chaque passerelle
   * réelle future ait son propre chemin de webhook) et retrouve le
   * paiement via `providerReference` (généré lors du checkout).
   */
  async confirmWebhook(
    dto: WebhookConfirmDto,
    rawPayload: unknown,
  ): Promise<PaymentEntity> {
    const payment = await this.repository.findOne({
      where: { providerReference: dto.providerReference },
      relations: ['plan'],
    });
    if (!payment) {
      throw new NotFoundException(
        `Aucun paiement pour la référence "${dto.providerReference}".`,
      );
    }

    payment.status = dto.status;
    payment.webhookPayload = rawPayload as Record<string, unknown>;
    payment.confirmedAt = new Date();
    await this.repository.save(payment);

    if (dto.status === 'reussi') {
      await this.subscribersService.applySuccessfulPayment(
        payment.subscriberId,
        payment.plan,
      );
      await this.notifications.record(
        payment.subscriberId,
        'paiement_reussi',
        `Paiement de ${payment.amountFc} FC confirmé pour la formule "${payment.plan.label}".`,
      );
    } else {
      await this.notifications.record(
        payment.subscriberId,
        'paiement_echoue',
        `Le paiement de ${payment.amountFc} FC pour la formule "${payment.plan.label}" a échoué.`,
      );
    }

    return payment;
  }

  findAllScoped(
    user: UserEntity,
    query: QueryPaymentsDto,
  ): Promise<PaymentEntity[]> {
    return this.findAllScopedInternal(user, query);
  }

  private async findAllScopedInternal(
    user: UserEntity,
    query: QueryPaymentsDto,
  ): Promise<PaymentEntity[]> {
    const subscriberIds = await this.subscribersService.scopedIds(user);
    if (subscriberIds.length === 0) {
      return [];
    }
    return this.repository.find({
      where: {
        subscriberId: In(subscriberIds),
        ...(query.status ? { status: query.status } : {}),
      },
      relations: [
        'plan',
        'subscriber',
        'subscriber.etablissement',
        'subscriber.inspecteur',
      ],
      order: { initiatedAt: 'DESC' },
      take: 200,
    });
  }

  async totalRevenue(user: UserEntity): Promise<{
    totalFc: number;
    byPlan: Array<{
      planCode: string;
      planLabel: string;
      totalFc: number;
      paymentsCount: number;
    }>;
  }> {
    const subscriberIds = await this.subscribersService.scopedIds(user);
    if (subscriberIds.length === 0) {
      return { totalFc: 0, byPlan: [] };
    }
    const rows = await this.repository
      .createQueryBuilder('payment')
      .innerJoin('payment.plan', 'plan')
      .select('plan.code', 'planCode')
      .addSelect('plan.label', 'planLabel')
      .addSelect('SUM(payment.amount_fc)', 'totalFc')
      .addSelect('COUNT(payment.id)', 'paymentsCount')
      .where('payment.subscriber_id IN (:...subscriberIds)', { subscriberIds })
      .andWhere('payment.status = :status', { status: 'reussi' })
      .groupBy('plan.code')
      .addGroupBy('plan.label')
      .getRawMany<{
        planCode: string;
        planLabel: string;
        totalFc: string;
        paymentsCount: string;
      }>();

    const byPlan = rows.map((row) => ({
      planCode: row.planCode,
      planLabel: row.planLabel,
      totalFc: Number(row.totalFc),
      paymentsCount: Number(row.paymentsCount),
    }));
    const totalFc = byPlan.reduce((sum, row) => sum + row.totalFc, 0);
    return { totalFc, byPlan };
  }
}
