import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { UserEntity } from '../../users/entities/user.entity';
import { SubscribersService } from '../subscribers.service';

/**
 * Bascule en lecture seule (PROMPT 7, point 3) : bloque la création d'une
 * nouvelle inspection (`POST /form-submissions`) pour un compte
 * `chef_etablissement`/`inspecteur` dont l'essai gratuit ou l'abonnement
 * est expiré sans renouvellement — la consultation (`GET /form-submissions`)
 * reste ouverte, elle n'est pas protégée par ce guard. Sans effet sur les
 * autres rôles (`enseignant`, `ige_admin`, `super_admin`), non facturables
 * — voir `SubscribersService.isReadOnly`. Toujours combiné avec
 * `JwtAuthGuard` (déjà appliqué au niveau du contrôleur), donc `user` est
 * toujours défini ici.
 */
@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(private readonly subscribersService: SubscribersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ user?: UserEntity }>();
    const user = request.user;
    if (
      !user ||
      (user.role !== 'chef_etablissement' && user.role !== 'inspecteur')
    ) {
      return true;
    }

    const readOnly = await this.subscribersService.isReadOnly(user);
    if (readOnly) {
      throw new ForbiddenException(
        "Votre période d'essai ou votre abonnement est terminé(e) : la consultation de l'historique reste " +
          'possible, mais la création de nouvelles inspections nécessite de choisir une formule ' +
          '(voir GET /subscriptions/plans).',
      );
    }
    return true;
  }
}
