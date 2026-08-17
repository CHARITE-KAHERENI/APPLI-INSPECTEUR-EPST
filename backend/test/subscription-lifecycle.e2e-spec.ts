import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import type { App } from 'supertest/types';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import type { AppConfig } from '../src/config/configuration';
import { SubscriberEntity } from '../src/modules/subscriptions/entities/subscriber.entity';
import { SubscriptionsSchedulerService } from '../src/modules/subscriptions/subscriptions-scheduler.service';
import { UserEntity } from '../src/modules/users/entities/user.entity';
import { UsersService } from '../src/modules/users/users.service';

/**
 * Cycle de vie complet essai gratuit -> compte bloqué -> abonnement actif
 * (PROMPT 9, point 1) — contre une vraie base Postgres (mêmes prérequis
 * que `sync.e2e-spec.ts`).
 *
 * L'établissement est créé via `POST /etablissements` (comme dans
 * l'application réelle, pour que l'essai gratuit soit activé par le même
 * chemin) ; le compte de connexion associé, lui, est créé directement via
 * `UsersService` (pas d'endpoint public d'inscription). Le test force
 * ensuite l'expiration de l'essai en manipulant `trialEndsAt` puis appelle
 * directement `SubscriptionsSchedulerService.refreshSubscriptions` (le
 * même code que le cron quotidien réel) plutôt que d'attendre 14 jours —
 * l'objectif est de valider la logique métier, pas l'ordonnanceur lui-même.
 */
describe('Subscription lifecycle (e2e)', () => {
  let app: INestApplication<App>;
  let templateId: string;
  let webhookSecret: string;
  let subscriberRepository: Repository<SubscriberEntity>;
  let scheduler: SubscriptionsSchedulerService;

  const password = 'password123';
  let accessToken: string;
  let etablissementId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();

    webhookSecret = moduleFixture
      .get<ConfigService<AppConfig, true>>(ConfigService)
      .get('subscriptions', { infer: true }).webhookSecret;
    subscriberRepository = moduleFixture.get<Repository<SubscriberEntity>>(
      getRepositoryToken(SubscriberEntity),
    );
    scheduler = moduleFixture.get(SubscriptionsSchedulerService, {
      strict: false,
    });

    const templateResponse = await request(app.getHttpServer())
      .get('/form-templates/C3')
      .expect(200);
    templateId = (templateResponse.body as { id: string }).id;

    // --- Établissement de test, créé via l'API réelle (POST /etablissements,
    // authentifiée en super_admin — compte de démo créé par
    // `seed:auth-directory`) pour que la création de l'essai gratuit passe
    // par le même chemin qu'un vrai compte (`EtablissementsService.create`
    // -> `SubscribersService.createTrialForEtablissement`), pas un insert
    // direct qui contournerait cette logique.
    const superAdminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'super.admin@exemple.cd', password: 'password123' })
      .expect(201);
    const superAdminToken = (superAdminLogin.body as { accessToken: string })
      .accessToken;

    const etablissementResponse = await request(app.getHttpServer())
      .post('/etablissements')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ nom: `École E2E Lifecycle ${Date.now()}`, zone: 'Nord-Kivu 2' })
      .expect(201);
    etablissementId = (etablissementResponse.body as { id: string }).id;

    // --- Compte "chef_etablissement" de test, créé directement via
    // `UsersService` (pas d'endpoint public d'inscription — voir
    // `backend/README.md`, section Authentification).
    const usersService = moduleFixture.get(UsersService);
    const passwordHash = await bcrypt.hash(password, 10);
    await usersService.create({
      email: `chef.e2e.${Date.now()}@exemple.cd`,
      passwordHash,
      fullName: 'Chef E2E Test',
      role: 'chef_etablissement',
      etablissementId,
    });

    const createdUser = await moduleFixture
      .get<Repository<UserEntity>>(getRepositoryToken(UserEntity))
      .findOne({
        where: { etablissementId },
      });

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: (createdUser as UserEntity).email, password })
      .expect(201);
    accessToken = (loginResponse.body as { accessToken: string }).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  function submissionPayload(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      templateId,
      formCode: 'C3',
      reportNumber: `RP-LIFECYCLE-${Date.now()}`,
      schoolYear: '2025-2026',
      header: { etablissement: 'École E2E Lifecycle' },
      etablissementId,
      ...overrides,
    };
  }

  it("étape 1 — pendant l'essai gratuit, la création d'une inspection est autorisée", async () => {
    await request(app.getHttpServer())
      .post('/form-submissions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(submissionPayload())
      .expect(201);
  });

  it('étape 2 — un essai expiré (job quotidien) bascule le compte en lecture seule et bloque la création', async () => {
    // Simule le passage du temps : force `trialEndsAt` dans le passé, comme
    // si les 14 jours d'essai étaient écoulés.
    await subscriberRepository.update(
      { etablissementId },
      { trialEndsAt: new Date('2000-01-01T00:00:00.000Z') },
    );

    // Même code que le cron réel (`@Cron(EVERY_DAY_AT_2AM)`), appelé
    // directement pour ne pas attendre l'ordonnanceur dans le test.
    await scheduler.refreshSubscriptions();

    const meResponse = await request(app.getHttpServer())
      .get('/subscriptions/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect((meResponse.body as { status: string }).status).toBe(
      'lecture_seule',
    );

    const blocked = await request(app.getHttpServer())
      .post('/form-submissions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(submissionPayload())
      .expect(403);
    expect((blocked.body as { message: string }).message).toMatch(
      /lecture seule|terminé/i,
    );
  });

  it('étape 3 — un paiement confirmé (checkout + webhook) réactive le compte et débloque la création', async () => {
    const checkoutResponse = await request(app.getHttpServer())
      .post('/subscriptions/checkout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ planCode: 'mensuel', paymentMethod: 'airtel_money' })
      .expect(201);
    const providerReference = (
      checkoutResponse.body as { payment: { providerReference: string } }
    ).payment.providerReference;
    expect(providerReference).toBeTruthy();

    await request(app.getHttpServer())
      .post('/subscriptions/webhooks/mock')
      .set('X-Webhook-Secret', webhookSecret)
      .send({ providerReference, status: 'reussi' })
      .expect(201);

    const meResponse = await request(app.getHttpServer())
      .get('/subscriptions/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(
      (meResponse.body as { status: string; currentPlan?: { code: string } })
        .status,
    ).toBe('actif');

    await request(app.getHttpServer())
      .post('/form-submissions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(submissionPayload())
      .expect(201);
  });

  it('la confirmation de paiement sans le secret partagé est rejetée', async () => {
    await request(app.getHttpServer())
      .post('/subscriptions/webhooks/mock')
      .send({ providerReference: 'peu-importe', status: 'reussi' })
      .expect(401);
  });
});
