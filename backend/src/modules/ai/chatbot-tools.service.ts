import type Anthropic from '@anthropic-ai/sdk';
import { Injectable } from '@nestjs/common';
import { FormSubmissionsService } from '../form-submissions/form-submissions.service';
import { PaymentsService } from '../subscriptions/payments.service';
import { SubscribersService } from '../subscriptions/subscribers.service';
import { UserEntity } from '../users/entities/user.entity';

const APP_HELP_TEXT = `c3-digital numérise les 5 formulaires d'inspection scolaire de l'IGE
(C2, C3, C3B, C3M, C3_DAS). Sur mobile, les inspecteurs saisissent les
formulaires hors-ligne (synchronisation automatique dès qu'une connexion
est disponible) et peuvent générer un PDF fidèle au document officiel. Sur
le web, l'IGE et les chefs d'établissement consultent le tableau de bord,
la liste des inspections (filtrable, exportable), les fiches
établissements/inspecteurs, et — pour l'IGE — la page "Abonnements"
(essai gratuit, formules payantes, paiements) et "Analyse IA" (tendances).
Chaque compte établissement/inspecteur bénéficie de 14 jours d'essai
gratuit, puis d'une formule payante (mensuel, annuel, ou pack à l'usage) ;
sans formule active, le compte passe en lecture seule (consultation
possible, création de nouvelles inspections bloquée).`;

/**
 * Outils "contrôlés" exposés au chatbot (PROMPT 8, point 3) : chaque
 * outil délègue à un service déjà scopé par rôle (`FormSubmissionsService`,
 * `SubscribersService`, `PaymentsService` — les mêmes que ceux utilisés
 * par les pages web), jamais à une requête SQL fournie par le modèle.
 * Un outil non pertinent pour le rôle courant renvoie un message explicite
 * plutôt que d'exécuter une requête hors périmètre.
 */
@Injectable()
export class ChatbotToolsService {
  constructor(
    private readonly formSubmissionsService: FormSubmissionsService,
    private readonly subscribersService: SubscribersService,
    private readonly paymentsService: PaymentsService,
  ) {}

  readonly definitions: Anthropic.Tool[] = [
    {
      name: 'get_inspection_stats',
      description:
        "Statistiques des inspections dans le périmètre de l'utilisateur connecté : nombre total, " +
        "répartition et score moyen par type de formulaire (C2/C3/C3B/C3M/C3_DAS), nombre d'établissements actifs.",
      input_schema: { type: 'object', properties: {} },
    },
    {
      name: 'get_subscription_admin_overview',
      description:
        "Vue d'ensemble des abonnements (comptes en essai/actifs/en lecture seule, revenu total, revenu par " +
        "formule) — réservé aux rôles ige_admin et super_admin. Renvoie un message d'erreur pour les autres rôles.",
      input_schema: { type: 'object', properties: {} },
    },
    {
      name: 'count_unpaid_accounts',
      description:
        'Nombre de comptes (établissements ou inspecteurs) actuellement en lecture seule (essai ou abonnement ' +
        "expiré sans renouvellement, donc n'ayant pas payé) — réservé aux rôles ige_admin et super_admin.",
      input_schema: {
        type: 'object',
        properties: {
          accountType: {
            type: 'string',
            enum: ['etablissement', 'inspecteur'],
            description: 'Type de compte à compter.',
          },
        },
        required: ['accountType'],
      },
    },
    {
      name: 'get_my_subscription',
      description:
        "État de l'abonnement du compte connecté (essai, formule active, ou lecture seule) — pertinent " +
        'uniquement pour les rôles chef_etablissement et inspecteur.',
      input_schema: { type: 'object', properties: {} },
    },
    {
      name: 'get_app_help',
      description:
        "Explique le fonctionnement général de l'application c3-digital (formulaires, mobile hors-ligne, " +
        'web, abonnements) — utiliser pour toute question sur "comment utiliser" ou "à quoi sert" l\'application.',
      input_schema: { type: 'object', properties: {} },
    },
  ];

  async execute(
    toolName: string,
    input: Record<string, unknown>,
    user: UserEntity,
  ): Promise<unknown> {
    switch (toolName) {
      case 'get_inspection_stats': {
        const stats = await this.formSubmissionsService.stats(user);
        return {
          totalInspections: stats.totalInspections,
          activeEtablissements: stats.activeEtablissements,
          byFormCode: stats.byFormCode,
        };
      }

      case 'get_subscription_admin_overview': {
        if (user.role !== 'ige_admin' && user.role !== 'super_admin') {
          return {
            error:
              'Cette information est réservée aux rôles ige_admin et super_admin.',
          };
        }
        const [counts, revenue] = await Promise.all([
          this.subscribersService.countsByStatus(user),
          this.paymentsService.totalRevenue(user),
        ]);
        return {
          ...counts,
          totalRevenueFc: revenue.totalFc,
          revenueByPlan: revenue.byPlan,
        };
      }

      case 'count_unpaid_accounts': {
        if (user.role !== 'ige_admin' && user.role !== 'super_admin') {
          return {
            error:
              'Cette information est réservée aux rôles ige_admin et super_admin.',
          };
        }
        const accountType =
          input.accountType === 'inspecteur' ? 'inspecteur' : 'etablissement';
        const count = await this.subscribersService.countByAccountTypeAndStatus(
          user,
          accountType,
          'lecture_seule',
        );
        return { accountType, status: 'lecture_seule', count };
      }

      case 'get_my_subscription': {
        if (user.role !== 'chef_etablissement' && user.role !== 'inspecteur') {
          return {
            error: 'Ce rôle ne possède pas de compte facturable individuel.',
          };
        }
        const subscriber = await this.subscribersService.findByUser(user);
        if (!subscriber) {
          return { error: 'Aucun abonnement trouvé pour ce compte.' };
        }
        return {
          status: subscriber.status,
          trialEndsAt: subscriber.trialEndsAt,
          currentPlan: subscriber.currentPlan?.label ?? null,
          currentPeriodEndsAt: subscriber.currentPeriodEndsAt,
          packInspectionsRemaining: subscriber.packInspectionsRemaining,
        };
      }

      case 'get_app_help':
        return { help: APP_HELP_TEXT };

      default:
        return { error: `Outil inconnu : "${toolName}".` };
    }
  }
}
