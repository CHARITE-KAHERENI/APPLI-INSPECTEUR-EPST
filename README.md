# c3-digital

Numérisation des formulaires d'inspection scolaire de l'**Inspection
Générale de l'Enseignement (IGE)**, République Démocratique du Congo.

La plateforme couvre les **5 formulaires officiels** de l'IGE :

| Code      | Formulaire                                                      | Statut |
| --------- | ----------------------------------------------------------------- | ------ |
| `C2`      | Inspection administrative                                          | ✅ transcrit |
| `C3`      | Inspection pédagogique (leçon théorique)                           | ✅ transcrit |
| `C3B`     | Inspection pédagogique (leçon pratique)                            | ✅ transcrit |
| `C3M`     | Inspection pédagogique (enseignement maternel)                     | ✅ transcrit |
| `C3_DAS`  | Inspection pédagogique (séquence didactique)                       | ✅ transcrit |

## Architecture

```
c3-digital/
├── mobile/     # Application Flutter (Android + iOS) — saisie hors-ligne des inspecteurs
├── web/        # Application React (Vite) — consultation / gestion en ligne
├── backend/    # API REST Node.js + NestJS — persistance PostgreSQL
├── shared/     # Modèle de données partagé : types TypeScript + JSON Schema
├── database/   # Schéma SQL de référence (miroir des migrations backend)
└── docker-compose.yml   # PostgreSQL local
```

Le monorepo `shared` / `backend` / `web` est géré via les **npm
workspaces** (racine `package.json`). `mobile` est un projet Flutter/Dart
indépendant (géré par `pubspec.yaml`), non inclus dans les workspaces npm.

### Le modèle de "formulaire dynamique" (`/shared`)

Plutôt que d'implémenter cinq formulaires en dur, `shared/src/types`
définit **un seul modèle générique** (`FormTemplate` / `FormSubmission`)
capable de représenter n'importe lequel des 5 formulaires IGE :

- un **en-tête commun** (inspecteur, établissement, enseignant/entité
  inspectée, année scolaire, numéro de rapport) + des champs spécifiques
  par formulaire, plus des **groupes de champs non notés** hors en-tête
  (ex : "Activité(s) inspectée(s)", ou "Implantation/Structure" notées
  E/TB/B/AB/M pour C2) ;
- une ou plusieurs **sections**, chacune avec :
  - des **critères notés de 0 à 4**, avec leur numérotation officielle ;
  - une zone **"conseils"** en texte libre ;
  - un champ **`custom_fields`** toujours vide dans les configurations
    officielles, réservé aux ajouts futurs de l'utilisateur — jamais
    fusionné avec les critères officiels ;
- **un seul "Tableau de conversion"** note → pourcentage → mention par
  formulaire (pas un barème par section), fidèle au mécanisme réellement
  imprimé sur les documents officiels — voir `shared/README.md` pour le
  détail des deux modes (`lookup_by_criteria_count` / `percentage_only`) ;
- une zone de **signatures** (enseignant, chef d'établissement,
  inspecteur — variable selon le formulaire).

