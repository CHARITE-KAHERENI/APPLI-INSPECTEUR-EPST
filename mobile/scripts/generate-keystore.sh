#!/usr/bin/env bash
# Génère le keystore d'upload Android utilisé pour signer l'APK pilote
# c3-digital (PROMPT 9, point 2 — voir mobile/scripts/README.md pour le
# détail des étapes suivantes). À exécuter UNE SEULE FOIS : conservez
# précieusement le fichier .jks et son mot de passe (ils sont nécessaires
# pour toute mise à jour future signée avec la même identité).
#
# Usage :
#   ./mobile/scripts/generate-keystore.sh
#
# Nécessite `keytool` (fourni avec le JDK).
set -euo pipefail

cd "$(dirname "$0")"

KEYSTORE_FILE="c3-digital-upload.jks"
KEY_ALIAS="c3digital"

if [ -f "$KEYSTORE_FILE" ]; then
  echo "Erreur : $KEYSTORE_FILE existe déjà — ne pas régénérer un keystore existant" \
       "(cela invaliderait la signature des versions déjà distribuées)." >&2
  exit 1
fi

echo "Génération du keystore d'upload ($KEYSTORE_FILE, alias $KEY_ALIAS)."
echo "Choisissez un mot de passe robuste et notez-le : il sera nécessaire dans"
echo "mobile/android/key.properties (voir mobile/scripts/key.properties.example) et à"
echo "chaque reconstruction de l'application."
echo

keytool -genkeypair \
  -v \
  -keystore "$KEYSTORE_FILE" \
  -alias "$KEY_ALIAS" \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

echo
echo "OK — $KEYSTORE_FILE créé dans mobile/scripts/."
echo "NE JAMAIS committer ce fichier (voir .gitignore à la racine — *.jks est ignoré)."
echo "Étape suivante : copier mobile/scripts/key.properties.example vers"
echo "mobile/android/key.properties et le compléter (voir mobile/scripts/README.md)."
