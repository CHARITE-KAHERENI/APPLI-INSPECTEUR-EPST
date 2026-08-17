-- c3-digital — schéma PostgreSQL de référence
--
-- Ce fichier est un miroir "lecture rapide" des migrations TypeORM
-- versionnées dans backend/src/database/migrations/. La source de vérité
-- reste les migrations (exécutées via `npm run migration:run` dans
-- /backend) ; ce fichier sert à inspecter ou recréer le schéma manuellement
-- (ex: `psql -U c3digital -d c3_digital -f database/schema.sql`).

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================================================
-- form_templates — configurations versionnées des 5 formulaires IGE
-- (C2, C3, C3B, C3M, C3_DAS). `definition` contient l'en-tête, les
-- sections/critères/barèmes et les signatures (voir
-- shared/src/schemas/form-template.schema.json).
-- =========================================================================
CREATE TABLE IF NOT EXISTS form_templates (
  id           uuid        NOT NULL DEFAULT gen_random_uuid(),
  code         varchar(20) NOT NULL,
  name         varchar(255) NOT NULL,
  version      varchar(20) NOT NULL DEFAULT '1.0.0',
  description  text,
  definition   jsonb       NOT NULL,
  is_active    boolean     NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pk_form_templates PRIMARY KEY (id),
  CONSTRAINT uq_form_templates_code_version UNIQUE (code, version),
  CONSTRAINT ck_form_templates_code CHECK (code IN ('C2', 'C3', 'C3B', 'C3M', 'C3_DAS'))
);

CREATE INDEX IF NOT EXISTS idx_form_templates_code ON form_templates (code);
CREATE INDEX IF NOT EXISTS idx_form_templates_is_active ON form_templates (is_active);

DROP TRIGGER IF EXISTS trg_form_templates_set_updated_at ON form_templates;
CREATE TRIGGER trg_form_templates_set_updated_at
BEFORE UPDATE ON form_templates
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =========================================================================
-- form_submissions — formulaires remplis par les inspecteurs, rattachés à
-- un form_templates.id. `header`, `sections` et `signatures` suivent
-- shared/src/schemas/form-submission.schema.json.
--
-- status : cycle de vie offline-first de l'app mobile
--   brouillon -> soumis -> synchronise
-- =========================================================================
CREATE TABLE IF NOT EXISTS form_submissions (
  id             uuid        NOT NULL DEFAULT gen_random_uuid(),
  template_id    uuid        NOT NULL,
  form_code      varchar(20) NOT NULL,
  report_number  varchar(100) NOT NULL,
  school_year    varchar(20) NOT NULL,
  header         jsonb       NOT NULL DEFAULT '{}',
  sections       jsonb       NOT NULL DEFAULT '[]',
  signatures     jsonb       NOT NULL DEFAULT '[]',
  status         varchar(20) NOT NULL DEFAULT 'brouillon',
  created_by     varchar(255),
  device_id      varchar(255),
  submitted_at   timestamptz,
  synced_at      timestamptz,
  -- Horodatage de la dernière modification côté appareil mobile — sert à
  -- départager la version locale la plus récente lors d'une synchronisation
  -- (voir form_submission_versions et backend/src/modules/sync).
  client_updated_at timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pk_form_submissions PRIMARY KEY (id),
  CONSTRAINT fk_form_submissions_template FOREIGN KEY (template_id)
    REFERENCES form_templates (id) ON DELETE RESTRICT,
  CONSTRAINT ck_form_submissions_form_code CHECK (form_code IN ('C2', 'C3', 'C3B', 'C3M', 'C3_DAS')),
  CONSTRAINT ck_form_submissions_status CHECK (status IN ('brouillon', 'soumis', 'synchronise'))
);

CREATE INDEX IF NOT EXISTS idx_form_submissions_template_id ON form_submissions (template_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_form_code ON form_submissions (form_code);
CREATE INDEX IF NOT EXISTS idx_form_submissions_status ON form_submissions (status);
CREATE INDEX IF NOT EXISTS idx_form_submissions_school_year ON form_submissions (school_year);

DROP TRIGGER IF EXISTS trg_form_submissions_set_updated_at ON form_submissions;
CREATE TRIGGER trg_form_submissions_set_updated_at
BEFORE UPDATE ON form_submissions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =========================================================================
-- form_submission_versions — historique des versions de form_submissions
-- remplacées lors d'une synchronisation (mise à jour normale ou conflit
-- détecté entre une modification locale et une modification serveur),
-- pour consultation par l'IGE. Voir backend/src/modules/sync.
-- =========================================================================
CREATE TABLE IF NOT EXISTS form_submission_versions (
  id             uuid        NOT NULL DEFAULT gen_random_uuid(),
  submission_id  uuid        NOT NULL,
  snapshot       jsonb       NOT NULL,
  is_conflict    boolean     NOT NULL DEFAULT false,
  reason         varchar(30) NOT NULL,
  archived_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pk_form_submission_versions PRIMARY KEY (id),
  CONSTRAINT fk_form_submission_versions_submission FOREIGN KEY (submission_id)
    REFERENCES form_submissions (id) ON DELETE CASCADE,
  CONSTRAINT ck_form_submission_versions_reason CHECK (
    reason IN ('sync_update', 'sync_conflict', 'status_change')
  )
);

CREATE INDEX IF NOT EXISTS idx_form_submission_versions_submission_id
  ON form_submission_versions (submission_id);
CREATE INDEX IF NOT EXISTS idx_form_submission_versions_is_conflict
  ON form_submission_versions (is_conflict);

