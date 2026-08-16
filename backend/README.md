# @c3-digital/backend

API REST **NestJS** du projet c3-digital : sert les configurations des
formulaires d'inspection IGE (`form_templates`) et reçoit les formulaires
remplis par les inspecteurs (`form_submissions`), notamment depuis
l'application mobile Flutter hors-ligne.

Scaffoldé avec `@nestjs/cli`. Persistance via **TypeORM** + **PostgreSQL**.

## Démarrage

```bash
cp .env.example .env          # ajuster si besoin (voir docker-compose.yml à la racine)
npm install                   # depuis la racine du monorepo (workspaces)
npm run migration:run         # crée form_templates et form_submissions
npm run seed:form-templates   # charge shared/src/form-templates/{c3,c3m}.json
npm run start:dev
```

Un Postgres local est fourni via Docker à la racine du repo :
`docker compose up -d db`.

## Structure

```
src/
├── config/                        # Chargement de la config (.env)
├── database/
│   ├── data-source.ts             # DataSource TypeORM (CLI migrations)
│   ├── migrations/                # Migrations SQL versionnées
│   └── seeds/seed-form-templates.ts
└── modules/
    ├── form-templates/            # Entité + service + controller (lecture des templates)
    └── form-submissions/          # Entité + service + controller (CRUD des formulaires remplis)
```

## Endpoints (v0)

| Méthode | Route                          | Description                                   |
| ------- | ------------------------------- | ---------------------------------------------- |
| GET     | `/form-templates`               | Liste les templates actifs                     |
| GET     | `/form-templates/:code`         | Template actif le plus récent pour un code     |
| POST    | `/form-submissions`             | Crée un formulaire en statut `brouillon`       |
| GET     | `/form-submissions`             | Liste les formulaires                          |
| GET     | `/form-submissions/:id`         | Détail d'un formulaire                         |
| PATCH   | `/form-submissions/:id/status`  | Transition `brouillon → soumis → synchronise`  |

L'authentification, les règles d'autorisation par rôle (inspecteur / chef
d'établissement) et la validation métier fine des sections/critères ne sont
pas encore implémentées — prévues dans une prochaine itération.

## Scripts utiles

```bash
npm run build              # nest build
npm run migration:generate # génère une migration à partir des diffs d'entités
npm run migration:revert   # annule la dernière migration
npm run lint
npm run test
```
