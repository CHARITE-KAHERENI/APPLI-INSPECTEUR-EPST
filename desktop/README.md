# c3-digital — tableau de bord IGE (desktop)

Application de bureau (Windows, macOS, Linux) pour le **tableau de bord
IGE** — la même interface que `web/` (dashboard, inspections,
établissements, inspecteurs, abonnements, IA), dans une fenêtre native
plutôt qu'un onglet de navigateur.

## Pourquoi Tauri (et pas Electron) ?

[Tauri](https://tauri.app) affiche `web/dist` dans la **WebView du
système d'exploitation** (WebView2 sur Windows, WebKit sur macOS/Linux)
plutôt que d'embarquer son propre Chromium comme Electron — l'exécutable
final ne pèse que quelques Mo (contre ~100+ Mo pour un équivalent
Electron), sans rien retirer côté fonctionnalités : `web/` continue
d'appeler l'API backend en HTTP exactement comme depuis un navigateur
(voir `web/README.md`), cette application n'ajoute aucune commande
native personnalisée — c'est une coquille, pas une réécriture.

**Ce dossier ne duplique pas `web/`** : `desktop/src-tauri/tauri.conf.json`
pointe `build.frontendDist` vers `../../web/dist`, le build de production
du web existant. Toute évolution du tableau de bord se fait dans `web/`
comme avant ; ce dossier ne fait qu'empaqueter son résultat.

## Démarrage (développement)

```bash
# Depuis la racine du monorepo :
npm install
npm run build:shared
npm run dev --workspace=web   # laisser tourner (http://localhost:5173)

# Dans un autre terminal :
cargo install tauri-cli --version "^2"
cd desktop/src-tauri
cargo tauri dev
```

`tauri.conf.json` pointe `build.devUrl` vers `http://localhost:5173` en
développement (le serveur Vite ci-dessus) et `build.frontendDist` vers
`web/dist` (le build de production) pour `cargo tauri build`.

## Build de production

```bash
# Depuis la racine — VITE_API_BASE_URL est intégrée au bundle web au
# moment du build (voir web/README.md), donc à définir AVANT :
VITE_API_BASE_URL=https://api.exemple.cd npm run build --workspace=web

cd desktop/src-tauri
cargo tauri build
```

Produit un installateur natif pour la plateforme courante
(`.deb`/`.AppImage` sur Linux, `.msi`/`.exe` sur Windows, `.dmg`/`.app`
sur macOS) dans `desktop/src-tauri/target/release/bundle/`. Impossible
de construire les 3 depuis un seul poste (chaque plateforme a besoin de
son propre toolchain natif) — voir
`.github/workflows/desktop-dashboard-build.yml`, qui les construit en
parallèle sur les runners GitHub correspondants (déclenchement manuel,
onglet "Actions" du dépôt).

## Icône

`icons/` est généré depuis le logo IGE (`shared/assets/branding/`) via
`cargo tauri icon <chemin-vers-un-logo-carré>` — à régénérer si le logo
change (voir la commande dans l'historique de ce fichier ou la
documentation Tauri sur `tauri icon`).

## Sécurité — CSP désactivée

`app.security.csp` est à `null` : cette application est volontairement
une coquille fine sans logique propre, et l'URL de l'API backend
(intégrée à `web/dist` au moment du build, potentiellement différente
d'un déploiement à l'autre) ne peut pas être connue à l'avance pour une
CSP stricte. À durcir (lister explicitement l'origine de l'API) avant un
déploiement à grande échelle si cela devient une préoccupation.

## Ce qui n'est pas couvert par cette itération

- **Auto-mise à jour** (`tauri-plugin-updater`) — chaque nouvelle version
  nécessite pour l'instant une réinstallation manuelle.
- **Signature de code** (Windows Authenticode / macOS notarization) —
  les installateurs générés par le workflow CI ne sont pas signés ;
  les systèmes d'exploitation afficheront un avertissement "éditeur non
  vérifié" à l'installation, comme pour l'APK Android (voir
  `mobile/scripts/README.md`) pendant le pilote.
