# Base de données

Le projet utilise **PostgreSQL**. Le schéma applicatif est géré par les
migrations TypeORM du backend (`backend/src/database/migrations/`) ; ce
dossier `/database` ne contient qu'une copie de référence lisible.

- `schema.sql` — miroir SQL brut de toutes les tables (`form_templates`,
  `form_submissions`, `form_submission_versions`, `etablissements`,
  `enseignants`, `inspecteurs`, `users`), utile pour une inspection
  rapide ou une recréation manuelle du schéma.

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

`client_updated_at` porte l'horodatage de la dernière modification côté
appareil mobile (distinct de `updated_at`, géré par le serveur) : c'est
sur cette valeur que se base la résolution de conflit lors d'une
synchronisation — voir `form_submission_versions` et
`backend/src/modules/sync`.

`etablissement_id` / `enseignant_id` / `inspecteur_id` (nullable) relient
optionnellement le formulaire à l'annuaire ci-dessous — utilisés pour
l'autorisation par rôle et les agrégations du tableau de bord, distincts
du texte libre de `header` qui reste la source de vérité pour
l'affichage/le PDF. `overall_percentage` / `overall_mention` portent le
score de synthèse final, calculé et dénormalisé à chaque
création/synchronisation (voir
`backend/src/modules/form-submissions/overall-score.util.ts`) pour que
les agrégations ("score moyen par formulaire") n'aient pas à
réappliquer le barème officiel en SQL.

### `form_submission_versions`
Historique des versions de `form_submissions` remplacées lors d'une
synchronisation (`sync_update`) ou d'un conflit détecté entre une
modification locale et une modification serveur (`sync_conflict`) :
la politique du module `sync` privilégie toujours la version locale la
plus récente, mais archive systématiquement la version qu'elle remplace
ici, pour que l'IGE puisse consulter les deux versions.

### `etablissements` / `enseignants` / `inspecteurs`
Référentiels "annuaire" — écoles inspectées, enseignants et inspecteurs
de l'IGE. `zone` (sur `etablissements` et `inspecteurs`) porte la zone
d'inspection IGE (ex: "Nord-Kivu 2"), comparée à `users.zone` pour
restreindre ce qu'un compte `ige_admin` peut consulter — voir
`backend/README.md` (section "Authentification & autorisation").

### `users`
Comptes de connexion (authentification JWT, `password_hash` via
bcrypt), un des 5 rôles (`role`, voir `@c3-digital/shared` `UserRole`).
Distincts des référentiels ci-dessus : un `inspecteur` a un compte de
connexion ET une fiche annuaire, reliées par `inspecteur_id`. Pas de
CRUD public sur cette table — voir `backend/src/modules/users`.

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
npm run seed:auth-directory   # comptes de démo (un par rôle) + annuaire + inspections fictives
```
