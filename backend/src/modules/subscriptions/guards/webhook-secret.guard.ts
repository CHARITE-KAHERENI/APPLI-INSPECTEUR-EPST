import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../../../config/configuration';

/**
 * Protège `POST /subscriptions/webhooks/:provider` par un secret partagé
 * (en-tête `X-Webhook-Secret`) plutôt que par `JwtAuthGuard` — la
 * passerelle de paiement appelle cette route côté serveur, sans session
 * utilisateur. Volontairement simple : chaque passerelle réelle (M-Pesa,
 * Orange Money, Airtel Money, carte bancaire) devra remplacer cette
 * vérification par la validation de signature qui lui est propre au
 * moment du branchement — voir `backend/README.md`.
 */
@Injectable()
export class WebhookSecretGuard implements CanActivate {
  constructor(private readonly configService: ConfigService<AppConfig, true>) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string | undefined> }>();
    const expected = this.configService.get('subscriptions', {
      infer: true,
    }).webhookSecret;
    const provided = request.headers['x-webhook-secret'];
    if (!provided || provided !== expected) {
      throw new UnauthorizedException(
        'Secret de webhook invalide ou manquant.',
      );
    }
    return true;
  }
}
