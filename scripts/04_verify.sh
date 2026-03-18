#!/bin/bash
###############################################################################
#  LogiRent – Etape 4 : Verifications finales
#  ============================================
#  Verifie que tout fonctionne apres migration.
#  NE necessite PAS sudo.
#
#  USAGE:
#    ./04_verify.sh
###############################################################################

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_DIR/backend/.env"

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

CHECKS_OK=0
CHECKS_FAIL=0

ok()   { echo -e "  ${GREEN}[PASS]${NC} $1"; CHECKS_OK=$((CHECKS_OK+1)); }
fail() { echo -e "  ${RED}[FAIL]${NC} $1"; CHECKS_FAIL=$((CHECKS_FAIL+1)); }

echo ""
echo -e "${BLUE}══════════════════════════════════════════${NC}"
echo -e "${BLUE}  ETAPE 4 : Verifications finales${NC}"
echo -e "${BLUE}══════════════════════════════════════════${NC}"
echo ""

# 1. Config .env
echo "  [1/6] Configuration .env..."
if grep -q "mongodb://localhost" "$ENV_FILE" 2>/dev/null; then
    ok "MONGO_URL pointe vers localhost"
else
    fail "MONGO_URL ne pointe pas vers localhost"
    echo "       Lancez d'abord: ./03_update_env.sh"
fi

# 2. MongoDB local accessible
echo "  [2/6] MongoDB local..."
python3 -c "
from pymongo import MongoClient
c = MongoClient('mongodb://localhost:27017', serverSelectionTimeoutMS=3000)
c.admin.command('ping')
print('OK')
c.close()
" 2>/dev/null | {
    read result
    if [ "$result" = "OK" ]; then
        ok "MongoDB local repond"
    else
        fail "MongoDB local ne repond pas"
    fi
}

# 3. Collections et documents
echo "  [3/6] Donnees en base..."
python3 -c "
from pymongo import MongoClient
c = MongoClient('mongodb://localhost:27017')
db = c['logirent']
cols = db.list_collection_names()
total = sum(db[col].count_documents({}) for col in cols)
print(f'{len(cols)} collections, {total} documents')
if total >= 50:
    print('PASS')
else:
    print('INSUFFICIENT')
c.close()
" 2>/dev/null | {
    read line1
    read line2
    echo "       $line1"
    if [ "$line2" = "PASS" ]; then
        ok "Donnees suffisantes"
    else
        fail "Donnees insuffisantes (< 50 documents)"
    fi
}

# 4. Backend API
echo "  [4/6] Backend API..."
BACKEND_URL="http://localhost:8001"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/vehicles" 2>/dev/null)
if [ "$HTTP_CODE" = "200" ]; then
    ok "GET /api/vehicles repond (HTTP $HTTP_CODE)"
else
    fail "Backend ne repond pas (HTTP $HTTP_CODE)"
    echo "       Redemarrez: pm2 restart logirent-backend"
fi

# 5. Login admin
echo "  [5/6] Login admin..."
LOGIN_RESULT=$(curl -s -X POST "$BACKEND_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin-geneva@logirent.ch","password":"LogiRent2024!"}' 2>/dev/null \
    | python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('user',{}).get('role','FAIL'))" 2>/dev/null)
if [ "$LOGIN_RESULT" = "admin" ]; then
    ok "Login admin fonctionne (role: admin)"
else
    fail "Login admin echoue (resultat: $LOGIN_RESULT)"
fi

# 6. Vehicules charges
echo "  [6/6] Vehicules..."
VEH_COUNT=$(curl -s "$BACKEND_URL/api/vehicles" 2>/dev/null \
    | python3 -c "import sys,json;print(len(json.load(sys.stdin)))" 2>/dev/null)
if [ "$VEH_COUNT" -gt 0 ] 2>/dev/null; then
    ok "$VEH_COUNT vehicules charges"
else
    fail "Aucun vehicule"
fi

# Resume
echo ""
echo -e "${BLUE}══════════════════════════════════════════${NC}"
TOTAL=$((CHECKS_OK + CHECKS_FAIL))
if [ $CHECKS_FAIL -eq 0 ]; then
    echo -e "${GREEN}  RESULTAT: $CHECKS_OK/$TOTAL verifications OK${NC}"
    echo ""
    echo -e "${GREEN}  Migration REUSSIE!${NC}"
    echo "  Votre application utilise maintenant MongoDB local."
else
    echo -e "${YELLOW}  RESULTAT: $CHECKS_OK OK, $CHECKS_FAIL ECHECS${NC}"
    echo ""
    echo "  Corrigez les erreurs ci-dessus avant de continuer."
fi
echo -e "${BLUE}══════════════════════════════════════════${NC}"
echo ""

exit $CHECKS_FAIL