-- =========================================================================
-- Comptes utilisateurs (authentification JWT, 5 rôles) et référentiels
-- "annuaire" (établissements, enseignants, inspecteurs) — voir PROMPT 6,
-- backend/src/modules/{auth,etablissements,enseignants,inspecteurs}.
-- =========================================================================

CREATE TABLE IF NOT EXISTS etablissements (
  id             uuid        NOT NULL DEFAULT gen_random_uuid(),
  nom            varchar(255) NOT NULL,
  code           varchar(50),
  province       varchar(100),
  sous_division  varchar(150),
  milieu         varchar(20),
  -- Zone d'inspection IGE (ex: "Nord-Kivu 2") — comparée à users.zone
  -- pour restreindre ce qu'un ige_admin peut consulter.
  zone           varchar(100),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pk_etablissements PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_etablissements_zone ON etablissements (zone);
CREATE INDEX IF NOT EXISTS idx_etablissements_nom ON etablissements (nom);

DROP TRIGGER IF EXISTS trg_etablissements_set_updated_at ON etablissements;
CREATE TRIGGER trg_etablissements_set_updated_at
BEFORE UPDATE ON etablissements
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS enseignants (
  id                uuid        NOT NULL DEFAULT gen_random_uuid(),
  nom               varchar(255) NOT NULL,
  sexe              varchar(5),
  matiere           varchar(150),
  etablissement_id  uuid,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pk_enseignants PRIMARY KEY (id),
  CONSTRAINT fk_enseignants_etablissement FOREIGN KEY (etablissement_id)
    REFERENCES etablissements (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_enseignants_etablissement_id ON enseignants (etablissement_id);
CREATE INDEX IF NOT EXISTS idx_enseignants_nom ON enseignants (nom);

DROP TRIGGER IF EXISTS trg_enseignants_set_updated_at ON enseignants;
CREATE TRIGGER trg_enseignants_set_updated_at
BEFORE UPDATE ON enseignants
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS inspecteurs (
  id             uuid        NOT NULL DEFAULT gen_random_uuid(),
  nom            varchar(255) NOT NULL,
  sexe           varchar(5),
  poste_attache  varchar(255),
  zone           varchar(100),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pk_inspecteurs PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_inspecteurs_zone ON inspecteurs (zone);
CREATE INDEX IF NOT EXISTS idx_inspecteurs_nom ON inspecteurs (nom);

DROP TRIGGER IF EXISTS trg_inspecteurs_set_updated_at ON inspecteurs;
CREATE TRIGGER trg_inspecteurs_set_updated_at
BEFORE UPDATE ON inspecteurs
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS users (
  id              uuid        NOT NULL DEFAULT gen_random_uuid(),
  email           varchar(255) NOT NULL,
  password_hash   varchar(255) NOT NULL,
  full_name       varchar(255) NOT NULL,
  role            varchar(30) NOT NULL,
  -- Zone d'inspection IGE (ex: "Nord-Kivu 2") — pertinent pour ige_admin.
  zone            varchar(100),
  etablissement_id uuid,
  enseignant_id   uuid,
  inspecteur_id   uuid,
  is_active       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pk_users PRIMARY KEY (id),
  CONSTRAINT uq_users_email UNIQUE (email),
  CONSTRAINT ck_users_role CHECK (role IN
    ('inspecteur', 'enseignant', 'chef_etablissement', 'ige_admin', 'super_admin')),
  CONSTRAINT fk_users_etablissement FOREIGN KEY (etablissement_id)
    REFERENCES etablissements (id) ON DELETE SET NULL,
  CONSTRAINT fk_users_enseignant FOREIGN KEY (enseignant_id)
    REFERENCES enseignants (id) ON DELETE SET NULL,
  CONSTRAINT fk_users_inspecteur FOREIGN KEY (inspecteur_id)
    REFERENCES inspecteurs (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);

DROP TRIGGER IF EXISTS trg_users_set_updated_at ON users;
CREATE TRIGGER trg_users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- Liens optionnels de form_submissions vers l'annuaire ci-dessus :
-- utilisés pour l'autorisation par rôle et les agrégations du tableau de
-- bord, distincts du texte libre de `header` (qui reste la source de
-- vérité pour l'affichage/le PDF — ex: "Etablissement : Institut de la Paix").
ALTER TABLE form_submissions
  ADD COLUMN IF NOT EXISTS etablissement_id uuid,
  ADD COLUMN IF NOT EXISTS enseignant_id uuid,
  ADD COLUMN IF NOT EXISTS inspecteur_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_form_submissions_etablissement') THEN
    ALTER TABLE form_submissions
      ADD CONSTRAINT fk_form_submissions_etablissement FOREIGN KEY (etablissement_id)
        REFERENCES etablissements (id) ON DELETE SET NULL,
      ADD CONSTRAINT fk_form_submissions_enseignant FOREIGN KEY (enseignant_id)
        REFERENCES enseignants (id) ON DELETE SET NULL,
      ADD CONSTRAINT fk_form_submissions_inspecteur FOREIGN KEY (inspecteur_id)
        REFERENCES inspecteurs (id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_form_submissions_etablissement_id ON form_submissions (etablissement_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_inspecteur_id ON form_submissions (inspecteur_id);

-- Score de synthèse final, dénormalisé à chaque création/synchronisation
-- (voir backend/src/modules/form-submissions/overall-score.util.ts) —
-- évite de réapproximer le barème officiel en SQL pour les agrégations
-- du tableau de bord IGE ("score moyen par formulaire").
ALTER TABLE form_submissions
  ADD COLUMN IF NOT EXISTS overall_percentage numeric(5,2),
  ADD COLUMN IF NOT EXISTS overall_mention varchar(50);
