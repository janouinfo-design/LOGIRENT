#!/bin/bash
###############################################################################
#  LogiRent – Migration complète Atlas → MongoDB local (VPS)
#  =========================================================
#
#  PRÉREQUIS :
#    - Ubuntu 20.04 / 22.04 / 24.04
#    - Accès root ou sudo
#    - Le projet LOGIRENT cloné dans ~/apps/LOGIRENT
#    - Python 3.10+ avec venv dans backend/venv
#    - PM2 installé (npm install -g pm2) pour gérer le backend
#    - Connexion internet (pour installer MongoDB et télécharger depuis Atlas)
#
#  USAGE :
#    chmod +x migrate_vps.sh
#    sudo ./migrate_vps.sh
#
#  CE QUE FAIT CE SCRIPT :
#    1. Backup de la config actuelle
#    2. Installe MongoDB 7.0 si absent
#    3. Vérifie que MongoDB tourne
#    4. Exporte TOUTES les données depuis Atlas
#    5. Importe dans la base locale "logirent"
#    6. Met à jour backend/.env (MONGO_URL + DB_NAME)
#    7. Redémarre le backend via PM2
#    8. Vérifie tout : base, API, login, données
#
#  IDEMPOTENT : Ce script peut être relancé sans casser la base.
#  ROLLBACK  : En cas de problème, exécutez :
#    sudo ./migrate_vps.sh rollback
###############################################################################

set -e

# ==================== CONFIGURATION ====================
PROJECT_DIR="${LOGIRENT_DIR:-$HOME/apps/LOGIRENT}"
BACKEND_DIR="$PROJECT_DIR/backend"
SCRIPTS_DIR="$PROJECT_DIR/scripts"
ENV_FILE="$BACKEND_DIR/.env"
BACKUP_DIR="$SCRIPTS_DIR/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

ATLAS_URL="mongodb+srv://janouinfo_db_user:Omar2007@cluster0.isugn1l.mongodb.net/?appName=Cluster0"
LOCAL_URL="mongodb://localhost:27017"
DB_NAME="logirent"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ok()   { echo -e "  ${GREEN}[OK]${NC} $1"; }
fail() { echo -e "  ${RED}[ERREUR]${NC} $1"; }
info() { echo -e "  ${BLUE}[INFO]${NC} $1"; }
warn() { echo -e "  ${YELLOW}[ATTENTION]${NC} $1"; }

# ==================== ROLLBACK ====================
if [ "${1}" = "rollback" ]; then
    echo -e "\n${YELLOW}========================================${NC}"
    echo -e "${YELLOW}  ROLLBACK – Restauration config Atlas${NC}"
    echo -e "${YELLOW}========================================${NC}\n"

    LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/env_backup_*.env 2>/dev/null | head -1)
    if [ -z "$LATEST_BACKUP" ]; then
        fail "Aucun backup trouvé dans $BACKUP_DIR"
        exit 1
    fi

    info "Restauration depuis: $LATEST_BACKUP"
    cp "$LATEST_BACKUP" "$ENV_FILE"
    ok "Fichier .env restauré"

    if [ -x "$SCRIPTS_DIR/backend.sh" ]; then
        "$SCRIPTS_DIR/backend.sh" restart && ok "Backend redémarré" || warn "Redémarrez avec: ./scripts/backend.sh restart"
    elif command -v pm2 &>/dev/null; then
        pm2 restart logirent-backend 2>/dev/null && ok "Backend redémarré" || warn "Redémarrez manuellement"
    fi

    ok "ROLLBACK TERMINÉ – Le backend utilise à nouveau Atlas"
    exit 0
fi

# ==================== DÉBUT ====================
echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   LOGIRENT – MIGRATION ATLAS → MONGO LOCAL      ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════╝${NC}"
echo ""

# ---- Vérifier que le projet existe ----
if [ ! -d "$BACKEND_DIR" ]; then
    fail "Dossier backend non trouvé: $BACKEND_DIR"
    echo "  Modifiez LOGIRENT_DIR ou placez le projet dans ~/apps/LOGIRENT"
    exit 1
fi
ok "Projet trouvé: $PROJECT_DIR"

# ==================== ÉTAPE 1 : BACKUP ====================
echo ""
echo -e "${BLUE}── ÉTAPE 1 : Backup de la configuration ──${NC}"

mkdir -p "$BACKUP_DIR"
if [ -f "$ENV_FILE" ]; then
    cp "$ENV_FILE" "$BACKUP_DIR/env_backup_$TIMESTAMP.env"
    ok "Backup .env → $BACKUP_DIR/env_backup_$TIMESTAMP.env"
else
    warn "Pas de .env existant"
