#!/bin/bash
###############################################################################
#  LogiRent – Verification de coherence du deploiement
#  =====================================================
#  Compare la version locale (VPS) avec GitHub pour detecter les ecarts.
#
#  USAGE:
#    ./check_deploy.sh                    # Verification complete
#    ./check_deploy.sh --version-only     # Juste afficher la version
#
#  A LANCER APRES CHAQUE git pull / deploiement pour s'assurer que
#  le code en production correspond bien a la derniere version GitHub.
###############################################################################

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

CHECKS_OK=0
CHECKS_FAIL=0
CHECKS_WARN=0

ok()   { echo -e "  ${GREEN}[OK]${NC} $1"; CHECKS_OK=$((CHECKS_OK+1)); }
fail() { echo -e "  ${RED}[ERREUR]${NC} $1"; CHECKS_FAIL=$((CHECKS_FAIL+1)); }
warn() { echo -e "  ${YELLOW}[ATTENTION]${NC} $1"; CHECKS_WARN=$((CHECKS_WARN+1)); }

echo ""
echo -e "${BLUE}══════════════════════════════════════════${NC}"
echo -e "${BLUE}  LOGIRENT – Verification du deploiement${NC}"
echo -e "${BLUE}══════════════════════════════════════════${NC}"

# ==================== 1. VERSION GIT ====================
echo ""
echo -e "  ${BLUE}[1] Version du code${NC}"
cd "$PROJECT_DIR"
LOCAL_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "inconnu")
LOCAL_DATE=$(git log -1 --format="%ci" 2>/dev/null || echo "inconnu")
LOCAL_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "inconnu")
UNCOMMITTED=$(git status --porcelain 2>/dev/null | wc -l)

echo "    Branche: $LOCAL_BRANCH"
echo "    Commit:  $LOCAL_HASH"
echo "    Date:    $LOCAL_DATE"

if [ "$UNCOMMITTED" -gt 0 ]; then
    warn "$UNCOMMITTED fichiers modifies non commites"
    git status --porcelain 2>/dev/null | head -5 | while read line; do
        echo "      $line"
    done
else
    ok "Pas de modifications non commitees"
fi

# Verifier si on est a jour avec origin
git fetch origin --quiet 2>/dev/null
BEHIND=$(git rev-list HEAD..origin/$LOCAL_BRANCH --count 2>/dev/null || echo "?")
if [ "$BEHIND" = "0" ]; then
    ok "A jour avec GitHub"
elif [ "$BEHIND" = "?" ]; then
    warn "Impossible de verifier la synchronisation GitHub"
else
    fail "$BEHIND commits en retard sur GitHub"
    echo "       Executez: git pull origin $LOCAL_BRANCH"
fi

if [ "$1" = "--version-only" ]; then
    echo ""
    exit 0
fi

# ==================== 2. FICHIERS .env ====================
echo ""
echo -e "  ${BLUE}[2] Configuration .env${NC}"

# Backend .env
if [ -f "$PROJECT_DIR/backend/.env" ]; then
    ok "backend/.env present"

    # Verifier variables critiques
    for VAR in MONGO_URL DB_NAME JWT_SECRET; do
        VAL=$(grep "^$VAR=" "$PROJECT_DIR/backend/.env" | cut -d'=' -f2-)
        if [ -z "$VAL" ]; then
            fail "$VAR manquant dans backend/.env"
        fi
    done

    # Verifier pas de contamination
    if grep -q "rentdrive" "$PROJECT_DIR/backend/.env"; then
        fail "backend/.env contient 'rentdrive' (contamination)"
    fi
    if grep -q "contact@logitrak" "$PROJECT_DIR/backend/.env"; then
        fail "SENDER_EMAIL pointe vers logitrak (contamination)"
    fi
    if grep -q "test_database" "$PROJECT_DIR/backend/.env"; then
        fail "DB_NAME = test_database (mauvaise base)"
    fi
else
    fail "backend/.env ABSENT"
fi

# Frontend .env
if [ -f "$PROJECT_DIR/frontend/.env" ]; then
    ok "frontend/.env present"
    if grep -q "EXPO_PUBLIC_BACKEND_URL" "$PROJECT_DIR/frontend/.env"; then
        BACKEND_URL=$(grep "EXPO_PUBLIC_BACKEND_URL" "$PROJECT_DIR/frontend/.env" | cut -d'=' -f2-)
        echo "       EXPO_PUBLIC_BACKEND_URL=$BACKEND_URL"
    else
        warn "EXPO_PUBLIC_BACKEND_URL absent de frontend/.env"
    fi
else
    warn "frontend/.env absent (utilise les valeurs par defaut)"
fi

# ==================== 3. SERVICES ====================
echo ""
echo -e "  ${BLUE}[3] Services actifs${NC}"

