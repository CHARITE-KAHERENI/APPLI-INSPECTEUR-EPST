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

Scaffold initial (React + Vite), connecté au modèle partagé. L'interface
de saisie/consultation des formulaires sera construite dans une
prochaine itération — voir `web/README.md`.

## Démarrage rapide

```bash
npm install                     # installe shared + backend + web (workspaces)
docker compose up -d db         # PostgreSQL local
npm run build:shared

cd backend
cp .env.example .env
npm run migration:run
npm run seed:form-templates     # charge les 5 templates (C2, C3, C3B, C3M, C3_DAS)
npm run start:dev               # http://localhost:3000

# dans un autre terminal
npm run dev --workspace=web     # http://localhost:5173
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

## Prochaines étapes

- Génération des projets natifs mobile (`flutter create .`) — voir
  `mobile/README.md`.
- Liste des brouillons en cours côté mobile (reprise, suppression) et
  écran de paramètres pour configurer l'URL du serveur.
- Interface web de saisie/consultation des formulaires, s'appuyant sur
  `shared/forms/*.json` et `computeSectionScore`.
- Authentification et autorisations par rôle (inspecteur, chef
  d'établissement, administration IGE).
