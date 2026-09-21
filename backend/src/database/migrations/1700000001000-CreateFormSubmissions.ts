import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Table `form_submissions` : les formulaires remplis par les inspecteurs,
 * rattachés à un `form_templates.id`. `header`, `sections` et `signatures`
 * suivent shared/src/schemas/form-submission.schema.json.
 *
 * `status` couvre le cycle de vie offline-first de l'app mobile :
 *   brouillon -> soumis -> synchronise
 */
export class CreateFormSubmissions1700000001000 implements MigrationInterface {
  name = 'CreateFormSubmissions1700000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "form_submissions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "template_id" uuid NOT NULL,
        "form_code" varchar(20) NOT NULL,
        "report_number" varchar(100) NOT NULL,
        "school_year" varchar(20) NOT NULL,
        "header" jsonb NOT NULL DEFAULT '{}',
        "sections" jsonb NOT NULL DEFAULT '[]',
        "signatures" jsonb NOT NULL DEFAULT '[]',
        "status" varchar(20) NOT NULL DEFAULT 'brouillon',
        "created_by" varchar(255),
        "device_id" varchar(255),
        "submitted_at" timestamptz,
        "synced_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_form_submissions" PRIMARY KEY ("id"),
        CONSTRAINT "fk_form_submissions_template" FOREIGN KEY ("template_id")
          REFERENCES "form_templates" ("id") ON DELETE RESTRICT,
        CONSTRAINT "ck_form_submissions_form_code" CHECK ("form_code" IN ('C2', 'C3', 'C3B', 'C3M', 'C3_DAS')),
        CONSTRAINT "ck_form_submissions_status" CHECK ("status" IN ('brouillon', 'soumis', 'synchronise'))
      );
    `);

    await queryRunner.query(
      `CREATE INDEX "idx_form_submissions_template_id" ON "form_submissions" ("template_id");`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_form_submissions_form_code" ON "form_submissions" ("form_code");`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_form_submissions_status" ON "form_submissions" ("status");`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_form_submissions_school_year" ON "form_submissions" ("school_year");`,
    );

    await queryRunner.query(`
      CREATE TRIGGER "trg_form_submissions_set_updated_at"
      BEFORE UPDATE ON "form_submissions"
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS "trg_form_submissions_set_updated_at" ON "form_submissions";`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "form_submissions";`);
  }
}
