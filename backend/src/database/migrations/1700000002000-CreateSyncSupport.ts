import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Support de la synchronisation mobile hors-ligne (PROMPT 4) :
 *
 * - `form_submissions.client_updated_at` : horodatage de la dernière
 *   modification côté appareil mobile (distinct de `updated_at`, géré par
 *   le serveur). Sert à départager "quelle est la version locale la plus
 *   récente" lors d'une synchronisation.
 * - `form_submission_versions` : historique des versions remplacées lors
 *   d'une synchronisation (mise à jour normale ou conflit détecté), pour
 *   que l'IGE puisse consulter les deux versions en cas de divergence
 *   entre une modification locale et une modification serveur.
 */
export class CreateSyncSupport1700000002000 implements MigrationInterface {
  name = 'CreateSyncSupport1700000002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "form_submissions"
      ADD COLUMN "client_updated_at" timestamptz;
    `);

    await queryRunner.query(`
      CREATE TABLE "form_submission_versions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "submission_id" uuid NOT NULL,
        "snapshot" jsonb NOT NULL,
        "is_conflict" boolean NOT NULL DEFAULT false,
        "reason" varchar(30) NOT NULL,
        "archived_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_form_submission_versions" PRIMARY KEY ("id"),
        CONSTRAINT "fk_form_submission_versions_submission" FOREIGN KEY ("submission_id")
          REFERENCES "form_submissions" ("id") ON DELETE CASCADE,
        CONSTRAINT "ck_form_submission_versions_reason" CHECK (
          "reason" IN ('sync_update', 'sync_conflict', 'status_change')
        )
      );
    `);

    await queryRunner.query(
      `CREATE INDEX "idx_form_submission_versions_submission_id" ON "form_submission_versions" ("submission_id");`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_form_submission_versions_is_conflict" ON "form_submission_versions" ("is_conflict");`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "form_submission_versions";`);
    await queryRunner.query(
      `ALTER TABLE "form_submissions" DROP COLUMN IF EXISTS "client_updated_at";`,
    );
  }
}
