#!/bin/bash
###############################################################################
#  LogiRent – Etape 2 : Migration des donnees Atlas -> Local
#  ==========================================================
#  Wrapper qui lance migrate_to_local.py avec le bon environnement.
#  NE necessite PAS sudo.
#
#  PREREQUIS:
#    1. MongoDB local installe (01_install_mongodb.sh)
#    2. scripts/migration.env rempli avec ATLAS_URL
#
#  USAGE:
#    ./02_migrate_data.sh
###############################################################################

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo -e "${BLUE}══════════════════════════════════════════${NC}"
echo -e "${BLUE}  ETAPE 2 : Migration Atlas -> Local${NC}"
echo -e "${BLUE}══════════════════════════════════════════${NC}"
echo ""

# Verifier migration.env
if [ ! -f "$SCRIPT_DIR/migration.env" ]; then
    echo -e "${RED}[ERREUR]${NC} Fichier migration.env introuvable!"
    echo ""
    echo "  Creez-le a partir du template:"
    echo "    cp $SCRIPT_DIR/migration.env.example $SCRIPT_DIR/migration.env"
    echo "    nano $SCRIPT_DIR/migration.env"
    echo ""
    echo "  Remplissez ATLAS_URL avec votre URL MongoDB Atlas."
    exit 1
fi

# Verifier que ATLAS_URL n'est pas le placeholder
if grep -q "VOTRE_USER" "$SCRIPT_DIR/migration.env" 2>/dev/null; then
    echo -e "${RED}[ERREUR]${NC} migration.env contient encore le placeholder!"
    echo "  Editez: nano $SCRIPT_DIR/migration.env"
    echo "  Remplacez VOTRE_USER et VOTRE_PASSWORD par vos vrais credentials Atlas."
    exit 1
fi

# Activer venv si disponible
if [ -f "$PROJECT_DIR/backend/venv/bin/activate" ]; then
    source "$PROJECT_DIR/backend/venv/bin/activate"
    echo -e "  ${GREEN}[OK]${NC} Venv Python active"
fi

# Installer dependances
pip install pymongo dnspython bcrypt > /dev/null 2>&1
echo -e "  ${GREEN}[OK]${NC} Dependances Python OK"

# Lancer la migration
echo ""
python3 "$SCRIPT_DIR/migrate_to_local.py"
EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}  Migration terminee avec succes!${NC}"
    echo ""
    echo "  Prochaine etape:"
    echo "    ./03_update_env.sh"
else
    echo -e "${RED}  Migration echouee (code: $EXIT_CODE)${NC}"
    echo "  Verifiez les erreurs ci-dessus."
fi

exit $EXIT_CODE
