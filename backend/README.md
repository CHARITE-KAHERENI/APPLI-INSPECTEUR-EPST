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
npm run migration:run         # crée toutes les tables (templates, formulaires, annuaire, comptes, abonnements)
npm run seed:form-templates   # charge shared/forms/*.json (5 formulaires)
npm run seed:auth-directory   # comptes de démonstration (un par rôle) + annuaire + inspections fictives
npm run seed:subscription-plans  # les 3 formules payantes (mensuel, annuel, pack 10/20/50)
npm run seed:subscriptions-demo  # états d'abonnement variés sur les comptes de démo (essai/actif/lecture seule)
npm run seed:demo-butembo        # jeu de données du pilote de Butembo — 4 établissements, inspecteurs, 5 formulaires (PROMPT 9)
npm run start:dev
```

Les 3 fonctionnalités IA (assistant de rédaction, analyse des tendances,
chatbot) nécessitent `ANTHROPIC_API_KEY` dans `.env` — sans elle, les
routes `/ai/*` répondent `503` proprement plutôt que d'échouer au
démarrage (voir "Intelligence artificielle" ci-dessous).

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
    ├── pdf/                       # Génération PDF fidèle aux documents Word officiels
    ├── subscriptions/             # Essai gratuit, formules payantes, paiement (PROMPT 7)
    └── ai/                        # Assistant de rédaction, analyse des tendances, chatbot (PROMPT 8)
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
| GET     | `/subscriptions/plans`                 | JWT  | Les 3 formules actives (mensuel, annuel, pack 10/20/50)   |
| GET     | `/subscriptions/me`                    | JWT  | Compte facturable de l'utilisateur connecté (`null` si rôle non facturable) |
| POST    | `/subscriptions/checkout`               | JWT  | Ouvre un paiement (`chef_etablissement`/`inspecteur` uniquement) |
| POST    | `/subscriptions/webhooks/:provider`     | secret partagé | Confirmation de paiement (voir "Abonnements & paiement") |
| GET     | `/subscriptions/admin/overview`         | JWT  | Vue d'ensemble (essai/actif/lecture seule, revenus) — `ige_admin`/`super_admin` |
| GET     | `/subscriptions/admin/subscribers`      | JWT  | Liste des comptes facturables, filtrable — `ige_admin`/`super_admin` |
| GET     | `/subscriptions/admin/payments`         | JWT  | Historique des paiements — `ige_admin`/`super_admin` |
| GET     | `/subscriptions/admin/notifications`    | JWT  | Relances envoyées avant expiration — `ige_admin`/`super_admin` |
| POST    | `/ai/writing-assistant`                 | JWT  | Reformule des notes brutes en conseil pédagogique (mobile et web) |
| GET     | `/ai/trend-analyses/latest`             | JWT  | Dernière synthèse quotidienne — `ige_admin`/`super_admin` |
| GET     | `/ai/trend-analyses`                    | JWT  | Historique des synthèses — `ige_admin`/`super_admin` |
| POST    | `/ai/trend-analyses/generate`           | JWT  | Déclenche une génération manuelle — `super_admin` uniquement |
| POST    | `/ai/chat`                              | JWT  | Chatbot d'assistance (tous rôles, outils contrôlés — voir ci-dessous) |

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

## Abonnements & paiement (PROMPT 7)

Chaque compte facturable (`chef_etablissement` ou `inspecteur`, un
établissement OU un inspecteur — jamais les deux) a une ligne dans
`subscribers`, créée automatiquement en statut `essai` (14 jours,
accès complet) à la création de la fiche annuaire correspondante
(`EtablissementsService.create` / `InspecteursService.create`, voir
`SubscribersService.createTrialFor*`).

**3 formules** (`subscription_plans`, communes aux deux types de
compte) — voir `seed-subscription-plans.ts` :

| Formule    | Prix         | Détail                                              |
| ---------- | ------------ | ----------------------------------------------------- |
| Mensuel    | 15 000 FC / mois | Renouvellement automatique (`auto_renew`)          |
| Annuel     | 126 000 FC / an  | ≈ -30% vs mensuel, renouvellement automatique      |
| Pack (×3)  | 2 000 FC / inspection | Packs de 10 / 20 / 50, valables 6 mois, cumulables |

**Cycle de vie** (`subscribers.status`, voir
`SubscriptionsSchedulerService`, cron quotidien) :
`essai` → (paiement confirmé) → `actif` → (essai/abonnement/pack expiré
sans renouvellement) → `lecture_seule`. En lecture seule,
`SubscriptionGuard` bloque `POST /form-submissions` pour
`chef_etablissement`/`inspecteur` — la consultation
(`GET /form-submissions*`) n'est jamais bloquée. `POST
/sync/submissions` (mobile, sans authentification aujourd'hui) applique
la même règle en best-effort, uniquement si l'entrée porte déjà un
`etablissementId`/`inspecteurId` (voir "Limite connue" ci-dessus).

**Paiement** — interface générique `PaymentGatewayService`
(`initiatePayment`), implémentée par `MockPaymentGateway` pour cette
itération : `POST /subscriptions/checkout` ouvre une transaction
`en_attente` et renvoie des instructions ; l'activation du compte n'a
lieu qu'à la confirmation asynchrone reçue sur
`POST /subscriptions/webhooks/:provider` (protégée par un secret
partagé, en-tête `X-Webhook-Secret` — voir `SUBSCRIPTIONS_WEBHOOK_SECRET`
dans `.env.example`), jamais au checkout lui-même — fidèle au
fonctionnement réel du mobile money (M-Pesa, Orange Money, Airtel
Money) et de la carte bancaire. **Pour brancher un vrai fournisseur**
(ex: CinetPay, agrégateur couvrant mobile money + carte en RDC) :
implémenter `PaymentGatewayService` et l'enregistrer à la place de
`MockPaymentGateway` dans `subscriptions.module.ts`
(`{ provide: PAYMENT_GATEWAY, useClass: ... }`), puis adapter
`WebhookConfirmDto`/`WebhookSecretGuard` au format et à la
vérification de signature du fournisseur.

**Relances** (`subscription_notifications`) : le même cron génère une
notification J-3 avant expiration (essai, abonnement, pack) et une à
l'expiration effective — consultées sur la page "Abonnements" (web,
IGE). Aucun canal d'envoi réel (e-mail/SMS) n'est branché : c'est un
historique interne pour l'instant.

```bash
npm run seed:subscription-plans   # les 5 lignes de formules (mensuel/annuel/pack_10/20/50)
npm run seed:subscriptions-demo   # applique des états variés aux comptes de démo existants
```

## Pilote de Butembo (PROMPT 9)

`npm run seed:demo-butembo` (après les 3 seeds ci-dessus) crée un jeu de
données entièrement fictif pour présenter l'application aux utilisateurs
pilotes de **Butembo (zone IGE "Nord-Kivu 2")** avant la mise en
production réelle — voir `src/database/seeds/seed-demo-butembo.ts` :

- 4 établissements (EP Butembo Centre, Institut Vijana wa Butembo,
  Complexe Scolaire La Colombe, EP Kitatumba), 2 inspecteurs et 4
  enseignants, tous marqués "(pilote)".
- Un exemple de formulaire **soumis** pour chacun des 5 types officiels
  (C2, C3, C3B, C3M, C3_DAS).
- Un essai gratuit de 14 jours démarré pour chaque établissement/
  inspecteur pilote (comme un vrai compte créé via l'API).
- 3 comptes de connexion pilote (mot de passe `password123`) :
  `chef.epbutembocentre@pilote.cd`, `inspecteur.kambale@pilote.cd`,
  `inspecteur.masika@pilote.cd` — le compte IGE de la zone existant déjà
  (`ige.nordkivu2@exemple.cd`, voir "Démarrage" ci-dessus) voit ces
  établissements sans compte supplémentaire.

Script idempotent (relancer sans risque de doublons ; n'écrase pas un
état d'abonnement déjà avancé lors d'une démonstration en direct).

## Intelligence artificielle (PROMPT 8)

Les 3 fonctionnalités utilisent l'API **Claude (Anthropic)** via
`@anthropic-ai/sdk`, centralisées dans `modules/ai` :

- **Clé et prompts système** : `ANTHROPIC_API_KEY`/`ANTHROPIC_MODEL`
  (`.env`) et les 3 prompts système sont regroupés dans
  `config/ai-prompts.ts` (importés dans `config/configuration.ts`,
  exposés via `ConfigService.get('ai', ...)`). `AnthropicClientService`
  encapsule le SDK et renvoie une erreur `503` explicite si la clé est
  absente, plutôt que de faire planter la route ou le cron.

- **Assistant de rédaction** (`POST /ai/writing-assistant`, mobile et
  web) : reformule les notes brutes d'un inspecteur pour une section
  notée en conseil pédagogique structuré. Sans état côté serveur — le
  client (mobile : `SectionStep`/`AiSuggestionSheet` ; web :
  `AssistantIaPage`) gère l'acceptation/modification/régénération.

- **Analyse des tendances** (`ige_admin`/`super_admin`, page web
  "Analyse IA") : `TrendAnalysisSchedulerService` (cron quotidien,
  `EVERY_DAY_AT_3AM`) agrège les scores des 30 derniers jours (par zone,
  par formulaire, les établissements les plus en difficulté) via
  `TrendAnalysisService`, compare à la période précédente, puis demande
  à Claude une synthèse structurée (JSON strict : `alerts`/`trends`/
  `positives`) stockée dans `ai_trend_analyses`. Une synthèse globale
  unique par exécution (pas une par zone) : un `ige_admin` la consulte
  au même titre qu'un `super_admin`. `POST /ai/trend-analyses/generate`
  (`super_admin`) déclenche une génération manuelle, utile pour tester
  sans attendre le cron.

- **Chatbot** (`POST /ai/chat`, tous rôles) : boucle de "tool use" de
  l'API Claude — `ChatbotToolsService` expose un jeu fixe d'outils
  (`get_inspection_stats`, `get_subscription_admin_overview`,
  `count_unpaid_accounts`, `get_my_subscription`, `get_app_help`), tous
  construits sur les services déjà scopés par rôle du reste de
  l'application (`FormSubmissionsService`, `SubscribersService`,
  `PaymentsService`) : **le modèle n'exécute jamais de SQL** — il choisit
  un outil, `ChatbotService` l'exécute côté serveur dans le périmètre de
  l'utilisateur connecté, et renvoie le résultat au modèle pour la
  réponse finale. `history` est reconstruit par le client à chaque appel
  (pas de session de conversation côté serveur).

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

## Tests (PROMPT 9)

```bash
npm run test        # unitaires — dont scoring.spec.ts (mentions des 5 formulaires) et pdf-template.service.spec.ts
npm run test:e2e     # end-to-end contre un vrai Postgres (voir docker compose up -d db)
```

- `src/modules/form-submissions/scoring.spec.ts` — calcul des scores et
  mentions pour les 5 formulaires (`shared/forms/*.json`) : note maximale
  -> meilleure mention, note nulle -> pire mention, critère inconnu ->
  exception, sections vides gérées sans planter.
- `src/modules/pdf/pdf-template.service.spec.ts` — génération PDF : ancres
  structurelles (en-tête, sections, tableau de conversion) + comparaison
  **golden-file** de l'HTML rendu contre une référence commitée
  (`test/fixtures/pdf-golden/<code>.html`, auto-générée au premier
  lancement). Le rendu HTML étant déterministe et Puppeteer se contentant
  de le rasteriser fidèlement, une comparaison octet-à-octet de l'HTML
  tient lieu de comparaison visuelle sans dépendre d'un vrai navigateur en
  CI — voir le commentaire en tête du fichier pour le raisonnement complet.
- `test/sync.e2e-spec.ts` — synchronisation après reconnexion : création,
  no-op idempotent, mise à jour + archivage de version, **conflit**
  (`baseServerUpdatedAt` périmé), formulaire invalide.
- `test/subscription-lifecycle.e2e-spec.ts` — passage **essai gratuit ->
  compte bloqué -> abonnement actif** : création réelle d'un établissement
  (déclenche l'essai), expiration forcée + `refreshSubscriptions()`,
  vérification du blocage (`lecture_seule`, 403 sur `POST
  /form-submissions`), `checkout` + webhook de confirmation, déblocage.

Le mobile (Flutter) porte des tests équivalents dans `mobile/test/`
(`scoring_all_forms_test.dart`, `pdf_generator_test.dart`,
`sync_queue_repository_test.dart`, `dynamic_form_controller_test.dart` —
saisie complète hors-ligne des 5 formulaires) — voir `mobile/README.md`.

## Déploiement (Docker — PROMPT 9)

`Dockerfile` (multi-étapes) + le service `api` de `docker-compose.yml` à
la racine du repo construisent une image de production de l'API :
compilation de `@c3-digital/shared` puis de `nest build`, image finale
avec Chromium installé (`apt-get install chromium`, déjà dans la liste de
chemins candidats de `PdfService.resolveExecutablePath()` — aucune
variable supplémentaire à définir). L'image conserve l'arborescence
`backend/src` + `shared/forms` (pas seulement `dist/`), car les scripts
`seed:*`/`migration:*` s'exécutent via `ts-node` et lisent les JSON des
formulaires directement sur disque.

```bash
# Depuis la racine du repo. Définir JWT_SECRET / SUBSCRIPTIONS_WEBHOOK_SECRET /
# ANTHROPIC_API_KEY dans un .env à la racine avant un déploiement réel — voir
# les commentaires de docker-compose.yml.
docker compose up -d db api

# Premier démarrage uniquement (ou après une nouvelle migration) :
docker compose exec api npm run migration:run
docker compose exec api npm run seed:form-templates
docker compose exec api npm run seed:auth-directory
docker compose exec api npm run seed:subscription-plans
```

L'API écoute alors sur `http://localhost:3000` (voir aussi
`web/README.md` pour le service `web` du même `docker-compose.yml`).

### Hébergement cloud gratuit — Render (Blueprint)

Pour obtenir un vrai lien public sans gérer de serveur : `render.yaml` à
la racine du repo est un [Blueprint Render](https://render.com/docs/blueprint-spec)
qui déploie l'API (`backend/Dockerfile`) **et** une base PostgreSQL
managée en un seul clic.

1. Sur [render.com](https://render.com), **New +** → **Blueprint**, choisir
   ce dépôt GitHub (`charite-kahereni/appli-inspecteur-epst`) et la
   branche voulue. Render détecte `render.yaml` et propose de créer les
   2 ressources (`c3-digital-api` + `c3-digital-db`) — valider.
2. `JWT_SECRET`/`SUBSCRIPTIONS_WEBHOOK_SECRET` sont générés
   automatiquement ; `ANTHROPIC_API_KEY` reste vide (fonctionnalités IA
   désactivées proprement) jusqu'à être renseignée manuellement dans
   l'onglet **Environment** du service, si souhaité.
3. Une fois le déploiement terminé (`c3-digital-api` passe en vert),
   onglet **Shell** du service → exécuter une fois :
   ```bash
   npm run migration:run
   npm run seed:form-templates
   npm run seed:auth-directory
   npm run seed:subscription-plans
   npm run seed:demo-butembo
   ```
4. L'URL publique (`https://c3-digital-api-xxxx.onrender.com`) est
   affichée en haut du service — c'est la valeur à donner à
   `VITE_API_BASE_URL` côté web (voir `web/README.md`).

⚠️ Le plan **free** de Render met le service en veille après 15 minutes
d'inactivité (premier appel plus lent le temps du réveil) et la base
gratuite expire après 90 jours — largement suffisant pour une démo ou un
pilote, à passer sur un plan payant avant une mise en production réelle.

## Scripts utiles

```bash
npm run build               # nest build
npm run migration:generate  # génère une migration à partir des diffs d'entités
npm run migration:revert    # annule la dernière migration
npm run seed:form-templates # charge shared/forms/*.json
npm run seed:auth-directory # comptes de démo + annuaire + inspections fictives
npm run seed:subscription-plans  # les 3 formules payantes (mensuel/annuel/pack 10/20/50)
npm run seed:subscriptions-demo  # états d'abonnement variés sur les comptes de démo
npm run seed:demo-butembo   # jeu de données du pilote de Butembo (PROMPT 9)
npm run generate:sample-pdf # génère un PDF C3 d'exemple (données fictives) pour validation visuelle
npm run lint
npm run test
```
