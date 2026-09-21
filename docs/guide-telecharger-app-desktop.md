# Récupérer l'installateur Windows (ou macOS) — c3-digital

*(Version imprimable/visuelle : `docs/guide-telecharger-app-desktop.html`)*

Je ne peux pas transmettre de fichier `.exe`/`.msi` directement dans la
conversation : il doit être **construit sur un ordinateur Windows**, et
mon environnement de développement n'en a pas. GitHub, lui, en a — ce
guide explique comment lui demander de le construire à votre place
(gratuitement), puis où récupérer le résultat.

Deux applications distinctes, chacune avec son propre workflow :

| Application                         | Workflow GitHub Actions            |
| ------------------------------------ | ------------------------------------ |
| Saisie de terrain (comme le mobile) | `desktop-build.yml`                  |
| Tableau de bord IGE (comme le web)  | `desktop-dashboard-build.yml`        |

## 1. Activer la construction automatique (une seule fois)

Sur [github.com/CHARITE-KAHERENI/APPLI-INSPECTEUR-EPST/settings/actions](https://github.com/CHARITE-KAHERENI/APPLI-INSPECTEUR-EPST/settings/actions) :
choisir **"Allow all actions and reusable workflows"**, puis **Save**.

## 2. Lancer la construction

Onglet [**Actions**](https://github.com/CHARITE-KAHERENI/APPLI-INSPECTEUR-EPST/actions)
→ cliquer le nom du workflow voulu dans la liste à gauche → bouton
**"Run workflow"** (menu déroulant en haut à droite de la liste des
exécutions) → **"Run workflow"** à nouveau pour confirmer.

Compter **5 à 15 minutes** : la construction recompile l'application
pour Windows, macOS et Linux en même temps. Un rond orange tourne
pendant ce temps ; il devient une coche verte ✓ une fois terminé.

## 3. Télécharger le résultat

Cliquer sur l'exécution terminée pour l'ouvrir, descendre tout en bas
de la page jusqu'à la section **"Artifacts"**, puis cliquer sur celui
dont le nom contient **"windows"** pour télécharger un fichier `.zip`.

## 4. Installer sur Windows

Décompresser le `.zip`, puis ouvrir le fichier `.msi` ou `.exe` qu'il
contient. Windows affichera probablement *"Windows a protégé votre
ordinateur"* — l'installateur n'est pas encore signé numériquement
(comme l'APK Android pendant le pilote, voir
`mobile/scripts/README.md`). Cliquer **"Informations complémentaires"**
puis **"Exécuter quand même"** pour continuer.
