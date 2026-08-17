# @c3-digital/backend

API REST **NestJS** du projet c3-digital : sert les configurations des
formulaires d'inspection IGE (`form_templates`) et reçoit les formulaires
remplis par les inspecteurs (`form_submissions`), notamment depuis
l'application mobile Flutter hors-ligne.

Scaffoldé avec `@nestjs/cli`. Persistance via **TypeORM** + **PostgreSQL**.

## Démarrage

```bash
cp .env.example .env          # ajuster si besoin (voir docker-compose.yml à la racine) — dont JWT_SECRET
npm install                   # depuis la racine du monorepo (workspaces)
npm run migration:run         # crée toutes les tables (templates, formulaires, annuaire, comptes)
npm run seed:form-templates   # charge shared/forms/*.json (5 formulaires)
npm run seed:auth-directory   # comptes de démonstration (un par rôle) + annuaire + inspections fictives
npm run start:dev
```

Un Postgres local est fourni via Docker à la racine du repo :
`docker compose up -d db`.

## Structure

```
src/
├── config/                        # Chargement de la config (.env), dont JWT_SECRET
├── database/
│   ├── data-source.ts             # DataSource TypeORM (CLI migrations)
│   ├── migrations/                # Migrations SQL versionnées
│   └── seeds/
│       ├── seed-form-templates.ts
│       └── seed-auth-and-directory.ts   # Comptes de démo + annuaire + inspections fictives
└── modules/
    ├── auth/                      # JWT (login, /auth/me), guards, décorateurs @Roles/@CurrentUser
    ├── users/                     # Comptes de connexion (pas de CRUD public — voir Authentification)
    ├── etablissements/            # CRUD annuaire des établissements
    ├── enseignants/                # CRUD annuaire des enseignants
    ├── inspecteurs/                # CRUD annuaire des inspecteurs
    ├── form-templates/            # Entité + service + controller (lecture des templates)
    ├── form-submissions/          # Entité + service + controller (formulaires remplis, avec autorisation par rôle)
    ├── sync/                      # Réception de la file de synchronisation mobile hors-ligne
    └── pdf/                       # Génération PDF fidèle aux documents Word officiels
```

## Endpoints (v0)

| Méthode | Route                                | Auth | Description                                   |
| ------- | -------------------------------------- | ---- | ---------------------------------------------- |
| POST    | `/auth/login`                          | —    | `{ email, password }` -> `{ accessToken, user }` |
| GET     | `/auth/me`                             | JWT  | Profil de l'utilisateur authentifié             |
| GET     | `/form-templates`                      | —    | Liste les templates actifs                      |
| GET     | `/form-templates/:code`                | —    | Template actif le plus récent pour un code      |
| POST    | `/form-submissions`                    | JWT  | Crée un formulaire en statut `brouillon`        |
| GET     | `/form-submissions/stats`              | JWT  | Cartes de synthèse + graphique du tableau de bord (voir ci-dessous) |
| GET     | `/form-submissions`                    | JWT  | Liste les formulaires, filtrable, restreinte au périmètre du rôle |
| GET     | `/form-submissions/:id`                | JWT  | Détail d'un formulaire (403 hors périmètre)     |
| PATCH   | `/form-submissions/:id/status`         | JWT  | Transition `brouillon → soumis → synchronise`   |
| GET     | `/form-submissions/:id/pdf`            | JWT  | PDF du formulaire, fidèle au document Word officiel (voir plus bas) |
| GET/POST/PATCH/DELETE | `/etablissements[/:id]`  | JWT  | CRUD annuaire — écriture réservée à `ige_admin`/`super_admin` |
| GET/POST/PATCH/DELETE | `/enseignants[/:id]`     | JWT  | idem, filtrable par `etablissementId`           |
| GET/POST/PATCH/DELETE | `/inspecteurs[/:id]`     | JWT  | idem                                            |
| POST    | `/sync/submissions`                    | —    | Réception en lot de la file de synchronisation mobile (voir ci-dessous) |
| GET     | `/sync/status`                         | —    | Vérification de connectivité légère avant une synchronisation complète |
| GET     | `/sync/submissions/:id/history`        | —    | Version actuelle + versions remplacées, consultables par l'IGE (voir ci-dessous) |

`/sync/*` reste sans authentification : c'est l'application mobile
hors-ligne qui y écrit, et elle n'implémente pas encore de connexion
(voir "Ce qui n'est pas couvert" ci-dessous).

## Authentification & autorisation (PROMPT 6)

JWT (`@nestjs/jwt` + `passport-jwt`), mots de passe hashés avec
`bcryptjs`. Cinq rôles (`@c3-digital/shared` `UserRole`) :
`inspecteur`, `enseignant`, `chef_etablissement`, `ige_admin`,
`super_admin`.

- `JwtAuthGuard` (voir `modules/auth/guards/`) exige un jeton valide et
  attache l'utilisateur (`UserEntity`) à `request.user`.