fi

# ==================== ÉTAPE 2 : INSTALLER MONGODB ====================
echo ""
echo -e "${BLUE}── ÉTAPE 2 : Installation MongoDB local ──${NC}"

if command -v mongod &>/dev/null; then
    MONGO_VERSION=$(mongod --version 2>/dev/null | head -1 || echo "?")
    ok "MongoDB déjà installé: $MONGO_VERSION"
else
    info "Installation de MongoDB 7.0..."

    # Détecter la version Ubuntu
    UBUNTU_CODENAME=$(lsb_release -cs 2>/dev/null || echo "jammy")
    info "Ubuntu: $UBUNTU_CODENAME"

    apt-get install -y gnupg curl > /dev/null 2>&1

    curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
        gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg 2>/dev/null

    echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu ${UBUNTU_CODENAME}/mongodb-org/7.0 multiverse" | \
        tee /etc/apt/sources.list.d/mongodb-org-7.0.list > /dev/null

    apt-get update > /dev/null 2>&1
    apt-get install -y mongodb-org > /dev/null 2>&1

    ok "MongoDB 7.0 installé"
fi

# ==================== ÉTAPE 3 : DÉMARRER MONGODB ====================
echo ""
echo -e "${BLUE}── ÉTAPE 3 : Vérification MongoDB ──${NC}"

systemctl start mongod 2>/dev/null || true
systemctl enable mongod 2>/dev/null || true
sleep 2

if mongosh --quiet --eval "db.runCommand({ping:1}).ok" 2>/dev/null | grep -q "1"; then
    ok "MongoDB local tourne et répond"
else
    # Tenter avec l'ancien client mongo
    if mongo --quiet --eval "db.runCommand({ping:1}).ok" 2>/dev/null | grep -q "1"; then
        ok "MongoDB local tourne (ancien client)"
    else
        fail "MongoDB ne répond pas. Vérifiez avec: sudo systemctl status mongod"
        exit 1
    fi
fi

# ==================== ÉTAPE 4 : MIGRATION PYTHON ====================
echo ""
echo -e "${BLUE}── ÉTAPE 4 : Migration des données Atlas → Local ──${NC}"

# Activer le venv Python
if [ -f "$BACKEND_DIR/venv/bin/activate" ]; then
    source "$BACKEND_DIR/venv/bin/activate"
    ok "Venv Python activé"
else
    warn "Pas de venv trouvé, utilisation de Python système"
fi

# Installer dépendances nécessaires
pip install pymongo dnspython bcrypt > /dev/null 2>&1
ok "Dépendances Python installées"

# Exécuter la migration
python3 << 'PYTHON_MIGRATION'
import json, sys, os
from pathlib import Path
from datetime import datetime

ATLAS_URL = "mongodb+srv://janouinfo_db_user:Omar2007@cluster0.isugn1l.mongodb.net/?appName=Cluster0"
LOCAL_URL = "mongodb://localhost:27017"
DB_NAME = "logirent"

COLLECTIONS = [
    "agencies", "users", "vehicles", "reservations",
    "contracts", "contract_templates", "notifications",
    "payment_transactions", "push_tokens", "password_resets"
]

from pymongo import MongoClient

# ---- EXPORT ATLAS ----
print("  Connexion à Atlas...")
atlas = MongoClient(ATLAS_URL, serverSelectionTimeoutMS=15000)
atlas_db = atlas[DB_NAME]
atlas.admin.command("ping")
print("  Atlas connecté")

exported = {}
total_export = 0
for col_name in COLLECTIONS:
    docs = list(atlas_db[col_name].find({}))
    for d in docs:
        d["_id"] = str(d["_id"])
        for k, v in d.items():
            if isinstance(v, datetime):
                d[k] = v.isoformat()
    exported[col_name] = docs
    total_export += len(docs)
    print(f"    {col_name}: {len(docs)} docs exportés")

atlas.close()
print(f"  Total exporté depuis Atlas: {total_export}")

# ---- IMPORT LOCAL ----
print("\n  Import vers MongoDB local...")
local = MongoClient(LOCAL_URL, serverSelectionTimeoutMS=5000)
local_db = local[DB_NAME]
local.admin.command("ping")
print("  Mongo local connecté")

total_import = 0
for col_name in COLLECTIONS:
    docs = exported.get(col_name, [])
    if not docs:
        continue

    col = local_db[col_name]

    # Trouver les IDs existants pour éviter doublons
    existing = set()
    for d in col.find({}, {"id": 1, "_id": 0}):
        if "id" in d:
            existing.add(d["id"])

    new_docs = []
    for d in docs:
        d.pop("_id", None)
        if d.get("id") not in existing:
            new_docs.append(d)

    skipped = len(docs) - len(new_docs)
    if new_docs:
        col.insert_many(new_docs)

    total_import += len(new_docs)
    status = f"{len(new_docs)} importés"
    if skipped:
        status += f", {skipped} existants"
    print(f"    {col_name}: {status}")

