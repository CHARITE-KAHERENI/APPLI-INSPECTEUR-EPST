#!/usr/bin/env bash
# Copie les configurations JSON de shared/src/form-templates vers
# mobile/assets/form-templates, car Flutter ne peut déclarer comme "asset"
# que des fichiers situés dans le répertoire du projet mobile.
#
# À exécuter après toute modification de shared/src/form-templates/*.json.
# À terme, le mobile pourra aussi récupérer les templates dynamiquement
# depuis l'API backend (GET /form-templates) plutôt que de les embarquer.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC_DIR="$ROOT_DIR/shared/src/form-templates"
DEST_DIR="$ROOT_DIR/mobile/assets/form-templates"

mkdir -p "$DEST_DIR"
cp "$SRC_DIR"/*.json "$DEST_DIR"/

echo "✓ Templates synchronisés vers $DEST_DIR"
