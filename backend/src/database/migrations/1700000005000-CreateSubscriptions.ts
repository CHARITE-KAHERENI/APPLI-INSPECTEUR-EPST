import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Essai gratuit et abonnement (PROMPT 7) — voir `backend/src/modules/subscriptions`.
 *
 * - `subscription_plans` : les 3 formules payantes (mensuel, annuel, pack à
 *   l'usage — ce dernier en 3 tailles 10/20/50, donc 5 lignes au total,
 *   voir `seed-subscription-plans.ts`), communes aux comptes
 *   `etablissement` et `inspecteur`.
 * - `subscribers` : une ligne par compte facturable (un établissement OU
 *   un inspecteur, jamais les deux), avec son état (`essai` / `actif` /
 *   `lecture_seule` / `expire`) — voir `SubscribersService` et le cron de
 *   `SubscriptionsSchedulerService`.
 * - `payments` : journal des transactions (webhook de confirmation inclus
 *   en JSONB pour audit) — voir `PaymentGatewayService`.
 * - `subscription_notifications` : relances envoyées avant expiration
 *   (essai, abonnement, pack) — consultées par la page "Abonnements" (web).
 */
export class CreateSubscriptions1700000005000 implements MigrationInterface {
  name = 'CreateSubscriptions1700000005000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "subscription_plans" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "code" varchar(30) NOT NULL,
        "label" varchar(150) NOT NULL,
        "kind" varchar(20) NOT NULL,
        "price_fc" numeric(12,2) NOT NULL,
        "billing_period" varchar(20),
        "pack_inspections" integer,
        "pack_validity_days" integer,
        "auto_renew_default" boolean NOT NULL DEFAULT false,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_subscription_plans" PRIMARY KEY ("id"),
        CONSTRAINT "uq_subscription_plans_code" UNIQUE ("code"),
        CONSTRAINT "ck_subscription_plans_kind" CHECK ("kind" IN ('abonnement', 'pack')),
        CONSTRAINT "ck_subscription_plans_billing_period" CHECK (
          "billing_period" IS NULL OR "billing_period" IN ('mensuel', 'annuel')
        )
      );
    `);
    await queryRunner.query(`
      CREATE TRIGGER "trg_subscription_plans_set_updated_at"
      BEFORE UPDATE ON "subscription_plans"
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
    `);

    await queryRunner.query(`
      CREATE TABLE "subscribers" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "account_type" varchar(20) NOT NULL,
        "etablissement_id" uuid,
        "inspecteur_id" uuid,
        "status" varchar(20) NOT NULL DEFAULT 'essai',
        "trial_ends_at" timestamptz NOT NULL,
        "current_plan_id" uuid,
        "current_period_ends_at" timestamptz,
        "auto_renew" boolean NOT NULL DEFAULT false,
        "pack_inspections_remaining" integer,
        "pack_expires_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_subscribers" PRIMARY KEY ("id"),
        CONSTRAINT "uq_subscribers_etablissement" UNIQUE ("etablissement_id"),
        CONSTRAINT "uq_subscribers_inspecteur" UNIQUE ("inspecteur_id"),
        CONSTRAINT "ck_subscribers_account_type" CHECK ("account_type" IN ('etablissement', 'inspecteur')),
        CONSTRAINT "ck_subscribers_status" CHECK ("status" IN ('essai', 'actif', 'lecture_seule', 'expire')),
        CONSTRAINT "ck_subscribers_account_ref" CHECK (
          ("account_type" = 'etablissement' AND "etablissement_id" IS NOT NULL AND "inspecteur_id" IS NULL) OR
          ("account_type" = 'inspecteur' AND "inspecteur_id" IS NOT NULL AND "etablissement_id" IS NULL)
        ),
        CONSTRAINT "fk_subscribers_etablissement" FOREIGN KEY ("etablissement_id")
          REFERENCES "etablissements" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_subscribers_inspecteur" FOREIGN KEY ("inspecteur_id")
          REFERENCES "inspecteurs" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_subscribers_current_plan" FOREIGN KEY ("current_plan_id")
          REFERENCES "subscription_plans" ("id") ON DELETE SET NULL
      );
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_subscribers_status" ON "subscribers" ("status");`,
    );
    await queryRunner.query(`
      CREATE TRIGGER "trg_subscribers_set_updated_at"
      BEFORE UPDATE ON "subscribers"
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
    `);

    await queryRunner.query(`
      CREATE TABLE "payments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "subscriber_id" uuid NOT NULL,
        "plan_id" uuid NOT NULL,
        "amount_fc" numeric(12,2) NOT NULL,
        "payment_method" varchar(30) NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'en_attente',
        "provider" varchar(30),
        "provider_reference" varchar(255),
        "webhook_payload" jsonb,
        "initiated_at" timestamptz NOT NULL DEFAULT now(),
        "confirmed_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_payments" PRIMARY KEY ("id"),
        CONSTRAINT "ck_payments_method" CHECK (
          "payment_method" IN ('mpesa', 'orange_money', 'airtel_money', 'carte_bancaire')
        ),
        CONSTRAINT "ck_payments_status" CHECK ("status" IN ('en_attente', 'reussi', 'echoue', 'rembourse')),
        CONSTRAINT "fk_payments_subscriber" FOREIGN KEY ("subscriber_id")
          REFERENCES "subscribers" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_payments_plan" FOREIGN KEY ("plan_id")
          REFERENCES "subscription_plans" ("id")
      );
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_payments_subscriber_id" ON "payments" ("subscriber_id");`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_payments_status" ON "payments" ("status");`,
    );
    await queryRunner.query(`
      CREATE TRIGGER "trg_payments_set_updated_at"
      BEFORE UPDATE ON "payments"
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
    `);

    await queryRunner.query(`
      CREATE TABLE "subscription_notifications" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "subscriber_id" uuid NOT NULL,
        "type" varchar(40) NOT NULL,
        "message" text NOT NULL,
        "sent_at" timestamptz NOT NULL DEFAULT now(),
        "read_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_subscription_notifications" PRIMARY KEY ("id"),
        CONSTRAINT "ck_subscription_notifications_type" CHECK ("type" IN (
          'essai_bientot_termine', 'essai_termine', 'abonnement_bientot_termine',
          'abonnement_termine', 'pack_bientot_epuise', 'pack_termine',
          'paiement_reussi', 'paiement_echoue'
        )),
        CONSTRAINT "fk_subscription_notifications_subscriber" FOREIGN KEY ("subscriber_id")
          REFERENCES "subscribers" ("id") ON DELETE CASCADE
      );
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_subscription_notifications_subscriber_id" ON "subscription_notifications" ("subscriber_id");`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_subscription_notifications_subscriber_id";`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "subscription_notifications";`,
    );

    await queryRunner.query(
      `DROP TRIGGER IF EXISTS "trg_payments_set_updated_at" ON "payments";`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_payments_status";`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_payments_subscriber_id";`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "payments";`);

    await queryRunner.query(
      `DROP TRIGGER IF EXISTS "trg_subscribers_set_updated_at" ON "subscribers";`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_subscribers_status";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "subscribers";`);

    await queryRunner.query(
      `DROP TRIGGER IF EXISTS "trg_subscription_plans_set_updated_at" ON "subscription_plans";`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "subscription_plans";`);
  }
}
