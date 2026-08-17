# @c3-digital/web

Application web du projet **c3-digital** (React 19 + Vite + Tailwind v4),
destinée à l'administration de l'IGE (et, selon leur rôle, aux chefs
d'établissement, inspecteurs et enseignants) pour consulter les
formulaires d'inspection saisis sur mobile.

Consomme l'API du `backend` (authentification JWT, CRUD annuaire,
inspections) via `@tanstack/react-query`, et le modèle partagé
`@c3-digital/shared` (types + JSON Schema des formulaires C2/C3/C3B/C3M/
C3_DAS).

## Démarrage

```bash
npm install                      # depuis la racine du monorepo (workspaces)
npm run build:shared             # @c3-digital/shared doit être compilé au moins une fois

cp web/.env.example web/.env.local   # VITE_API_BASE_URL (défaut: http://localhost:3000)

# Le backend doit tourner (voir backend/README.md), migrations + seeds appliqués :
#   npm run migration:run --workspace=backend
#   npm run seed:form-templates --workspace=backend
#   npm run seed:auth-directory --workspace=backend   # comptes de démonstration

npm run dev --workspace=web      # http://localhost:5173
```

**Comptes de démonstration** (créés par `seed:auth-directory`, mot de
passe `password123` pour tous) — visibles aussi sur l'écran de connexion :

| E-mail                                | Rôle                | Périmètre                        |
| -------------------------------------- | -------------------- | --------------------------------- |
| `super.admin@exemple.cd`               | `super_admin`         | Tout                               |
| `ige.nordkivu2@exemple.cd`             | `ige_admin`           | Zone "Nord-Kivu 2"                 |
| `chef.institutdelapaix@exemple.cd`     | `chef_etablissement`  | Institut de la Paix (exemple)      |
| `inspecteur.tshisekedi@exemple.cd`     | `inspecteur`          | Ses propres inspections            |
| `enseignant.mukendi@exemple.cd`        | `enseignant`          | Les inspections le concernant      |

## Structure

```
src/
├── main.tsx                 # QueryClientProvider + BrowserRouter + AuthProvider
├── App.tsx                  # Déclaration des routes
├── auth/
│   ├── authContextObject.ts # Contexte React (valeur + type), séparé pour le fast refresh
│   ├── AuthContext.tsx      # <AuthProvider> — session (login/logout, restauration via /auth/me)
│   ├── useAuth.ts           # Hook de consommation du contexte
│   ├── ProtectedRoute.tsx   # Redirige vers /connexion si non authentifié
│   └── LoginPage.tsx
├── layout/
│   ├── AppShell.tsx         # Sidebar + zone de contenu (<Outlet />)
│   └── Sidebar.tsx          # Navigation, identité visuelle bleu marine #1F4E78
├── pages/
│   ├── DashboardPage.tsx        # Cartes de synthèse + répartition par formulaire + dernières inspections
│   ├── InspectionsPage.tsx      # Tableau filtrable + export PDF/CSV
│   ├── EtablissementsPage.tsx / EtablissementDetailPage.tsx
│   └── InspecteursPage.tsx / InspecteurDetailPage.tsx
├── components/               # StatCard, MentionBadge, FormCodeBadge, FormCodeBarList, icônes SVG...
├── hooks/useApi.ts           # Hooks React Query (un par ressource de l'API)
├── lib/
│   ├── api.ts                # Instance axios (jeton JWT en en-tête, événement 401 -> déconnexion)
│   ├── pdf.ts                # Ouverture/téléchargement du PDF généré par le backend
│   ├── exportCsv.ts          # Export "Excel" (CSV, voir note ci-dessous)
│   ├── mentions.ts / formCode.ts / header.ts  # Petits utilitaires d'affichage
└── types/api.ts               # Formes de réponse propres à l'API (non promues dans @c3-digital/shared)
```

## Authentification & rôles

`AuthContext` stocke le jeton JWT en `localStorage` et restaure la
session au chargement via `GET /auth/me`. Un 401 (jeton expiré/invalide)
déclenche un évènement `window` intercepté par `AuthContext` pour
déconnecter l'utilisateur — voir `lib/api.ts`.

Le backend applique les règles d'autorisation (voir `backend/README.md`,
section Authentification) ; le web n'a donc pas besoin de dupliquer cette
logique — la sidebar affiche simplement le rôle et, le cas échéant, la
zone de l'utilisateur connecté, et chaque écran reçoit déjà des données
correctement filtrées par l'API.

## Export "Excel"

`InspectionsPage` exporte la liste filtrée en CSV (séparateur `;`, BOM
UTF-8) plutôt qu'en `.xlsx` : les bibliothèques de génération `.xlsx`
côté navigateur disponibles sur le registre npm au moment de l'écriture
(ex: `xlsx`/SheetJS) portent des vulnérabilités connues sans correctif
publié sur npm (voir `lib/exportCsv.ts`). Un CSV avec ce séparateur
s'ouvre correctement dans Excel (y compris les accents, grâce au BOM) et
évite d'introduire cette dépendance.

## Tailwind v4

Configuré via le plugin Vite officiel (`@tailwindcss/vite`, pas de
`tailwind.config.js` ni PostCSS) — la palette de marque est déclarée en
CSS dans `src/index.css` (`@theme`), avec les mêmes couleurs que
`mobile/lib/core/theme/app_colors.dart` et `backend/.../pdf-template.service.ts`.

**Note Vite + monorepo** : `@c3-digital/shared` est compilé en CommonJS
(pour rester consommable par le backend Node). `vite.config.ts` l'ajoute
donc à `optimizeDeps.include`, sans quoi le serveur de dev échoue à
résoudre ses exports nommés (la production, via Rollup, n'est pas
concernée).

## Scripts utiles

```bash
npm run dev --workspace=web
npm run build --workspace=web    # tsc -b && vite build
npm run lint --workspace=web     # oxlint
npm run preview --workspace=web
```
