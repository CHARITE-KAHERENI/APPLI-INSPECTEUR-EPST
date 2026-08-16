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
