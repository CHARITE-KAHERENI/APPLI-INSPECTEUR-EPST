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
#   npm run seed:subscription-plans --workspace=backend
#   npm run seed:subscriptions-demo --workspace=backend  # états d'abonnement variés (page "Abonnements")

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
│   ├── AuthContext.tsx      # <AuthProvider> — session (login/logout/inscription, restauration via /auth/me)
│   ├── useAuth.ts           # Hook de consommation du contexte
│   ├── ProtectedRoute.tsx   # Redirige vers /connexion si non authentifié
│   ├── LoginPage.tsx
│   └── RegisterPage.tsx     # /inscription — libre-service, sans compte créé par l'IGE (PROMPT 10)
├── layout/
│   ├── AppShell.tsx         # Sidebar + zone de contenu (<Outlet />)
│   └── Sidebar.tsx          # Navigation, identité visuelle bleu marine #1F4E78
├── features/
│   └── dynamic-form/         # Assistant de saisie (/inspections/nouvelle, PROMPT 10) — voir plus bas
├── pages/
│   ├── DashboardPage.tsx        # Cartes de synthèse + répartition par formulaire + dernières inspections
│   ├── InspectionsPage.tsx      # Tableau filtrable + export PDF/CSV
│   ├── NewInspectionPage.tsx    # Choix du formulaire puis assistant de saisie (PROMPT 10)
│   ├── EtablissementsPage.tsx / EtablissementDetailPage.tsx
│   ├── InspecteursPage.tsx / InspecteurDetailPage.tsx
│   ├── AbonnementsPage.tsx      # IGE uniquement — essai, revenus, paiements, relances (PROMPT 7)
│   ├── AssistantIaPage.tsx      # Assistant de rédaction IA, tous rôles (PROMPT 8)
│   └── AnalyseIaPage.tsx        # IGE uniquement — synthèse quotidienne des tendances (PROMPT 8)
├── components/               # StatCard, MentionBadge, FormCodeBadge, FormCodeBarList, RevenueByPlanBarList,
│                              # SubscriberStatusBadge, ChatbotWidget (PROMPT 8), icônes SVG...
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

## Inscription en libre-service et saisie de formulaire (PROMPT 10)

- **`/inscription`** (`RegisterPage.tsx`) : un chef d'établissement ou un
  inspecteur crée son compte sans passer par l'IGE — bascule
  établissement/inspecteur, appelle `POST /auth/register-etablissement`
  ou `POST /auth/register-inspecteur` (backend) via
  `AuthContext.registerEtablissement`/`registerInspecteur`, connecté
  immédiatement (essai gratuit de 14 jours) comme après un login.
- **`/inspections/nouvelle`** (`NewInspectionPage.tsx` +
  `features/dynamic-form/`) : assistant de saisie en 3 phases, miroir web
  de `mobile/lib/features/dynamic_form/` —
  1. **Identification** (`IdentificationStep.tsx`) : champs d'en-tête
     communs + groupes de champs non notés (`FormTemplate.fieldGroups`),
     tous stockés dans un seul `header` (comme côté mobile).
  2. **Sections notées** (`SectionStep.tsx`) : un écran par section, notes
     0-4 par critère + zone "Conseils", score de la section calculé en
     direct.
  3. **Synthèse** (`SynthesisStep.tsx`) : tableau récapitulatif + note
     finale, puis signatures (`SignaturePad.tsx` — capture au doigt/souris
     sur `<canvas>`, encodée en PNG base64 sans préfixe `data:`, même
     convention que `signature_pad_field.dart` côté mobile).

  `useDynamicForm.ts` centralise l'état du brouillon et délègue tout le
  calcul de score à `computeSectionScore`/`computeSynthesisScore`
  (`@c3-digital/shared`) — aucune logique de notation dupliquée entre
  web, mobile et backend. Il aplatit aussi la réponse de
  `GET /form-templates/:code` (le contenu détaillé y est stocké dans une
  colonne `definition`, voir `ApiFormTemplate` dans `types/api.ts`) en
  `FormTemplate` (shared), comme le fait déjà `PdfController` côté
  backend.

  À la soumission : `POST /form-submissions` (déjà utilisé par le mobile,
  aucune route backend supplémentaire) puis
  `PATCH /form-submissions/:id/status` (`soumis`) — la
  `SubscriptionGuard` backend bloque la création si l'essai/l'abonnement
  du compte est expiré, avec un message affiché sous le formulaire.
  Entrée de navigation "Nouvelle inspection" réservée aux rôles
  `chef_etablissement`/`inspecteur`.