- `RolesGuard` + `@Roles('ige_admin', 'super_admin')` restreignent une
  route à des rôles précis (utilisé pour les écritures sur l'annuaire).
- `@CurrentUser()` (décorateur de paramètre) injecte l'utilisateur
  authentifié dans un handler de contrôleur.

**Règles de visibilité des formulaires** (`FormSubmissionsService`,
méthode privée `applyScope`) :

| Rôle                  | Voit                                                              |
| ---------------------- | ------------------------------------------------------------------ |
| `super_admin`           | Tout, sans restriction                                              |
| `ige_admin`             | Les formulaires des établissements de sa zone (`user.zone`, ex: "Nord-Kivu 2", comparée à `etablissement.zone`) — non restreint si `user.zone` n'est pas définie |
| `chef_etablissement`    | Les formulaires de son établissement (`user.etablissementId`)      |
| `inspecteur`            | Ses propres formulaires (`user.inspecteurId`)                      |
| `enseignant`            | Les formulaires le concernant (`user.enseignantId`)                |

Un compte dont l'identifiant de rattachement (`etablissementId` /
`inspecteurId` / `enseignantId`) n'est pas configuré ne voit rien pour
cette dimension, plutôt que de se voir attribuer par défaut un accès
plus large que prévu. Ces règles s'appliquent à `GET /form-submissions`
(liste), `GET /form-submissions/:id` (403 si hors périmètre) et
`GET /form-submissions/:id/pdf`.

Ces liens de rattachement (sur `form_submissions` comme sur `users`) sont
des colonnes `etablissement_id`/`enseignant_id`/`inspecteur_id`
distinctes du texte libre de `header` (qui reste la source de vérité
pour l'affichage/le PDF) — voir la migration `CreateAuthAndDirectory`.
**Limite connue** : l'application mobile ne renseigne pas encore ces
liens lors de la synchronisation (son écran de saisie garde un en-tête
en texte libre, non relié à l'annuaire) — un formulaire créé depuis
mobile n'est donc visible aujourd'hui que par `super_admin`, tant que
cette liaison n'est pas ajoutée côté mobile. Le script de seed peuple
des exemples avec ces liens déjà renseignés pour permettre de tester
les 5 rôles dès maintenant (voir "Comptes de démonstration" plus bas).

### `GET /form-submissions/stats` — tableau de bord IGE

Alimente le tableau de bord web (cartes de synthèse + graphique de
répartition) : nombre d'inspections et score moyen par formulaire,
nombre d'établissements actifs, dernières inspections — tous restreints
au même périmètre par rôle que la liste. Le score moyen s'appuie sur
`form_submissions.overall_percentage`, calculé et dénormalisé à chaque
création/synchronisation (voir
`modules/form-submissions/overall-score.util.ts` — même algorithme que
`shared/src/scoring.ts#computeSynthesisScore`, pour ne jamais
réapproximer le barème officiel en SQL).

### Comptes de démonstration

`npm run seed:auth-directory` crée un compte par rôle (mot de passe
`password123` pour tous), un annuaire minimal (2 établissements dans
des zones IGE différentes, avec enseignants/inspecteurs) et 2
inspections fictives — de quoi tester les 5 rôles et la restriction par
zone immédiatement. Détail des comptes dans le script lui-même et dans
`web/README.md`.

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

### `GET /form-submissions/:id/pdf` — génération PDF

Génère, à la volée, un PDF visuellement fidèle au document Word officiel
correspondant (en-tête RDC/ministère/logo IGE, bloc d'identification,
grille d'évaluation par section avec notes et observations, tableau de
conversion + évaluation synthétique, zone de signatures avec date et
lieu). Les observations personnalisées ajoutées par l'inspecteur sur
mobile (hors grille officielle) apparaissent dans un encart distinct en
fin de document, intitulé *"Observations complémentaires de l'inspecteur
(hors grille officielle)"*.

Implémentation : `modules/pdf/pdf-template.service.ts` construit le HTML
(générique aux 5 formulaires, à partir du seul `FormTemplate` — aucune
logique spécifique à un formulaire donné), `modules/pdf/pdf.service.ts`
le convertit en PDF via Chromium headless (`puppeteer-core` — pilote
seul, sans navigateur embarqué).

**Chromium requis** : `PdfService` cherche un exécutable Chromium dans
l'ordre suivant : variable d'environnement `PDF_CHROMIUM_EXECUTABLE_PATH`,
puis `/opt/pw-browsers/chromium` (environnement de développement de ce
projet), puis les emplacements système usuels (`/usr/bin/chromium`,
`/usr/bin/google-chrome`...). En production, installer Chromium dans
l'image de déploiement (ex: `apt-get install chromium` dans un
Dockerfile) et/ou définir `PDF_CHROMIUM_EXECUTABLE_PATH`.

**Équivalent mobile hors-ligne** : `mobile/lib/core/pdf/pdf_generator.dart`
reproduit le même contenu avec le package Dart `pdf` (voir
`mobile/README.md`), pour générer le même PDF localement sans connexion.

**Exemple avec données fictives** (formulaire C3) :

```bash
npm run generate:sample-pdf   # écrit backend/tmp/c3-sample.pdf (+ .html)
```

## Scripts utiles

```bash
npm run build               # nest build
npm run migration:generate  # génère une migration à partir des diffs d'entités
npm run migration:revert    # annule la dernière migration
npm run seed:form-templates # charge shared/forms/*.json
npm run seed:auth-directory # comptes de démo + annuaire + inspections fictives
npm run generate:sample-pdf # génère un PDF C3 d'exemple (données fictives) pour validation visuelle
npm run lint
npm run test
```