Ce modèle est décrit à la fois en **types TypeScript** (`shared/src/types`)
et en **JSON Schema** (`shared/src/schemas`), afin d'être consommé de
façon cohérente par le backend, le web et — via un miroir Dart maintenu
manuellement — l'application mobile. Voir `shared/README.md` pour le
détail, y compris les quelques coquilles des documents sources
transcrites telles quelles (numérotation dupliquée, valeur déduite par
calcul là où un chiffre est tronqué à l'impression...).

Les 5 configurations JSON (`shared/forms/*.json`) sont des transcriptions
complètes des documents officiels fournis. Note : contrairement à une
hypothèse initiale, "C3M" désigne l'inspection pédagogique de
l'**enseignement maternel** (et non le personnel de maîtrise/direction).

### Backend (`/backend`)

API NestJS. Deux tables PostgreSQL, gérées par des migrations TypeORM
(`backend/src/database/migrations`) :

- **`form_templates`** — une ligne par version d'un des 5 formulaires,
  avec sa `definition` (en-tête, sections, signatures) en JSONB.
- **`form_submissions`** — une ligne par formulaire rempli par un
  inspecteur, avec `status` : `brouillon` → `soumis` → `synchronise`
  (cycle de vie pensé pour la saisie hors-ligne sur mobile).

Voir `backend/README.md` et `database/README.md`.

### Mobile (`/mobile`)

`DynamicFormScreen` génère automatiquement toute l'interface de saisie
(identification → sections notées → synthèse + signatures) pour
n'importe lequel des 5 formulaires à partir de sa seule configuration
JSON. État géré via Provider, auto-sauvegarde locale en SQLite à chaque
modification. Voir `mobile/README.md` pour le détail (et l'étape
`flutter create .` nécessaire pour générer les projets natifs
Android/iOS, absents du SDK dans cet environnement de développement).

### Web (`/web`)

React 19 + Vite + Tailwind v4, connecté à l'API backend via React Query.
Tableau de bord IGE (cartes de synthèse, répartition des inspections par
formulaire), page "Inspections" filtrable avec export PDF/CSV, fiches
"Établissements" et "Inspecteurs" avec historique — accès protégé par
connexion (JWT), sidebar reprenant l'identité visuelle bleu marine
`#1F4E78`. Voir `web/README.md`.

## Démarrage rapide

```bash
npm install                     # installe shared + backend + web (workspaces)
docker compose up -d db         # PostgreSQL local
npm run build:shared

cd backend
cp .env.example .env
npm run migration:run
npm run seed:form-templates     # charge les 5 templates (C2, C3, C3B, C3M, C3_DAS)
npm run seed:auth-directory     # comptes de démo (un par rôle) + annuaire + inspections fictives
npm run seed:subscription-plans # les 3 formules payantes (mensuel, annuel, pack 10/20/50)
npm run seed:subscriptions-demo # états d'abonnement variés sur les comptes de démo
npm run seed:demo-butembo       # jeu de données du pilote de Butembo (Nord-Kivu 2) — voir backend/README.md
# ANTHROPIC_API_KEY dans .env pour activer les 3 fonctionnalités IA (sinon désactivées proprement, voir plus bas)
npm run start:dev               # http://localhost:3000

# dans un autre terminal
cp web/.env.example web/.env.local
npm run dev --workspace=web     # http://localhost:5173 — voir web/README.md pour les comptes de démo
```

## Mode hors-ligne et synchronisation (mobile)

L'application mobile fonctionne intégralement hors-ligne (formulaires,
configurations, référentiels établissements/enseignants, tous disponibles
en SQLite) et synchronise automatiquement dès qu'une connexion est
détectée, avec réessai automatique en cas d'échec et gestion des
conflits (version locale la plus récente appliquée, historique des deux
versions consultable par l'IGE). Voir `mobile/README.md` (section "Mode
hors-ligne et synchronisation") et `backend/README.md` (endpoints
`POST /sync/submissions`, `GET /sync/status`,
`GET /sync/submissions/:id/history`) pour le détail.

## Comptes, rôles et autorisation

Authentification JWT, 5 rôles (`inspecteur`, `enseignant`,
`chef_etablissement`, `ige_admin`, `super_admin`). Chaque rôle ne voit
que les formulaires dans son périmètre (son établissement, ses propres
inspections, sa zone IGE pour l'IGE, tout pour un super administrateur)
— voir `backend/README.md` (section "Authentification & autorisation")
pour le détail des règles et `web/README.md` pour les comptes de
démonstration.

## Essai gratuit et abonnement

À la création d'un compte établissement ou inspecteur, un essai gratuit
de 14 jours démarre automatiquement (accès complet). Passé ce délai,
sans formule active, le compte bascule en **lecture seule** (historique
consultable, création de nouvelles inspections bloquée) et se voit
proposer 3 formules payantes — mensuel (15 000 FC), annuel (126 000 FC,
≈ -30%) ou pack à l'usage (2 000 FC/inspection, packs de 10/20/50,
valables 6 mois) — payables par mobile money local (M-Pesa, Orange
Money, Airtel Money) ou carte bancaire via une interface de passerelle
générique (webhook de confirmation), prête à être connectée à un vrai
prestataire (ex: CinetPay). Vue d'ensemble, revenus, paiements et
relances : page "Abonnements" (web, IGE) ; sélection de formule et
paiement : profil utilisateur (mobile). Voir `backend/README.md`
(section "Abonnements & paiement"), `web/README.md` et
`mobile/README.md` (section "Connexion & abonnement").

## Intelligence artificielle