## Page "Abonnements" (PROMPT 7)

Visible uniquement pour `ige_admin`/`super_admin` (entrée sidebar
conditionnelle) : cartes de synthèse (comptes en essai/actifs/lecture
seule, revenu total), revenus par formule (`RevenueByPlanBarList`, même
convention à une seule teinte de marque que `FormCodeBarList` — voir
skill `dataviz`), liste des comptes facturables avec statut
(`SubscriberStatusBadge`) et échéance, historique des paiements et
relances envoyées avant expiration. Consomme
`GET /subscriptions/admin/{overview,subscribers,payments,notifications}`,
déjà restreints à la zone IGE côté backend comme le reste de
l'application.

## Intelligence artificielle (PROMPT 8)

- **Assistant IA** (`/assistant-ia`, tous rôles) : expose l'assistant de
  rédaction comme un outil autonome (formulaire, section, notes brutes ->
  suggestion copiable) plutôt que d'être intégré dans l'assistant de
  saisie (`/inspections/nouvelle`, PROMPT 10) — reste indépendant de la
  section en cours de remplissage, utilisable aussi pour préparer un
  texte avant de le coller dans la zone "Conseils" d'une section. Un état
  d'erreur explicite ("Fonction IA indisponible") s'affiche si l'appel
  échoue, sans bloquer l'utilisateur.
- **Analyse IA** (`/analyse-ia`, IGE uniquement) : dernière synthèse
  quotidienne (`GET /ai/trend-analyses/latest`), organisée en 3 sections
  visuellement distinctes — Alertes (rouge), Tendances (bleu), Points
  positifs (vert) — avec un bouton "Générer maintenant" pour
  `super_admin` (déclenchement manuel sans attendre le cron).
- **Chatbot** (`ChatbotWidget`, tous rôles) : bulle flottante montée dans
  `AppShell`, donc présente sur toutes les pages authentifiées. Envoie
  `POST /ai/chat` avec l'historique de la conversation reconstruit côté
  client (pas de session serveur) ; les permissions par rôle sont déjà
  appliquées côté backend (voir `ChatbotToolsService`), ce composant n'a
  donc aucune logique de restriction à dupliquer.

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

## Déploiement (PROMPT 9)

`npm run build --workspace=web` produit un dossier `web/dist` 100%
statique (HTML/CSS/JS) : aucun serveur Node n'est requis pour le
servir. `VITE_API_BASE_URL` est intégrée au bundle **au moment du
build**, pas lue au démarrage — toute modification de l'URL de l'API
nécessite un nouveau build. Deux façons de déployer, au choix :

**1. Conteneur nginx (auto-hébergement, ex. VPS du pilote de Butembo)**
— `web/Dockerfile` compile le web puis le sert via nginx
(`web/nginx.conf`, avec repli SPA sur `index.html` pour React Router).
Intégré à `docker-compose.yml` à la racine (service `web`, avec `api`
et `db`) :

```bash
# Depuis la racine du repo — VITE_API_BASE_URL doit pointer vers l'URL
# publique de l'API (pas le nom du service Docker interne, injoignable
# depuis le navigateur des utilisateurs).
VITE_API_BASE_URL=https://api.exemple.cd docker compose build web
docker compose up -d web   # http://<serveur>:8080
```

**2. Hébergement cloud statique managé (Netlify/Vercel)** — sans
conteneur à gérer. Configs prêtes à l'emploi :

- **Netlify** : `web/netlify.toml` (commande de build, dossier de
  publication `web/dist`, repli SPA). Définir `VITE_API_BASE_URL` dans
  les variables d'environnement du site avant le premier build.
- **Vercel** : `web/vercel.json` — définir le "Root Directory" du
  projet sur `web` (la commande de build remonte à la racine du
  monorepo pour compiler `@c3-digital/shared` au préalable). Définir
  `VITE_API_BASE_URL` dans les variables d'environnement du projet.

Dans les deux cas, l'hébergeur détecte `web/package.json` mais la
compilation a besoin du monorepo complet (workspace `@c3-digital/shared`)
— d'où les commandes de build qui remontent explicitement à la racine.

**Chemin complet recommandé pour un lien public rapide** : déployer
d'abord l'API sur Render via `render.yaml` (voir `backend/README.md`,
section "Hébergement cloud gratuit — Render"), récupérer son URL
(`https://c3-digital-api-xxxx.onrender.com`), puis l'utiliser comme
`VITE_API_BASE_URL` sur Netlify/Vercel pour le web.
