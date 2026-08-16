# c3-digital

Numérisation des formulaires d'inspection scolaire de l'**Inspection
Générale de l'Enseignement (IGE)**, République Démocratique du Congo.

La plateforme couvre les **5 formulaires officiels** de l'IGE :

| Code      | Formulaire                                                      |
| --------- | ----------------------------------------------------------------- |
| `C2`      | Fiche d'inspection pédagogique (leçon observée)                   |
| `C3`      | Rapport d'inspection d'un enseignant                               |
| `C3B`     | Rapport d'inspection - variante B                                  |
| `C3M`     | Rapport d'inspection du personnel de maîtrise / direction          |
| `C3_DAS`  | Rapport d'inspection administrative et sociale                     |

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
  par formulaire ;
- une ou plusieurs **sections**, chacune avec :
  - des **critères notés de 0 à 4** ;
  - un **barème** de conversion note → pourcentage → mention ;
  - une zone **"conseils"** en texte libre ;
- une zone de **signatures** (enseignant, chef d'établissement,
  inspecteur).

Ce modèle est décrit à la fois en **types TypeScript** (`shared/src/types`)
et en **JSON Schema** (`shared/src/schemas`), afin d'être consommé de
façon cohérente par le backend, le web et — via un miroir Dart maintenu
manuellement — l'application mobile. Voir `shared/README.md` pour le
détail.

Les configurations JSON des formulaires **C3** et **C3M**
(`shared/src/form-templates/{c3,c3m}.json`) sont en place ; leur contenu
pédagogique détaillé (libellés officiels des rubriques et barèmes) est
volontairement marqué `PLACEHOLDER` en attendant d'être fourni. Les
configurations **C2, C3B et C3_DAS** suivront le même schéma.

### Backend (`/backend`)

API NestJS. Deux tables PostgreSQL, gérées par des migrations TypeORM
(`backend/src/database/migrations`) :

- **`form_templates`** — une ligne par version d'un des 5 formulaires,
  avec sa `definition` (en-tête, sections, signatures) en JSONB.
- **`form_submissions`** — une ligne par formulaire rempli par un
  inspecteur, avec `status` : `brouillon` → `soumis` → `synchronise`
  (cycle de vie pensé pour la saisie hors-ligne sur mobile).

Voir `backend/README.md` et `database/README.md`.

### Web (`/web`) et Mobile (`/mobile`)

Scaffolds initiaux (React + Vite pour le web, Flutter pour le mobile),
connectés au modèle partagé. L'interface de saisie/consultation des
formulaires sera construite dans une prochaine itération — voir
`web/README.md` et `mobile/README.md` (ce dernier documente l'étape
`flutter create .` nécessaire pour générer les projets natifs
Android/iOS, absents du SDK dans cet environnement de développement).

## Démarrage rapide

```bash
npm install                     # installe shared + backend + web (workspaces)
docker compose up -d db         # PostgreSQL local
npm run build:shared

cd backend
cp .env.example .env
npm run migration:run
npm run seed:form-templates     # charge les templates C3 / C3M
npm run start:dev               # http://localhost:3000

# dans un autre terminal
npm run dev --workspace=web     # http://localhost:5173
```

## Prochaines étapes

- Contenu détaillé (rubriques, barèmes officiels) des formulaires C3 et
  C3M, puis configurations C2, C3B et C3_DAS.
- Génération des projets natifs mobile (`flutter create .`) et
  implémentation de la saisie hors-ligne + synchronisation.
- Interface web de consultation/gestion des formulaires.
- Authentification et autorisations par rôle (inspecteur, chef
  d'établissement, administration IGE).