# MongoDB
if mongosh --quiet --eval "db.runCommand({ping:1}).ok" 2>/dev/null | grep -q "1"; then
    ok "MongoDB local actif"
elif mongo --quiet --eval "db.runCommand({ping:1}).ok" 2>/dev/null | grep -q "1"; then
    ok "MongoDB local actif (ancien client)"
else
    fail "MongoDB local inactif"
fi

# Backend API
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:8001/api/version" 2>/dev/null)
if [ "$HTTP_CODE" = "200" ]; then
    ok "Backend API repond"
    # Afficher la version du backend
    VERSION_INFO=$(curl -s "http://localhost:8001/api/version" 2>/dev/null)
    API_HASH=$(echo "$VERSION_INFO" | python3 -c "import sys,json;print(json.load(sys.stdin).get('git_commit','?'))" 2>/dev/null)
    API_DB=$(echo "$VERSION_INFO" | python3 -c "import sys,json;print(json.load(sys.stdin).get('db_name','?'))" 2>/dev/null)
    echo "       Backend commit: $API_HASH | DB: $API_DB"

    if [ "$API_HASH" != "$LOCAL_HASH" ] && [ "$API_HASH" != "unknown" ]; then
        warn "Commit backend ($API_HASH) != code local ($LOCAL_HASH)"
        echo "       Le backend a peut-etre besoin d'un redemarrage"
    fi
else
    fail "Backend API ne repond pas (HTTP $HTTP_CODE)"
fi

# PM2
if command -v pm2 &>/dev/null; then
    PM2_STATUS=$(pm2 jlist 2>/dev/null | python3 -c "
import sys,json
try:
    procs = json.load(sys.stdin)
    for p in procs:
        if 'logirent' in p.get('name','').lower():
            print(f\"found:{p['name']}:{p.get('pm2_env',{}).get('status','?')}\")
except: pass
" 2>/dev/null)
    if echo "$PM2_STATUS" | grep -q "found:"; then
        STATUS=$(echo "$PM2_STATUS" | cut -d: -f3)
        NAME=$(echo "$PM2_STATUS" | cut -d: -f2)
        if [ "$STATUS" = "online" ]; then
            ok "PM2: $NAME est $STATUS"
        else
            fail "PM2: $NAME est $STATUS"
        fi
    else
        warn "Aucun process 'logirent' dans PM2"
    fi
else
    warn "PM2 non installe"
fi

# ==================== 4. DONNEES ====================
echo ""
echo -e "  ${BLUE}[4] Donnees en base${NC}"

python3 -c "
from pymongo import MongoClient
c = MongoClient('mongodb://localhost:27017', serverSelectionTimeoutMS=3000)
db = c['logirent']
users = db.users.count_documents({})
vehicles = db.vehicles.count_documents({})
reservations = db.reservations.count_documents({})
agencies = db.agencies.count_documents({})
logitrak = db.users.count_documents({'email': {'\$regex': 'logitrak', '\$options': 'i'}})
test = db.users.count_documents({'\$or': [{'email': {'\$regex': '@test\\.'}}, {'email': {'\$regex': '@example\\.'}}]})
print(f'{agencies}|{users}|{vehicles}|{reservations}|{logitrak}|{test}')
c.close()
" 2>/dev/null | {
    IFS='|' read agencies users vehicles reservations logitrak test
    echo "    Agences: $agencies | Users: $users | Vehicules: $vehicles | Reservations: $reservations"

    if [ "$logitrak" -gt 0 ] 2>/dev/null; then
        echo -e "  ${RED}[ERREUR]${NC} $logitrak comptes LogiTrak encore presents!"
    fi
    if [ "$test" -gt 0 ] 2>/dev/null; then
        echo -e "  ${RED}[ERREUR]${NC} $test comptes de test encore presents!"
    fi
    if [ "$logitrak" = "0" ] && [ "$test" = "0" ]; then
        echo -e "  ${GREEN}[OK]${NC} Zero contamination dans les donnees"
    fi
}

# ==================== RESUME ====================
echo ""
echo -e "${BLUE}══════════════════════════════════════════${NC}"
TOTAL=$((CHECKS_OK + CHECKS_FAIL + CHECKS_WARN))
if [ $CHECKS_FAIL -eq 0 ] && [ $CHECKS_WARN -eq 0 ]; then
    echo -e "${GREEN}  DEPLOIEMENT OK: $CHECKS_OK/$TOTAL verifications passees${NC}"
elif [ $CHECKS_FAIL -eq 0 ]; then
    echo -e "${YELLOW}  DEPLOIEMENT OK avec $CHECKS_WARN avertissements${NC}"
else
    echo -e "${RED}  PROBLEMES DETECTES: $CHECKS_FAIL erreurs, $CHECKS_WARN avertissements${NC}"
fi
echo -e "${BLUE}══════════════════════════════════════════${NC}"
echo ""

exit $CHECKS_FAIL