# ---- AUDIT ----
print(f"\n  === AUDIT BASE LOCALE ===")
total_local = 0
for col_name in COLLECTIONS:
    c = local_db[col_name].count_documents({})
    total_local += c
    print(f"    {col_name:30s} {c:>5d}")
print(f"    {'─'*36}")
print(f"    {'TOTAL':30s} {total_local:>5d}")

local.close()
print(f"\n  Migration: {total_export} exportés, {total_import} importés, {total_local} en local")

# ---- NORMALISATION ----
print("\n  Normalisation des données...")
local = MongoClient(LOCAL_URL)
db = local[DB_NAME]
fixes = 0

# Users: champs obligatoires
from pymongo import UpdateMany
r = db.users.update_many(
    {"$or": [{"name": {"$exists": False}}, {"name": None}, {"name": ""}]},
    {"$set": {"name": "Utilisateur"}}
)
fixes += r.modified_count

r = db.users.update_many({"role": {"$exists": False}}, {"$set": {"role": "client"}})
fixes += r.modified_count

r = db.users.update_many({"is_active": {"$exists": False}}, {"$set": {"is_active": True}})
fixes += r.modified_count

# Vehicles: champs numériques
r = db.vehicles.update_many({"year": {"$exists": False}}, {"$set": {"year": 0}})
fixes += r.modified_count
r = db.vehicles.update_many({"seats": {"$exists": False}}, {"$set": {"seats": 5}})
fixes += r.modified_count
r = db.vehicles.update_many({"price_per_day": {"$exists": False}}, {"$set": {"price_per_day": 0}})
fixes += r.modified_count

print(f"  {fixes} corrections appliquées")
local.close()
PYTHON_MIGRATION

if [ $? -ne 0 ]; then
    fail "Migration Python échouée"
    exit 1
fi
ok "Migration des données terminée"

# ==================== ÉTAPE 5 : CONFIGURER .env ====================
echo ""
echo -e "${BLUE}── ÉTAPE 5 : Configuration backend/.env ──${NC}"

# Lire le .env actuel et remplacer MONGO_URL et DB_NAME
if [ -f "$ENV_FILE" ]; then
    # Remplacer MONGO_URL
    if grep -q "^MONGO_URL" "$ENV_FILE"; then
        sed -i 's|^MONGO_URL=.*|MONGO_URL=mongodb://localhost:27017|' "$ENV_FILE"
        ok "MONGO_URL mis à jour → mongodb://localhost:27017"
    else
        echo 'MONGO_URL=mongodb://localhost:27017' >> "$ENV_FILE"
        ok "MONGO_URL ajouté"
    fi

    # Remplacer DB_NAME
    if grep -q "^DB_NAME" "$ENV_FILE"; then
        sed -i 's|^DB_NAME=.*|DB_NAME=logirent|' "$ENV_FILE"
        ok "DB_NAME mis à jour → logirent"
    else
        echo 'DB_NAME=logirent' >> "$ENV_FILE"
        ok "DB_NAME ajouté"
    fi
else
    cat > "$ENV_FILE" << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=logirent
EOF
    ok "Fichier .env créé"
fi

# Afficher la config active
echo ""
info "Configuration active:"
grep -E "^(MONGO_URL|DB_NAME)" "$ENV_FILE" | while read line; do
    echo "    $line"
done

# ==================== ÉTAPE 6 : REDÉMARRER BACKEND ====================
echo ""
echo -e "${BLUE}── ÉTAPE 6 : Redémarrage backend ──${NC}"

if [ -x "$SCRIPTS_DIR/backend.sh" ]; then
    "$SCRIPTS_DIR/backend.sh" restart && ok "Backend redémarré" || warn "Erreur, lancez: ./scripts/backend.sh restart"
elif command -v pm2 &>/dev/null; then
    pm2 restart logirent-backend 2>/dev/null && ok "Backend redémarré via PM2" || warn "PM2 restart échoué, essayez manuellement"
    sleep 3
else
    warn "PM2 non trouvé. Redémarrez le backend manuellement:"
    echo "    cd $BACKEND_DIR && source venv/bin/activate"
    echo "    uvicorn server:app --host 0.0.0.0 --port 8001 &"
fi

# ==================== ÉTAPE 7 : VÉRIFICATIONS ====================
echo ""
echo -e "${BLUE}── ÉTAPE 7 : Vérifications finales ──${NC}"
echo ""

