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
npm run seed:form-templates   # charge shared/forms/*.json (5 formulaires)
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
    ├── form-submissions/          # Entité + service + controller (CRUD des formulaires remplis)
    └── sync/                      # Réception de la file de synchronisation mobile hors-ligne
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
| POST    | `/sync/submissions`             | Réception en lot de la file de synchronisation mobile (voir ci-dessous) |
| GET     | `/sync/status`                  | Vérification de connectivité légère avant une synchronisation complète |
| GET     | `/sync/submissions/:id/history` | Version actuelle + versions remplacées, consultables par l'IGE (voir ci-dessous) |

L'authentification, les règles d'autorisation par rôle (inspecteur / chef
d'établissement) et la validation métier fine des sections/critères ne sont
pas encore implémentées — prévues dans une prochaine itération.

### `POST /sync/submissions` — synchronisation hors-ligne

Reçoit un lot d'entrées de la file `sync_queue` de l'application mobile
(`{ "submissions": [...] }`, jusqu'à 100 par appel) et les applique une par
une (l'échec d'une entrée n'affecte pas les autres). Chaque entrée doit
porter un `id` **stable généré côté mobile** (l'identifiant du brouillon
local) : il devient l'identifiant définitif du `form_submissions`
correspondant, ce qui rend les tentatives de synchronisation répétées
idempotentes (jamais de doublon en cas de retry réseau).

Politique de résolution de conflit ("la version locale la plus récente
l'emporte, mais l'historique des deux versions reste consultable") :

1. Le serveur compare le `clientUpdatedAt` reçu à celui déjà stocké. Si le
   serveur a déjà une version locale au moins aussi récente (double
   synchronisation, retry en retard), la requête est un no-op idempotent
   (`applied: false`) — rien n'est perdu.
2. Sinon, la version reçue est la plus récente : l'état actuel est
   archivé dans `form_submission_versions` avant d'être remplacé.
3. Si l'appareil avait fourni `baseServerUpdatedAt` (le `updatedAt`
   serveur qu'il connaissait lors de sa dernière synchronisation réussie)
   et que celui-ci ne correspond plus à `updatedAt` actuel, un
   changement serveur indépendant a eu lieu entre-temps (ex: changement de
   statut via une future interface web) : un vrai conflit est signalé
   (`conflict: true`) dans la réponse, mais la version locale est tout de
   même appliquée — l'ancienne version reste consultable dans
   `form_submission_versions` (`is_conflict = true`).

Voir `modules/sync/sync.service.ts` pour le détail, et
`database/README.md` pour le schéma de `form_submission_versions`.

### `GET /sync/submissions/:id/history` — historique consultable

Renvoie `{ current, versions }` : `current` est l'état actuel du
formulaire dans `form_submissions` (`null` s'il n'a encore jamais été
synchronisé), `versions` la liste des entrées de
`form_submission_versions` archivées pour cet identifiant, la plus
récente d'abord — chacune avec son `snapshot` (contenu complet remplacé),
son motif (`reason`) et `isConflict`. C'est ce qui rend consultable
l'ancienne version d'un formulaire lorsqu'une synchronisation a détecté un
conflit (voir la politique ci-dessus) : l'application mobile expose cet
endpoint dans un écran "Historique" (voir
`mobile/lib/features/history/submission_history_screen.dart`).

## Scripts utiles

```bash
npm run build              # nest build
npm run migration:generate # génère une migration à partir des diffs d'entités
npm run migration:revert   # annule la dernière migration
npm run lint
npm run test
```
