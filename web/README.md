# @c3-digital/web

Application web du projet **c3-digital** (React 19 + Vite), destinée aux
chefs d'établissement et à l'administration de l'IGE pour consulter et
gérer les formulaires d'inspection en ligne.

Scaffoldée avec `npm create vite@latest -- --template react-ts`. Consomme
le modèle partagé `@c3-digital/shared` (types + JSON Schema des
formulaires C2/C3/C3B/C3M/C3_DAS).

## Démarrage

```bash
npm install      # depuis la racine du monorepo (workspaces)
npm run dev --workspace=web
```

L'interface de saisie/consultation des formulaires n'est pas encore
implémentée (prévue dans une prochaine itération) ; ce workspace ne
contient pour l'instant que le scaffold Vite + la connexion au modèle
partagé.

---

<details>
<summary>Notes du template Vite d'origine</summary>

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

### React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

### Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

</details>
