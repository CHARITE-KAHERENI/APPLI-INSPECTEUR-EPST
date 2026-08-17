# APK Android signé — distribution pilote (PROMPT 9)

Pipeline pour générer un **APK signé**, distribué directement aux
inspecteurs pilotes de Butembo (fichier `.apk` partagé, en dehors du
Play Store dans un premier temps — pas de publication ni de compte
développeur Google requis pour cette étape).

Ces étapes supposent que `flutter create .` a déjà été exécuté (voir
`mobile/README.md`, section "Étape requise avant le premier build") : le
dossier `android/` doit exister avant de commencer.

## 1. Générer le keystore d'upload (une seule fois)

```bash
./mobile/scripts/generate-keystore.sh
```

Crée `mobile/scripts/c3-digital-upload.jks`, interactif (mot de passe du
keystore + de la clé, identité du certificat — les valeurs n'ont pas
besoin d'être exactes pour un usage pilote interne, mais **le mot de
passe doit être fort et conservé** : sans lui, impossible de publier une
mise à jour signée avec la même identité). **Ne jamais committer ce
fichier** (déjà exclu par `.gitignore` à la racine, motif `*.jks`) — le
garder dans un gestionnaire de mots de passe / stockage sécurisé de
l'équipe.

## 2. Configurer `key.properties`

```bash
cp mobile/scripts/key.properties.example mobile/android/key.properties
```

Éditer `mobile/android/key.properties` et renseigner les mots de passe
choisis à l'étape 1. Ce fichier est également exclu de Git.

## 3. Déclarer la signature dans Gradle

Ajouter dans `mobile/android/app/build.gradle` (généré par `flutter
create .`), le chargement de `key.properties` et le `signingConfig` de
la variante `release` :

```gradle
// En haut du fichier, avant le bloc android { ... } :
def keystorePropertiesFile = rootProject.file('key.properties')
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    // ... configuration existante (compileSdk, defaultConfig, etc.) ...

    signingConfigs {
        release {
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
            storeFile keystoreProperties['storeFile'] ? file(keystoreProperties['storeFile']) : null
            storePassword keystoreProperties['storePassword']
        }
    }

    buildTypes {
        release {
            // Remplace la signature "debug" par défaut de flutter create.
            signingConfig signingConfigs.release
        }
    }
}
```

(Si `mobile/android/app/build.gradle.kts` — syntaxe Kotlin DSL — est
généré à la place, adapter la même logique : `val keystoreProperties =
Properties()`, `keystorePropertiesFile.inputStream().use { ... }`, etc.
La structure des blocs `signingConfigs`/`buildTypes` est identique.)

## 4. Construire l'APK

```bash
./mobile/scripts/build-release-apk.sh https://api-pilote-butembo.exemple.cd
```

Le paramètre est l'URL publique de l'API backend (voir
`backend/README.md`, section "Déploiement (Docker)") — intégrée à l'APK
au moment du build via `--dart-define=C3_DIGITAL_API_BASE_URL=...` (voir
`lib/core/api/api_config.dart`). Sans paramètre, une valeur d'exemple est
utilisée ; **toujours repasser l'URL réelle du serveur pilote**, jamais
`10.0.2.2` (alias local de l'émulateur, utilisé seulement en
développement).

Résultat : `mobile/build/app/outputs/flutter-apk/app-release.apk`.

## 5. Distribution (hors Play Store)

Pour un pilote de quelques inspecteurs à Butembo, la distribution la
plus simple :

- Transmettre `app-release.apk` directement (clé USB, lien de partage de
  fichier, ou message WhatsApp/e-mail si la taille le permet).
- Sur chaque appareil Android, autoriser l'installation depuis
  "Sources inconnues" (Android < 8) ou "Installer des applications
  inconnues" pour l'application utilisée pour transférer le fichier
  (Android 8+), puis ouvrir l'APK pour l'installer.
- Vérifier l'intégrité si besoin via la somme de contrôle SHA-256 du
  fichier (`sha256sum app-release.apk`), à comparer avant installation.

Une distribution plus outillée (Firebase App Distribution, TestFlight
pour iOS, ou publication Play Store en piste interne) pourra remplacer
cette étape une fois le pilote validé — hors périmètre de cette
itération.

## Résumé des fichiers

| Fichier                                    | Committé ? | Rôle                                          |
| ------------------------------------------- | ---------- | ---------------------------------------------- |
| `generate-keystore.sh`                      | oui        | Génère le `.jks` (une fois, en local)          |
| `key.properties.example`                    | oui        | Modèle à copier vers `android/key.properties`  |
| `build-release-apk.sh`                      | oui        | `flutter build apk --release` signé            |
| `c3-digital-upload.jks` *(généré, étape 1)* | **non**    | Clé de signature — secret                      |
| `../android/key.properties` *(étape 2)*     | **non**    | Mots de passe — secret                         |