Trois fonctionnalités s'appuyant sur l'API **Claude (Anthropic)**
(`ANTHROPIC_API_KEY`, config centralisée dans `backend/src/config/`) :
un **assistant de rédaction** (mobile et web) qui reformule les notes
brutes d'un inspecteur en conseil pédagogique structuré (accepter/
modifier/régénérer, avec un message explicite si hors-ligne ou sans
session) ; une **analyse des tendances** quotidienne (IGE uniquement,
page "Analyse IA") distinguant alertes, tendances et points positifs à
partir des scores agrégés par zone/établissement/formulaire ; et un
**chatbot** (web, tous rôles, bulle flottante) qui répond aux questions
sur les données de l'utilisateur via un jeu d'outils contrôlés — jamais
d'accès SQL direct, chaque outil réutilise les services déjà restreints
par rôle du reste de l'application. Voir `backend/README.md` (section
"Intelligence artificielle"), `web/README.md` et `mobile/README.md`
(section "Assistant de rédaction IA").

## Génération PDF

Chaque formulaire rempli peut être exporté en PDF visuellement fidèle au
document Word officiel correspondant (en-tête RDC/ministère/logo IGE,
identification, grille d'évaluation, tableau de conversion + synthèse,
signatures avec date et lieu, observations complémentaires de
l'inspecteur en encart distinct) — aussi bien côté serveur
(`GET /form-submissions/:id/pdf`, Puppeteer/Chromium) que localement sur
mobile en mode hors-ligne (package Dart `pdf`, bouton "Générer le PDF" de
l'écran de synthèse). Voir `backend/README.md` et `mobile/README.md`
(sections "Génération PDF").

## Tests, déploiement et pilote de Butembo (PROMPT 9)

- **Tests automatisés** : scores/mentions des 5 formulaires, synchronisation
  + conflits, génération PDF (golden-file), passage essai -> bloqué ->
  abonné actif — voir `backend/README.md` (section "Tests") et
  `mobile/README.md` (section "Tests").
- **Déploiement** : `docker-compose.yml` (services `db` + `api` + `web`,
  voir `backend/Dockerfile` / `web/Dockerfile`) pour un auto-hébergement
  complet ; `web/netlify.toml` / `web/vercel.json` en alternative cloud
  managée pour le web ; `mobile/scripts/` pour générer un **APK Android
  signé** distribué hors Play Store pendant le pilote.
- **Jeu de données pilote** : `npm run seed:demo-butembo` — établissements,
  inspecteurs et formulaires d'exemple fictifs pour le déploiement pilote
  de **Butembo (Nord-Kivu 2)** — voir `backend/README.md`.
- **Guide de démarrage rapide** (1 page, français simple) pour un
  inspecteur sur le terrain : `docs/guide-demarrage-inspecteur.md`
  (version imprimable : `docs/guide-demarrage-inspecteur.html`).

## Prochaines étapes

- Génération des projets natifs mobile (`flutter create .`) — voir
  `mobile/README.md`.
- Liste des brouillons en cours côté mobile (reprise, suppression) et
  écran de paramètres pour configurer l'URL du serveur.
- Relier l'en-tête des formulaires mobile à l'annuaire (établissements/
  enseignants/inspecteurs) plutôt qu'au texte libre actuel, pour que les
  formulaires créés hors-ligne héritent aussi de l'autorisation par rôle
  côté web (voir "Limite connue" dans `backend/README.md`).
- La connexion mobile (voir "Essai gratuit et abonnement" ci-dessus)
  couvre le profil et l'abonnement, mais pas encore la saisie/synchronisation
  elle-même : `/sync/*` reste volontairement ouvert, et l'en-tête d'un
  formulaire mobile n'est pas encore relié à un compte utilisateur.
- Interface web de saisie de formulaire (aujourd'hui uniquement
  consultation) et gestion des comptes utilisateurs.
- Connexion d'une vraie passerelle de paiement (ex: CinetPay) à la place
  du mock `PaymentGatewayService`, et renouvellement automatique
  effectif des abonnements `auto_renew` (le champ existe, mais rien ne
  débite encore à échéance).
- Une fois l'interface web de saisie de formulaire construite (voir
  ci-dessus), intégrer l'assistant de rédaction IA directement dans la
  section éditée plutôt que comme outil autonome (`/assistant-ia`).
