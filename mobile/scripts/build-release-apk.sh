#!/usr/bin/env bash
# Construit l'APK Android signé de c3-digital pour la distribution pilote
# (PROMPT 9, point 2 — hors Play Store dans un premier temps : partage
# direct du fichier .apk aux inspecteurs pilotes de Butembo). Voir
# mobile/scripts/README.md pour la mise en place complète (keystore,
# key.properties, signingConfig Gradle) avant le premier lancement.
#
# Usage :
#   ./mobile/scripts/build-release-apk.sh [URL_API]
#
# URL_API (optionnel) : URL publique de l'API backend à intégrer dans
# l'APK (voir lib/core/api/api_config.dart, C3_DIGITAL_API_BASE_URL).
# Par défaut, celle du pilote Butembo (à ajuster une fois l'hébergement
# réel connu — voir backend/README.md, section "Déploiement").
set -euo pipefail

cd "$(dirname "$0")/.."

API_BASE_URL="${1:-https://api-pilote-butembo.exemple.cd}"

if [ ! -d android ]; then
  echo "Erreur : mobile/android/ est introuvable. Exécutez d'abord :" >&2
  echo "  flutter create . --project-name c3_digital --platforms=android,ios --org cd.gouv.ige" >&2
  exit 1
fi

if [ ! -f android/key.properties ]; then
  echo "Erreur : mobile/android/key.properties est introuvable." >&2
  echo "Copiez mobile/scripts/key.properties.example et complétez-le" \
       "(voir mobile/scripts/README.md)." >&2
  exit 1
fi

echo "Construction de l'APK release — API : $API_BASE_URL"

flutter pub get
flutter build apk \
  --release \
  --dart-define=C3_DIGITAL_API_BASE_URL="$API_BASE_URL"

OUT="build/app/outputs/flutter-apk/app-release.apk"
echo
echo "OK — APK signé généré : mobile/$OUT"
echo "Distribution pilote : transmettre ce fichier directement aux appareils" \
     "des inspecteurs (activer \"Sources inconnues\"/\"Installer des" \
     "applications inconnues\" sur l'appareil Android) — voir" \
     "mobile/scripts/README.md, section \"Distribution\"."
