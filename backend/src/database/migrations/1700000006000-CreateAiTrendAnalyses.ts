import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Analyse des tendances par IA (PROMPT 8, point 2) — une ligne par
 * exécution du job quotidien (`TrendAnalysisSchedulerService`). Table
 * en lecture seule côté application (jamais modifiée après création),
 * donc pas de trigger `set_updated_at` ici.
 */
export class CreateAiTrendAnalyses1700000006000 implements MigrationInterface {
  name = 'CreateAiTrendAnalyses1700000006000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "ai_trend_analyses" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "generated_at" timestamptz NOT NULL,
        "period_label" varchar(100) NOT NULL,
        "alerts" jsonb NOT NULL,
        "trends" jsonb NOT NULL,
        "positives" jsonb NOT NULL,
        "raw_stats" jsonb NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_ai_trend_analyses" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_ai_trend_analyses_generated_at" ON "ai_trend_analyses" ("generated_at");`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_ai_trend_analyses_generated_at";`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "ai_trend_analyses";`);
  }
}
