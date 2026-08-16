# Base de données

Le projet utilise **PostgreSQL**. Le schéma applicatif est géré par les
migrations TypeORM du backend (`backend/src/database/migrations/`) ; ce
dossier `/database` ne contient qu'une copie de référence lisible.

- `schema.sql` — miroir SQL brut des deux tables `form_templates` et
  `form_submissions`, utile pour une inspection rapide ou une recréation
  manuelle du schéma.

## Tables

### `form_templates`
Une ligne par version d'un des 5 formulaires officiels IGE
(**C2, C3, C3B, C3M, C3_DAS**). La colonne `definition` (JSONB) contient
l'en-tête, les groupes de champs non notés, les sections/critères, le
tableau de conversion, la synthèse finale et les signatures — voir
`shared/src/schemas/form-template.schema.json`.

### `form_submissions`
Une ligne par formulaire rempli par un inspecteur, rattachée à un
`form_templates.id`. `header`, `sections` et `signatures` sont stockés en
JSONB — voir `shared/src/schemas/form-submission.schema.json`. La colonne
`status` porte le cycle de vie offline-first :

```
brouillon  →  soumis  →  synchronise
```

## Démarrer PostgreSQL en local

```bash
docker compose up -d db
```

## Appliquer les migrations et charger les 5 templates (C2, C3, C3B, C3M, C3_DAS)

```bash
cd backend
cp .env.example .env
npm install
npm run migration:run
npm run seed:form-templates
```
