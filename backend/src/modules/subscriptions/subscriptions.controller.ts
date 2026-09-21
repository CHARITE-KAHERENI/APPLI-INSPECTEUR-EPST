import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserEntity } from '../users/entities/user.entity';
import { CheckoutDto } from './dto/checkout.dto';
import { QueryPaymentsDto } from './dto/query-payments.dto';
import { QuerySubscribersDto } from './dto/query-subscribers.dto';
import { WebhookConfirmDto } from './dto/webhook-confirm.dto';
import { WebhookSecretGuard } from './guards/webhook-secret.guard';
import { PaymentsService } from './payments.service';
import { SubscribersService } from './subscribers.service';
import { SubscriptionNotificationsService } from './subscription-notifications.service';
import { SubscriptionPlansService } from './subscription-plans.service';

/**
 * Essai gratuit et abonnement (PROMPT 7). Routes personnelles (`me`,
 * `checkout`) ouvertes à tout utilisateur authentifié, restreintes en
 * pratique aux rôles facturables (`chef_etablissement`, `inspecteur`) via
 * `SubscribersService.findByUser` (renvoie `null` sinon) ; routes
 * `admin/*` réservées à l'IGE — voir `SubscriptionGuard` pour
 * l'application de la lecture seule sur `POST /form-submissions`.
 */
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private readonly plansService: SubscriptionPlansService,
    private readonly subscribersService: SubscribersService,
    private readonly paymentsService: PaymentsService,
    private readonly notificationsService: SubscriptionNotificationsService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('plans')
  findPlans() {
    return this.plansService.findAllActive();
  }

  /** Compte facturable de l'utilisateur courant — `null` pour les rôles non facturables (enseignant/ige_admin/super_admin). */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  findMine(@CurrentUser() user: UserEntity) {
    return this.subscribersService.findByUser(user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('chef_etablissement', 'inspecteur')
  @Post('checkout')
  checkout(@CurrentUser() user: UserEntity, @Body() dto: CheckoutDto) {
    return this.paymentsService.checkout(user, dto);
  }

  /**
   * Confirmation de paiement — appelée par la passerelle (mock pour
   * l'instant), protégée par secret partagé plutôt que par JWT (pas de
   * session utilisateur côté fournisseur). `:provider` identifie la
   * passerelle d'origine (ex: "mock"), conservé pour router une logique
   * spécifique lors du branchement des passerelles réelles.
   */
  @UseGuards(WebhookSecretGuard)
  @Post('webhooks/:provider')
  handleWebhook(
    @Param('provider') provider: string,
    @Body() dto: WebhookConfirmDto,
  ) {
    return this.paymentsService.confirmWebhook(dto, { provider, ...dto });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ige_admin', 'super_admin')
  @Get('admin/overview')
  async overview(@CurrentUser() user: UserEntity) {
    const [counts, revenue] = await Promise.all([
      this.subscribersService.countsByStatus(user),
      this.paymentsService.totalRevenue(user),
    ]);
    return {
      trialCount: counts.trialCount,
      activeCount: counts.activeCount,
      readOnlyCount: counts.readOnlyCount,
      totalRevenueFc: revenue.totalFc,
      revenueByPlan: revenue.byPlan,
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ige_admin', 'super_admin')
  @Get('admin/subscribers')
  findSubscribers(
    @CurrentUser() user: UserEntity,
    @Query() query: QuerySubscribersDto,
  ) {
    return this.subscribersService.findAllScoped(user, query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ige_admin', 'super_admin')
  @Get('admin/payments')
  findPayments(
    @CurrentUser() user: UserEntity,
    @Query() query: QueryPaymentsDto,
  ) {
    return this.paymentsService.findAllScoped(user, query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ige_admin', 'super_admin')
  @Get('admin/notifications')
  async findNotifications(@CurrentUser() user: UserEntity) {
    const subscriberIds = await this.subscribersService.scopedIds(user);
    return this.notificationsService.findAllScopedBySubscriberIds(
      subscriberIds,
    );
  }
}
