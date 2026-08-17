import 'dotenv/config';
import { EtablissementEntity } from '../../modules/etablissements/entities/etablissement.entity';
import { InspecteurEntity } from '../../modules/inspecteurs/entities/inspecteur.entity';
import { PaymentEntity } from '../../modules/subscriptions/entities/payment.entity';
import { SubscriberEntity } from '../../modules/subscriptions/entities/subscriber.entity';
import { SubscriptionNotificationEntity } from '../../modules/subscriptions/entities/subscription-notification.entity';
import { SubscriptionPlanEntity } from '../../modules/subscriptions/entities/subscription-plan.entity';
import dataSource from '../data-source';

/**
 * Jeu de données de démonstration pour le module d'abonnement (PROMPT 7),
 * appliqué aux comptes fictifs créés par `seed-auth-and-directory.ts` (à
 * lancer avant celui-ci). Contrairement à un compte réel — où
 * `EtablissementsService.create`/`InspecteursService.create` activent
 * l'essai automatiquement — ces comptes de démonstration existaient déjà
 * avant le PROMPT 7 : ce script leur attribue donc explicitement des
 * états variés (essai, actif, lecture seule) pour que la page
 * "Abonnements" (web) et l'écran de sélection de formule (mobile) aient
 * des données représentatives à afficher.
 *
 * Usage : npm run seed:subscriptions-demo (après seed:auth-directory et
 * seed:subscription-plans)
 */
async function seed() {
  await dataSource.initialize();

  const etablissementRepo = dataSource.getRepository(EtablissementEntity);
  const inspecteurRepo = dataSource.getRepository(InspecteurEntity);
  const planRepo = dataSource.getRepository(SubscriptionPlanEntity);
  const subscriberRepo = dataSource.getRepository(SubscriberEntity);
  const paymentRepo = dataSource.getRepository(PaymentEntity);
  const notificationRepo = dataSource.getRepository(SubscriptionNotificationEntity);

  const institutDeLaPaix = await etablissementRepo.findOneByOrFail({ nom: 'Institut de la Paix (exemple)' });
  const epExempleKinshasa = await etablissementRepo.findOneByOrFail({ nom: 'EP Exemple Kinshasa (exemple)' });
  const tshisekedi = await inspecteurRepo.findOneByOrFail({ nom: 'TSHISEKEDI Paul (fictif)' });
  const ilunga = await inspecteurRepo.findOneByOrFail({ nom: 'ILUNGA Sarah (fictive)' });

  const mensuel = await planRepo.findOneByOrFail({ code: 'mensuel' });
  const pack10 = await planRepo.findOneByOrFail({ code: 'pack_10' });

  const inDays = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  };

  // --- Institut de la Paix : abonné actif (mensuel), avec un paiement réussi ---
  const institutSubscriber = await upsertSubscriber(subscriberRepo, {
    accountType: 'etablissement',
    etablissementId: institutDeLaPaix.id,
    status: 'actif',
    trialEndsAt: inDays(-20),
    currentPlanId: mensuel.id,
    currentPeriodEndsAt: inDays(18),
    autoRenew: true,
  });
  await upsertPayment(paymentRepo, {
    subscriberId: institutSubscriber.id,
    planId: mensuel.id,
    amountFc: mensuel.priceFc,
    paymentMethod: 'orange_money',
    status: 'reussi',
    provider: 'mock',
    providerReference: 'DEMO-MENSUEL-INSTITUT-PAIX',
    initiatedAt: inDays(-12),
    confirmedAt: inDays(-12),
  });

  // --- EP Exemple Kinshasa : encore en essai gratuit (se termine dans 5 jours) ---
  await upsertSubscriber(subscriberRepo, {
    accountType: 'etablissement',
    etablissementId: epExempleKinshasa.id,
    status: 'essai',
    trialEndsAt: inDays(5),
  });

  // --- TSHISEKEDI Paul : essai expiré -> lecture seule (démontre le blocage de création) ---
  const tshisekediSubscriber = await upsertSubscriber(subscriberRepo, {
    accountType: 'inspecteur',
    inspecteurId: tshisekedi.id,
    status: 'lecture_seule',
    trialEndsAt: inDays(-3),
  });
  await upsertNotification(notificationRepo, {
    subscriberId: tshisekediSubscriber.id,
    type: 'essai_termine',
    message:
      "Votre période d'essai gratuite de 14 jours est terminée. Choisissez une formule pour continuer à créer des inspections.",
    sentAt: inDays(-3),
  });

  // --- ILUNGA Sarah : pack de 10 inspections, 7 restantes ---
  const ilungaSubscriber = await upsertSubscriber(subscriberRepo, {
    accountType: 'inspecteur',
    inspecteurId: ilunga.id,
    status: 'actif',
    trialEndsAt: inDays(-40),
    currentPlanId: pack10.id,
    packInspectionsRemaining: 7,
    packExpiresAt: inDays(150),
  });
  await upsertPayment(paymentRepo, {
    subscriberId: ilungaSubscriber.id,
    planId: pack10.id,
    amountFc: pack10.priceFc,
    paymentMethod: 'mpesa',
    status: 'reussi',
    provider: 'mock',
    providerReference: 'DEMO-PACK10-ILUNGA',
    initiatedAt: inDays(-30),
    confirmedAt: inDays(-30),
  });

  await dataSource.destroy();
  console.log('\n✓ Données de démonstration "abonnements" créées.');
}

async function upsertSubscriber(
  repo: ReturnType<typeof dataSource.getRepository<SubscriberEntity>>,
  data: Partial<SubscriberEntity> & { accountType: 'etablissement' | 'inspecteur' },
): Promise<SubscriberEntity> {
  const existing = await repo.findOne({
    where: data.etablissementId
      ? { etablissementId: data.etablissementId }
      : { inspecteurId: data.inspecteurId as string },
  });
  const entity = existing ?? repo.create();
  Object.assign(entity, data);
  const saved = await repo.save(entity);
  console.log(`✓ Subscriber ${saved.accountType} (${saved.status}) — ${existing ? 'mis à jour' : 'créé'}`);
  return saved;
}

async function upsertPayment(
  repo: ReturnType<typeof dataSource.getRepository<PaymentEntity>>,
  data: Partial<PaymentEntity> & { providerReference: string },
): Promise<PaymentEntity> {
  const existing = await repo.findOne({ where: { providerReference: data.providerReference } });
  const entity = existing ?? repo.create();
  Object.assign(entity, data);
  const saved = await repo.save(entity);
  console.log(`✓ Paiement "${saved.providerReference}" (${existing ? 'mis à jour' : 'créé'})`);
  return saved;
}

async function upsertNotification(
  repo: ReturnType<typeof dataSource.getRepository<SubscriptionNotificationEntity>>,
  data: Partial<SubscriptionNotificationEntity> & { subscriberId: string; type: string },
): Promise<SubscriptionNotificationEntity> {
  const existing = await repo.findOne({
    where: { subscriberId: data.subscriberId, type: data.type as SubscriptionNotificationEntity['type'] },
  });
  const entity = existing ?? repo.create();
  Object.assign(entity, data);
  const saved = await repo.save(entity);
  console.log(`✓ Notification "${saved.type}" (${existing ? 'mise à jour' : 'créée'})`);
  return saved;
}

seed().catch((error) => {
  console.error('Échec du seed de démonstration des abonnements :', error);
  process.exit(1);
});
