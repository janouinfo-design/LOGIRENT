#!/bin/bash
###############################################################################
#  LogiRent – Rollback : Restaurer la configuration Atlas
#  =======================================================
#  IMPORTANT: Ce script restaure UNIQUEMENT le fichier .env.
#
#  CE QU'IL FAIT:
#    - Restaure le backup .env le plus recent → backend/.env
#    - Redemarre le backend via PM2
#    - Le backend pointe a nouveau vers Atlas
#
#  CE QU'IL NE FAIT PAS:
#    - Il ne supprime PAS les donnees de la base MongoDB locale.
#      Ces donnees restent dans MongoDB local et ne genent pas.
#    - Il ne desinstalle PAS MongoDB.
#
#  POURQUOI:
#    La base locale est une COPIE. Les donnees originales sur Atlas
#    n'ont jamais ete modifiees par la migration. Il suffit donc de
#    repointer le backend vers Atlas pour revenir a l'etat initial.
#
#  SI VOUS VOULEZ NETTOYER LA BASE LOCALE:
#    mongosh logirent --eval "db.dropDatabase()"
#
#  USAGE:
#    ./rollback.sh
###############################################################################

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_DIR/backend/.env"
BACKUP_DIR="$SCRIPT_DIR/backups"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo -e "${YELLOW}══════════════════════════════════════${NC}"
echo -e "${YELLOW}  ROLLBACK – Restauration vers Atlas${NC}"
echo -e "${YELLOW}══════════════════════════════════════${NC}"
echo ""

# Trouver le dernier backup
LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/env_backup_*.env 2>/dev/null | head -1)

if [ -z "$LATEST_BACKUP" ]; then
    echo -e "${RED}[ERREUR]${NC} Aucun backup .env trouve dans $BACKUP_DIR"
    echo ""
    echo "  Vous pouvez restaurer manuellement:"
    echo "    nano $ENV_FILE"
    echo "    # Remplacez MONGO_URL par votre URL Atlas"
    exit 1
fi

echo "  Backup trouve: $LATEST_BACKUP"
echo ""

# Afficher le contenu du backup
echo "  Contenu du backup:"
echo "  ─────────────────────────────────"
grep -E "^(MONGO_URL|DB_NAME)" "$LATEST_BACKUP" | while read line; do
    echo "    $line"
done
echo ""

echo "  Ce rollback va:"
echo "    1. Restaurer backend/.env depuis le backup"
echo "    2. Le backend pointera a nouveau vers Atlas"
echo "    3. Les donnees locales MongoDB NE seront PAS supprimees"
echo ""
echo -ne "  Confirmer le rollback? (oui/non): "
read -r CONFIRM
if [ "$CONFIRM" != "oui" ]; then
    echo "  Annule."
    exit 0
fi

# Restaurer
cp "$LATEST_BACKUP" "$ENV_FILE"
echo -e "  ${GREEN}[OK]${NC} .env restaure"

# Redemarrer backend
ROLLBACK_SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [ -x "$ROLLBACK_SCRIPT_DIR/backend.sh" ]; then
    "$ROLLBACK_SCRIPT_DIR/backend.sh" restart
else
    if command -v pm2 &>/dev/null; then
        pm2 restart logirent-backend 2>/dev/null && echo -e "  ${GREEN}[OK]${NC} Backend redemarre" || echo -e "  ${YELLOW}[ATTENTION]${NC} Redemarrez manuellement: ./scripts/backend.sh restart"
    else
        echo -e "  ${YELLOW}[INFO]${NC} Redemarrez le backend: ./scripts/backend.sh restart"
    fi
fi

echo ""
echo -e "${GREEN}  ROLLBACK TERMINE${NC}"
echo "  Le backend utilise a nouveau la base Atlas."
echo ""
echo "  Pour nettoyer la base locale (optionnel):"
echo "    mongosh logirent --eval 'db.dropDatabase()'"
echo ""
