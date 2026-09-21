import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `overall_percentage` / `overall_mention` : score de synthèse final du
 * formulaire, calculé (voir `modules/form-submissions/overall-score.util.ts`,
 * même algorithme que `shared/src/scoring.ts#computeSynthesisScore`) et
 * dénormalisé à chaque création/synchronisation — évite de recalculer
 * (ou d'approximer en SQL) le barème officiel pour les agrégations du
 * tableau de bord IGE (score moyen par formulaire...).
 */
export class AddOverallScoreToFormSubmissions1700000004000 implements MigrationInterface {
  name = 'AddOverallScoreToFormSubmissions1700000004000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "form_submissions"
        ADD COLUMN "overall_percentage" numeric(5,2),
        ADD COLUMN "overall_mention" varchar(50);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "form_submissions"
        DROP COLUMN IF EXISTS "overall_mention",
        DROP COLUMN IF EXISTS "overall_percentage";
    `);
  }
}
