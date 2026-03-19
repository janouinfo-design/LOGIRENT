#!/bin/bash
###############################################################################
#  LogiRent – Gestion unifiee du backend
#  ======================================
#  Script UNIQUE pour demarrer, arreter et redemarrer le backend.
#  Evite les conflits de port en tuant tout processus existant avant
#  de demarrer.
#
#  USAGE:
#    ./backend.sh start     # Demarre le backend (tue l'ancien si existant)
#    ./backend.sh stop      # Arrete le backend
#    ./backend.sh restart   # Arrete puis redemarre
#    ./backend.sh status    # Affiche l'etat du backend
#    ./backend.sh logs      # Affiche les logs en temps reel
#
#  IMPORTANT: Ce script est le SEUL moyen de gerer le backend.
#  Ne lancez JAMAIS uvicorn manuellement.
###############################################################################

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_DIR/backend"
PORT=8001

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

kill_port() {
    # Tue TOUT processus qui ecoute sur le port 8001
    local pids=$(lsof -ti :$PORT 2>/dev/null)
    if [ -n "$pids" ]; then
        echo -e "  ${YELLOW}[KILL]${NC} Processus sur le port $PORT: $pids"
        echo "$pids" | xargs kill -9 2>/dev/null
        sleep 1
        # Verification
        local remaining=$(lsof -ti :$PORT 2>/dev/null)
        if [ -n "$remaining" ]; then
            echo -e "  ${RED}[ERREUR]${NC} Impossible de liberer le port $PORT"
            echo "  Essayez: sudo kill -9 $remaining"
            return 1
        fi
        echo -e "  ${GREEN}[OK]${NC} Port $PORT libere"
    fi
    return 0
}

do_start() {
    echo -e "\n${BLUE}  Demarrage du backend LogiRent${NC}\n"

    # Verifier que le dossier backend existe
    if [ ! -f "$BACKEND_DIR/server.py" ]; then
        echo -e "  ${RED}[ERREUR]${NC} server.py non trouve dans $BACKEND_DIR"
        exit 1
    fi

    # Liberer le port si occupe
    kill_port || exit 1

    # Arreter PM2 si le process existe
    if command -v pm2 &>/dev/null; then
        pm2 delete logirent-backend 2>/dev/null
    fi

    # Activer venv si disponible
    if [ -f "$BACKEND_DIR/venv/bin/activate" ]; then
        source "$BACKEND_DIR/venv/bin/activate"
    fi

    # Demarrer via PM2
    if command -v pm2 &>/dev/null; then
        cd "$BACKEND_DIR"
        pm2 start "uvicorn server:app --host 0.0.0.0 --port $PORT" \
            --name logirent-backend \
            --cwd "$BACKEND_DIR" \
            --max-restarts 10 \
            --restart-delay 3000
        echo ""
        pm2 save 2>/dev/null
        echo -e "  ${GREEN}[OK]${NC} Backend demarre via PM2 sur le port $PORT"
    else
        echo -e "  ${RED}[ERREUR]${NC} PM2 non installe"
        echo "  Installez-le: sudo npm install -g pm2"
        exit 1
    fi

    # Attendre que le backend reponde
    echo -ne "  Attente du backend"
    for i in $(seq 1 10); do
        sleep 1
        echo -n "."
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/api/vehicles" 2>/dev/null)
        if [ "$HTTP_CODE" = "200" ]; then
            echo ""
            echo -e "  ${GREEN}[OK]${NC} Backend repond (HTTP 200)"
            return 0
        fi
    done
    echo ""
    echo -e "  ${YELLOW}[ATTENTION]${NC} Le backend n'a pas repondu en 10 secondes"
    echo "  Verifiez les logs: ./backend.sh logs"
}

do_stop() {
    echo -e "\n${BLUE}  Arret du backend LogiRent${NC}\n"

    if command -v pm2 &>/dev/null; then
        pm2 stop logirent-backend 2>/dev/null
        pm2 delete logirent-backend 2>/dev/null
        echo -e "  ${GREEN}[OK]${NC} PM2 process arrete"
    fi

    # S'assurer que le port est libere
    kill_port
    echo -e "  ${GREEN}[OK]${NC} Backend arrete"
}

do_restart() {
    echo -e "\n${BLUE}  Redemarrage du backend LogiRent${NC}"
    do_stop
    sleep 1
    do_start
}

do_status() {
    echo -e "\n${BLUE}  Statut du backend LogiRent${NC}\n"

    # Port
    local pids=$(lsof -ti :$PORT 2>/dev/null)
    if [ -n "$pids" ]; then
        echo -e "  ${GREEN}[ACTIF]${NC} Port $PORT utilise par PID: $pids"
        lsof -i :$PORT 2>/dev/null | grep -v "^COMMAND"
    else
        echo -e "  ${RED}[INACTIF]${NC} Rien n'ecoute sur le port $PORT"
    fi

    echo ""

    # PM2
    if command -v pm2 &>/dev/null; then
        echo "  PM2:"
        pm2 list 2>/dev/null | grep -E "logirent|Name"
    fi

    echo ""

    # Test API
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/api/vehicles" 2>/dev/null)
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "  ${GREEN}[OK]${NC} API repond (HTTP $HTTP_CODE)"
    else
        echo -e "  ${RED}[ERREUR]${NC} API ne repond pas (HTTP $HTTP_CODE)"
    fi
}

do_logs() {
    if command -v pm2 &>/dev/null; then
        pm2 logs logirent-backend --lines 50
    else
        echo "PM2 non installe"
    fi
}

# ==================== MAIN ====================
case "${1:-status}" in
    start)   do_start ;;
    stop)    do_stop ;;
    restart) do_restart ;;
    status)  do_status ;;
    logs)    do_logs ;;
    *)
        echo "Usage: ./backend.sh [start|stop|restart|status|logs]"
        exit 1
        ;;
esac
