import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Comptes utilisateurs (authentification JWT, 5 rôles) et référentiels
 * "annuaire" (établissements, enseignants, inspecteurs) — voir
 * `backend/src/modules/{auth,etablissements,enseignants,inspecteurs}`.
 *
 * Ajoute aussi des liens optionnels `etablissement_id` / `enseignant_id` /
 * `inspecteur_id` sur `form_submissions` : le contenu texte libre de
 * `header` (JSONB) reste la source de vérité pour l'affichage/le PDF
 * ("Etablissement : Institut de la Paix"), ces colonnes ne servent qu'à
 * l'autorisation par rôle et aux agrégations du tableau de bord — voir
 * `modules/form-submissions/form-submissions.service.ts`
 * (`findAllScopedForUser`).
 */
export class CreateAuthAndDirectory1700000003000 implements MigrationInterface {
  name = 'CreateAuthAndDirectory1700000003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "etablissements" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "nom" varchar(255) NOT NULL,
        "code" varchar(50),
        "province" varchar(100),
        "sous_division" varchar(150),
        "milieu" varchar(20),
        "zone" varchar(100),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_etablissements" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(`CREATE INDEX "idx_etablissements_zone" ON "etablissements" ("zone");`);
    await queryRunner.query(`CREATE INDEX "idx_etablissements_nom" ON "etablissements" ("nom");`);
    await queryRunner.query(`
      CREATE TRIGGER "trg_etablissements_set_updated_at"
      BEFORE UPDATE ON "etablissements"
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
    `);

    await queryRunner.query(`
      CREATE TABLE "enseignants" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "nom" varchar(255) NOT NULL,
        "sexe" varchar(5),
        "matiere" varchar(150),
        "etablissement_id" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_enseignants" PRIMARY KEY ("id"),
        CONSTRAINT "fk_enseignants_etablissement" FOREIGN KEY ("etablissement_id")
          REFERENCES "etablissements" ("id") ON DELETE SET NULL
      );
    `);
    await queryRunner.query(`CREATE INDEX "idx_enseignants_etablissement_id" ON "enseignants" ("etablissement_id");`);
    await queryRunner.query(`CREATE INDEX "idx_enseignants_nom" ON "enseignants" ("nom");`);
    await queryRunner.query(`
      CREATE TRIGGER "trg_enseignants_set_updated_at"
      BEFORE UPDATE ON "enseignants"
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
    `);

    await queryRunner.query(`
      CREATE TABLE "inspecteurs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "nom" varchar(255) NOT NULL,
        "sexe" varchar(5),
        "poste_attache" varchar(255),
        "zone" varchar(100),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_inspecteurs" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(`CREATE INDEX "idx_inspecteurs_zone" ON "inspecteurs" ("zone");`);
    await queryRunner.query(`CREATE INDEX "idx_inspecteurs_nom" ON "inspecteurs" ("nom");`);
    await queryRunner.query(`
      CREATE TRIGGER "trg_inspecteurs_set_updated_at"
      BEFORE UPDATE ON "inspecteurs"
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
    `);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "email" varchar(255) NOT NULL,
        "password_hash" varchar(255) NOT NULL,
        "full_name" varchar(255) NOT NULL,
        "role" varchar(30) NOT NULL,
        "zone" varchar(100),
        "etablissement_id" uuid,
        "enseignant_id" uuid,
        "inspecteur_id" uuid,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_users" PRIMARY KEY ("id"),
        CONSTRAINT "uq_users_email" UNIQUE ("email"),
        CONSTRAINT "ck_users_role" CHECK ("role" IN
          ('inspecteur', 'enseignant', 'chef_etablissement', 'ige_admin', 'super_admin')),
        CONSTRAINT "fk_users_etablissement" FOREIGN KEY ("etablissement_id")
          REFERENCES "etablissements" ("id") ON DELETE SET NULL,
        CONSTRAINT "fk_users_enseignant" FOREIGN KEY ("enseignant_id")
          REFERENCES "enseignants" ("id") ON DELETE SET NULL,
        CONSTRAINT "fk_users_inspecteur" FOREIGN KEY ("inspecteur_id")
          REFERENCES "inspecteurs" ("id") ON DELETE SET NULL
      );
    `);
    await queryRunner.query(`CREATE INDEX "idx_users_role" ON "users" ("role");`);
    await queryRunner.query(`
      CREATE TRIGGER "trg_users_set_updated_at"
      BEFORE UPDATE ON "users"
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
    `);

    await queryRunner.query(`
      ALTER TABLE "form_submissions"
        ADD COLUMN "etablissement_id" uuid,
        ADD COLUMN "enseignant_id" uuid,
        ADD COLUMN "inspecteur_id" uuid;
    `);
    await queryRunner.query(`
      ALTER TABLE "form_submissions"
        ADD CONSTRAINT "fk_form_submissions_etablissement" FOREIGN KEY ("etablissement_id")
          REFERENCES "etablissements" ("id") ON DELETE SET NULL,
        ADD CONSTRAINT "fk_form_submissions_enseignant" FOREIGN KEY ("enseignant_id")
          REFERENCES "enseignants" ("id") ON DELETE SET NULL,
        ADD CONSTRAINT "fk_form_submissions_inspecteur" FOREIGN KEY ("inspecteur_id")
          REFERENCES "inspecteurs" ("id") ON DELETE SET NULL;
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_form_submissions_etablissement_id" ON "form_submissions" ("etablissement_id");`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_form_submissions_inspecteur_id" ON "form_submissions" ("inspecteur_id");`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_form_submissions_inspecteur_id";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_form_submissions_etablissement_id";`);
    await queryRunner.query(`
      ALTER TABLE "form_submissions"
        DROP CONSTRAINT IF EXISTS "fk_form_submissions_inspecteur",
        DROP CONSTRAINT IF EXISTS "fk_form_submissions_enseignant",
        DROP CONSTRAINT IF EXISTS "fk_form_submissions_etablissement";
    `);
    await queryRunner.query(`
      ALTER TABLE "form_submissions"
        DROP COLUMN IF EXISTS "inspecteur_id",
        DROP COLUMN IF EXISTS "enseignant_id",
        DROP COLUMN IF EXISTS "etablissement_id";
    `);

    await queryRunner.query(`DROP TRIGGER IF EXISTS "trg_users_set_updated_at" ON "users";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users";`);

    await queryRunner.query(`DROP TRIGGER IF EXISTS "trg_inspecteurs_set_updated_at" ON "inspecteurs";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "inspecteurs";`);

    await queryRunner.query(`DROP TRIGGER IF EXISTS "trg_enseignants_set_updated_at" ON "enseignants";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "enseignants";`);

    await queryRunner.query(`DROP TRIGGER IF EXISTS "trg_etablissements_set_updated_at" ON "etablissements";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "etablissements";`);
  }
}
