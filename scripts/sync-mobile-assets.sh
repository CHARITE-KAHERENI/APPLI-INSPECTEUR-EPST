#!/usr/bin/env bash
# Copie les configurations JSON de shared/forms vers
# mobile/assets/form-templates, et le logo IGE partagé vers
# mobile/assets/branding, car Flutter ne peut déclarer comme "asset" que
# des fichiers situés dans le répertoire du projet mobile.
#
# À exécuter après toute modification de shared/forms/*.json ou de
# shared/assets/branding/ige-logo.png.
# À terme, le mobile pourra aussi récupérer les templates dynamiquement
# depuis l'API backend (GET /form-templates) plutôt que de les embarquer.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

TEMPLATES_SRC="$ROOT_DIR/shared/forms"
TEMPLATES_DEST="$ROOT_DIR/mobile/assets/form-templates"
mkdir -p "$TEMPLATES_DEST"
cp "$TEMPLATES_SRC"/*.json "$TEMPLATES_DEST"/
echo "✓ Templates synchronisés vers $TEMPLATES_DEST"

LOGO_SRC="$ROOT_DIR/shared/assets/branding/ige-logo.png"
LOGO_DEST="$ROOT_DIR/mobile/assets/branding/ige_logo.png"
mkdir -p "$(dirname "$LOGO_DEST")"
cp "$LOGO_SRC" "$LOGO_DEST"
echo "✓ Logo synchronisé vers $LOGO_DEST"

BACKEND_LOGO_DEST="$ROOT_DIR/backend/src/modules/pdf/assets/ige-logo.png"
mkdir -p "$(dirname "$BACKEND_LOGO_DEST")"
cp "$LOGO_SRC" "$BACKEND_LOGO_DEST"
echo "✓ Logo synchronisé vers $BACKEND_LOGO_DEST"