CHECKS_OK=0
CHECKS_FAIL=0

# 7a. MongoDB local
echo "  [1/6] MongoDB local..."
python3 -c "
from pymongo import MongoClient
c = MongoClient('mongodb://localhost:27017', serverSelectionTimeoutMS=3000)
c.admin.command('ping')
print('PASS')
c.close()
" 2>/dev/null && ok "MongoDB local répond" && CHECKS_OK=$((CHECKS_OK+1)) || { fail "MongoDB local ne répond pas"; CHECKS_FAIL=$((CHECKS_FAIL+1)); }

# 7b. Collections et documents
echo "  [2/6] Collections et documents..."
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
    echo "    $line1"
    if [ "$line2" = "PASS" ]; then
        ok "Données suffisantes" && CHECKS_OK=$((CHECKS_OK+1))
    else
        fail "Données insuffisantes" && CHECKS_FAIL=$((CHECKS_FAIL+1))
    fi
}

# 7c. Backend API
echo "  [3/6] Backend API..."
BACKEND_URL="http://localhost:8001"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/vehicles" 2>/dev/null)
if [ "$HTTP_CODE" = "200" ]; then
    ok "Backend répond (HTTP $HTTP_CODE)" && CHECKS_OK=$((CHECKS_OK+1))
else
    fail "Backend ne répond pas (HTTP $HTTP_CODE)" && CHECKS_FAIL=$((CHECKS_FAIL+1))
fi

# 7d. Login
echo "  [4/6] Login admin..."
LOGIN_RESULT=$(curl -s -X POST "$BACKEND_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin-geneva@logirent.ch","password":"LogiRent2024!"}' 2>/dev/null \
    | python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('user',{}).get('role','FAIL'))" 2>/dev/null)
if [ "$LOGIN_RESULT" = "admin" ]; then
    ok "Login admin fonctionne" && CHECKS_OK=$((CHECKS_OK+1))
else
    fail "Login admin échoué (résultat: $LOGIN_RESULT)" && CHECKS_FAIL=$((CHECKS_FAIL+1))
fi

# 7e. Véhicules
echo "  [5/6] Véhicules..."
VEH_COUNT=$(curl -s "$BACKEND_URL/api/vehicles" 2>/dev/null \
    | python3 -c "import sys,json;print(len(json.load(sys.stdin)))" 2>/dev/null)
if [ "$VEH_COUNT" -gt 0 ] 2>/dev/null; then
    ok "$VEH_COUNT véhicules chargés" && CHECKS_OK=$((CHECKS_OK+1))
else
    fail "Aucun véhicule" && CHECKS_FAIL=$((CHECKS_FAIL+1))
fi

# 7f. Config confirmée locale
echo "  [6/6] Config .env pointe vers local..."
if grep -q "mongodb://localhost" "$ENV_FILE"; then
    ok "MONGO_URL = mongodb://localhost:27017 (PAS Atlas)" && CHECKS_OK=$((CHECKS_OK+1))
else
    fail "MONGO_URL ne pointe pas vers localhost" && CHECKS_FAIL=$((CHECKS_FAIL+1))
fi

# ==================== RÉSUMÉ FINAL ====================
echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════╗${NC}"
if [ $CHECKS_FAIL -eq 0 ]; then
    echo -e "${GREEN}║   MIGRATION RÉUSSIE – $CHECKS_OK/$((CHECKS_OK+CHECKS_FAIL)) vérifications OK      ║${NC}"
else
    echo -e "${YELLOW}║   MIGRATION PARTIELLE – $CHECKS_OK OK, $CHECKS_FAIL ÉCHECS         ║${NC}"
fi
echo -e "${BLUE}╠══════════════════════════════════════════════════╣${NC}"
echo -e "${BLUE}║${NC}  Base active : ${GREEN}mongodb://localhost:27017/logirent${NC}  ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}  Atlas       : ${RED}DÉSACTIVÉ${NC}                          ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}  Rollback    : sudo ./migrate_vps.sh rollback    ${BLUE}║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo "  Vérifications manuelles :"
echo "    cat $ENV_FILE | grep MONGO"
echo "    curl -s http://localhost:8001/api/vehicles | python3 -c \"import sys,json;print(len(json.load(sys.stdin)),'vehicules')\""
echo "    mongosh logirent --eval 'db.stats()'"
echo ""

if [ $CHECKS_FAIL -gt 0 ]; then
    warn "Certains tests ont échoué. Vérifiez les erreurs ci-dessus."
    warn "Pour revenir à Atlas: sudo ./migrate_vps.sh rollback"
    exit 1
fi
