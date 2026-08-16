# c3-digital

Numérisation des formulaires d'inspection scolaire de l'**Inspection
Générale de l'Enseignement (IGE)**, République Démocratique du Congo.

La plateforme couvre les **5 formulaires officiels** de l'IGE :

| Code      | Formulaire                                                      | Statut |
| --------- | ----------------------------------------------------------------- | ------ |
| `C2`      | Inspection administrative                                          | ✅ transcrit |
| `C3`      | Inspection pédagogique (leçon théorique)                           | ✅ transcrit |
| `C3B`     | Inspection pédagogique (leçon pratique)                            | ✅ transcrit |
| `C3M`     | Rapport d'inspection du personnel de maîtrise / direction          | ⏳ placeholder (document officiel non encore fourni) |
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

Les configurations JSON de **C2, C3, C3B et C3_DAS**
(`shared/forms/{c2,c3,c3b,c3_das}.json`) sont des transcriptions complètes
des documents officiels fournis. **C3M** (`shared/forms/c3m.json`) reste
un squelette `PLACEHOLDER` : aucun document officiel n'a encore été fourni
pour ce formulaire.

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
npm run seed:form-templates     # charge les 5 templates (C2, C3, C3B, C3M, C3_DAS)
npm run start:dev               # http://localhost:3000

# dans un autre terminal
npm run dev --workspace=web     # http://localhost:5173
```

## Prochaines étapes

- Contenu détaillé (rubriques, barème officiel) du formulaire **C3M** —
  seul formulaire encore en `PLACEHOLDER`.
- Génération des projets natifs mobile (`flutter create .`) et
  implémentation de la saisie hors-ligne + synchronisation.
- Interface web de saisie/consultation des formulaires, s'appuyant sur
  `shared/forms/*.json` et `computeSectionScore`.
- Authentification et autorisations par rôle (inspecteur, chef
  d'établissement, administration IGE).
