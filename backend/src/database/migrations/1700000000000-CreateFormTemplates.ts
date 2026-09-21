import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Table `form_templates` : configurations versionnées des 5 formulaires
 * officiels IGE (C2, C3, C3B, C3M, C3_DAS). `definition` contient l'en-tête,
 * les sections/critères/barèmes et les signatures, au format JSON décrit
 * par shared/src/schemas/form-template.schema.json.
 */
export class CreateFormTemplates1700000000000 implements MigrationInterface {
  name = 'CreateFormTemplates1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    await queryRunner.query(`
      CREATE TABLE "form_templates" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "code" varchar(20) NOT NULL,
        "name" varchar(255) NOT NULL,
        "version" varchar(20) NOT NULL DEFAULT '1.0.0',
        "description" text,
        "definition" jsonb NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_form_templates" PRIMARY KEY ("id"),
        CONSTRAINT "uq_form_templates_code_version" UNIQUE ("code", "version"),
        CONSTRAINT "ck_form_templates_code" CHECK ("code" IN ('C2', 'C3', 'C3B', 'C3M', 'C3_DAS'))
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_form_templates_code" ON "form_templates" ("code");
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_form_templates_is_active" ON "form_templates" ("is_active");
    `);

    // Fonction + trigger génériques pour maintenir updated_at automatiquement.
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION set_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await queryRunner.query(`
      CREATE TRIGGER "trg_form_templates_set_updated_at"
      BEFORE UPDATE ON "form_templates"
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS "trg_form_templates_set_updated_at" ON "form_templates";`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "form_templates";`);
    // Les migrations sont défaites dans l'ordre inverse : au moment où cette
    // down() s'exécute, le trigger de form_submissions (créé après) a déjà
    // été supprimé, la fonction n'est donc plus référencée.
    await queryRunner.query(`DROP FUNCTION IF EXISTS set_updated_at();`);
  }
}
