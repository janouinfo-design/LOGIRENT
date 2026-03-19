#!/bin/bash
###############################################################################
#  LogiRent – Etape 3 : Basculer backend/.env vers MongoDB local
#  ==============================================================
#  Modifie MONGO_URL et DB_NAME dans backend/.env avec CONFIRMATION.
#  Cree un backup du .env avant modification.
#  NE necessite PAS sudo.
#
#  USAGE:
#    ./03_update_env.sh
###############################################################################

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_DIR/backend/.env"
BACKUP_DIR="$SCRIPT_DIR/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo -e "${BLUE}══════════════════════════════════════════════${NC}"
echo -e "${BLUE}  ETAPE 3 : Basculer .env vers MongoDB local${NC}"
echo -e "${BLUE}══════════════════════════════════════════════${NC}"
echo ""

# Verifier que le .env existe
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}[ERREUR]${NC} Fichier non trouve: $ENV_FILE"
    exit 1
fi

# Afficher la config actuelle
echo -e "  ${BLUE}Configuration actuelle:${NC}"
echo "  ─────────────────────────────────"
CURRENT_MONGO=$(grep "^MONGO_URL" "$ENV_FILE" | head -1)
CURRENT_DB=$(grep "^DB_NAME" "$ENV_FILE" | head -1)
echo "    $CURRENT_MONGO"
echo "    $CURRENT_DB"
echo ""

# Afficher ce qui va changer
echo -e "  ${YELLOW}Modification proposee:${NC}"
echo "  ─────────────────────────────────"
echo "    MONGO_URL=mongodb://localhost:27017"
echo "    DB_NAME=logirent"
echo ""

# Demander confirmation
echo -ne "  Appliquer ces modifications? (oui/non): "
read -r CONFIRM
if [ "$CONFIRM" != "oui" ]; then
    echo ""
    echo "  Annule. Aucune modification effectuee."
    echo "  Vous pouvez modifier manuellement: nano $ENV_FILE"
    exit 0
fi

# Backup
mkdir -p "$BACKUP_DIR"
cp "$ENV_FILE" "$BACKUP_DIR/env_backup_$TIMESTAMP.env"
echo -e "  ${GREEN}[OK]${NC} Backup: $BACKUP_DIR/env_backup_$TIMESTAMP.env"

# Appliquer les modifications
if grep -q "^MONGO_URL" "$ENV_FILE"; then
    sed -i 's|^MONGO_URL=.*|MONGO_URL=mongodb://localhost:27017|' "$ENV_FILE"
else
    echo 'MONGO_URL=mongodb://localhost:27017' >> "$ENV_FILE"
fi

if grep -q "^DB_NAME" "$ENV_FILE"; then
    sed -i 's|^DB_NAME=.*|DB_NAME=logirent|' "$ENV_FILE"
else
    echo 'DB_NAME=logirent' >> "$ENV_FILE"
fi

echo -e "  ${GREEN}[OK]${NC} .env mis a jour"

# Afficher la config finale
echo ""
echo -e "  ${GREEN}Configuration active:${NC}"
echo "  ─────────────────────────────────"
grep -E "^(MONGO_URL|DB_NAME)" "$ENV_FILE" | while read line; do
    echo "    $line"
done

echo ""
echo -e "${GREEN}  .env bascule vers MongoDB local.${NC}"
echo ""
echo "  Prochaine etape: redemarrer le backend"
echo "    ./scripts/backend.sh restart"
echo ""
echo "  Puis verifier:"
echo "    ./04_verify.sh"
echo ""
echo "  Pour revenir en arriere:"
echo "    cp $BACKUP_DIR/env_backup_$TIMESTAMP.env $ENV_FILE"
echo "    ./scripts/backend.sh restart"
echo ""
