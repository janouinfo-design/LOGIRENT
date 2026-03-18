#!/bin/bash
###############################################################################
#  LogiRent – Etape 1 : Installation de MongoDB 7.0
#  =================================================
#  Ce script installe UNIQUEMENT MongoDB. Rien d'autre.
#
#  USAGE:
#    chmod +x 01_install_mongodb.sh
#    sudo ./01_install_mongodb.sh
#
#  PRÉREQUIS: Ubuntu 20.04 / 22.04 / 24.04
###############################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

ok()   { echo -e "  ${GREEN}[OK]${NC} $1"; }
fail() { echo -e "  ${RED}[ERREUR]${NC} $1"; }
info() { echo -e "  ${BLUE}[INFO]${NC} $1"; }

echo ""
echo -e "${BLUE}══════════════════════════════════════${NC}"
echo -e "${BLUE}  ETAPE 1 : Installation MongoDB 7.0${NC}"
echo -e "${BLUE}══════════════════════════════════════${NC}"
echo ""

# Verifier qu'on est root
if [ "$EUID" -ne 0 ]; then
    fail "Ce script doit etre lance avec sudo"
    echo "  sudo ./01_install_mongodb.sh"
    exit 1
fi

# Verifier si deja installe
if command -v mongod &>/dev/null; then
    MONGO_VERSION=$(mongod --version 2>/dev/null | head -1 || echo "?")
    ok "MongoDB deja installe: $MONGO_VERSION"
else
    info "Installation de MongoDB 7.0..."

    UBUNTU_CODENAME=$(lsb_release -cs 2>/dev/null || echo "jammy")
    info "Ubuntu detecte: $UBUNTU_CODENAME"

    apt-get install -y gnupg curl > /dev/null 2>&1

    curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
        gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg 2>/dev/null

    echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu ${UBUNTU_CODENAME}/mongodb-org/7.0 multiverse" | \
        tee /etc/apt/sources.list.d/mongodb-org-7.0.list > /dev/null

    apt-get update > /dev/null 2>&1
    apt-get install -y mongodb-org > /dev/null 2>&1

    ok "MongoDB 7.0 installe"
fi

# Demarrer et activer
systemctl start mongod 2>/dev/null || true
systemctl enable mongod 2>/dev/null || true
sleep 2

# Verification
if mongosh --quiet --eval "db.runCommand({ping:1}).ok" 2>/dev/null | grep -q "1"; then
    ok "MongoDB demarre et repond"
elif mongo --quiet --eval "db.runCommand({ping:1}).ok" 2>/dev/null | grep -q "1"; then
    ok "MongoDB demarre et repond (ancien client)"
else
    fail "MongoDB ne repond pas"
    echo "  Verifiez: sudo systemctl status mongod"
    echo "  Logs:     sudo journalctl -u mongod --no-pager -n 20"
    exit 1
fi

echo ""
echo -e "${GREEN}  MongoDB pret. Passez a l'etape suivante:${NC}"
echo "    python3 migrate_to_local.py"
echo ""
