import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

/**
 * Synchronisation hors-ligne et gestion des conflits (PROMPT 9, point 1)
 * — exerce `POST /sync/submissions` contre une vraie base Postgres (voir
 * `backend/README.md`, "Démarrage" : nécessite `npm run migration:run` +
 * `npm run seed:form-templates` au préalable), avec le même
 * `ValidationPipe` que l'application réelle (`src/main.ts`).
 *
 * Couvre la politique documentée dans `SyncService` : resynchronisation
 * idempotente (version locale déjà connue -> no-op), mise à jour normale
 * (version plus récente -> appliquée, ancienne version archivée), et
 * conflit détecté (le `baseServerUpdatedAt` connu de l'appareil ne
 * correspond plus au `updatedAt` serveur actuel -> appliquée quand même,
 * mais marquée `conflict: true` et archivée pour consultation IGE).
 */
describe('Sync (e2e)', () => {
  let app: INestApplication<App>;
  let templateId: string;

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

    const templateResponse = await request(app.getHttpServer())
      .get('/form-templates/C3')
      .expect(200);
    templateId = (templateResponse.body as { id: string }).id;
  });

  afterAll(async () => {
    await app.close();
  });

  function buildItem(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      localId: 'local-1',
      id: randomUUID(),
      templateId,
      formCode: 'C3',
      reportNumber: `RP-E2E-${Date.now()}`,
      schoolYear: '2025-2026',
      header: { etablissement: 'École E2E Test' },
      sections: [],
      signatures: [],
      status: 'brouillon',
      clientUpdatedAt: new Date().toISOString(),
      ...overrides,
    };
  }

  it('crée un nouveau formulaire lors de la première synchronisation', async () => {
    const item = buildItem();

    const response = await request(app.getHttpServer())
      .post('/sync/submissions')
      .send({ submissions: [item] })
      .expect(201);

    const [result] = response.body as Array<{
      applied: boolean;
      conflict: boolean;
      submissionId: string;
    }>;
    expect(result.applied).toBe(true);
    expect(result.conflict).toBe(false);
    expect(result.submissionId).toBe(item.id);
  });

  it('une resynchronisation avec une version locale plus ancienne est un no-op idempotent', async () => {
    const submissionId = randomUUID();
    const t1 = new Date('2026-01-01T10:00:00.000Z').toISOString();
    const t0 = new Date('2026-01-01T09:00:00.000Z').toISOString(); // antérieur à t1

    await request(app.getHttpServer())
      .post('/sync/submissions')
      .send({
        submissions: [buildItem({ id: submissionId, clientUpdatedAt: t1 })],
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/sync/submissions')
      .send({
        submissions: [buildItem({ id: submissionId, clientUpdatedAt: t0 })],
      })
      .expect(201);

    const [result] = response.body as Array<{
      applied: boolean;
      conflict: boolean;
    }>;
    expect(result.applied).toBe(false);
    expect(result.conflict).toBe(false);
  });

  it('une mise à jour plus récente sans conflit est appliquée et archive la version précédente', async () => {
    const submissionId = randomUUID();
    const t1 = new Date('2026-02-01T10:00:00.000Z').toISOString();
    const t2 = new Date('2026-02-01T11:00:00.000Z').toISOString();

    await request(app.getHttpServer())
      .post('/sync/submissions')
      .send({
        submissions: [
          buildItem({
            id: submissionId,
            clientUpdatedAt: t1,
            status: 'brouillon',
          }),
        ],
      })
      .expect(201);

    const updateResponse = await request(app.getHttpServer())
      .post('/sync/submissions')
      .send({
        submissions: [
          buildItem({
            id: submissionId,
            clientUpdatedAt: t2,
            status: 'soumis',
            header: { etablissement: 'École E2E Test (modifiée)' },
          }),
        ],
      })
      .expect(201);

    const [result] = updateResponse.body as Array<{
      applied: boolean;
      conflict: boolean;
    }>;
    expect(result.applied).toBe(true);
    expect(result.conflict).toBe(false);

    const history = await request(app.getHttpServer())
      .get(`/sync/submissions/${submissionId}/history`)
      .expect(200);

    const historyBody = history.body as {
      current: { status: string; header: Record<string, unknown> };
      versions: Array<{ reason: string; isConflict: boolean }>;
    };
    expect(historyBody.current.status).toBe('soumis');
    expect(historyBody.versions).toHaveLength(1);
    expect(historyBody.versions[0].reason).toBe('sync_update');
    expect(historyBody.versions[0].isConflict).toBe(false);
  });

  it('un baseServerUpdatedAt périmé déclenche un conflit détecté, tout en appliquant la version locale la plus récente', async () => {
    const submissionId = randomUUID();
    const t1 = new Date('2026-03-01T10:00:00.000Z').toISOString();
    const t2 = new Date('2026-03-01T11:00:00.000Z').toISOString();

    await request(app.getHttpServer())
      .post('/sync/submissions')
      .send({
        submissions: [buildItem({ id: submissionId, clientUpdatedAt: t1 })],
      })
      .expect(201);

    // L'appareil pense encore que le serveur est à un `updatedAt` périmé
    // (par ex. une modification serveur indépendante a eu lieu entre-temps) :
    // ce timestamp arbitraire, forcément différent du vrai `updatedAt`
    // courant, suffit à déclencher la détection de conflit.
    const staleBaseServerUpdatedAt = new Date(
      '2000-01-01T00:00:00.000Z',
    ).toISOString();

    const response = await request(app.getHttpServer())
      .post('/sync/submissions')
      .send({
        submissions: [
          buildItem({
            id: submissionId,
            clientUpdatedAt: t2,
            baseServerUpdatedAt: staleBaseServerUpdatedAt,
          }),
        ],
      })
      .expect(201);

    const [result] = response.body as Array<{
      applied: boolean;
      conflict: boolean;
    }>;
    expect(result.applied).toBe(true);
    expect(result.conflict).toBe(true);

    const history = await request(app.getHttpServer())
      .get(`/sync/submissions/${submissionId}/history`)
      .expect(200);
    const historyBody = history.body as {
      versions: Array<{ reason: string; isConflict: boolean }>;
    };
    expect(historyBody.versions[0].reason).toBe('sync_conflict');
    expect(historyBody.versions[0].isConflict).toBe(true);
  });

  it('rejette un lot invalide (formCode inconnu) avec un 400 explicite', async () => {
    await request(app.getHttpServer())
      .post('/sync/submissions')
      .send({ submissions: [buildItem({ formCode: 'INCONNU' })] })
      .expect(400);
  });
});
