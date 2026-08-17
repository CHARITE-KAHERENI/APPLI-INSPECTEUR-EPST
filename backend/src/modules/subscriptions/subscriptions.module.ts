import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { PaymentEntity } from './entities/payment.entity';
import { SubscriberEntity } from './entities/subscriber.entity';
import { SubscriptionNotificationEntity } from './entities/subscription-notification.entity';
import { SubscriptionPlanEntity } from './entities/subscription-plan.entity';
import { PAYMENT_GATEWAY } from './gateways/payment-gateway.interface';
import { MockPaymentGateway } from './gateways/mock-payment-gateway.service';
import { SubscriptionGuard } from './guards/subscription.guard';
import { PaymentsService } from './payments.service';
import { SubscribersService } from './subscribers.service';
import { SubscriptionNotificationsService } from './subscription-notifications.service';
import { SubscriptionPlansService } from './subscription-plans.service';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsSchedulerService } from './subscriptions-scheduler.service';

/**
 * Essai gratuit et abonnement (PROMPT 7) — voir `subscriptions.controller.ts`
 * pour les routes, `SubscribersService` pour le cycle de vie des comptes
 * facturables (exporté pour être utilisé par `EtablissementsService` /
 * `InspecteursService` à la création d'une fiche annuaire) et
 * `SubscriptionGuard` (module `form-submissions`) pour l'application de
 * la lecture seule.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      SubscriptionPlanEntity,
      SubscriberEntity,
      PaymentEntity,
      SubscriptionNotificationEntity,
    ]),
    AuthModule,
  ],
  controllers: [SubscriptionsController],
  providers: [
    SubscriptionPlansService,
    SubscribersService,
    PaymentsService,
    SubscriptionNotificationsService,
    SubscriptionsSchedulerService,
    SubscriptionGuard,
    { provide: PAYMENT_GATEWAY, useClass: MockPaymentGateway },
  ],
  exports: [SubscribersService, SubscriptionPlansService, SubscriptionGuard],
})
export class SubscriptionsModule {}
