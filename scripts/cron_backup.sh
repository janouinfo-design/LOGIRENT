#!/bin/bash
# LogiRent - Backup automatique quotidien
# =========================================
# Installer dans crontab:
#   crontab -e
#   Ajouter la ligne suivante (adaptez le chemin):
#   0 2 * * * /home/ubuntu/apps/LOGIRENT/scripts/cron_backup.sh
#
# Cela fera un backup chaque nuit a 2h du matin.
# Les 7 derniers backups sont conserves (rotation automatique).

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_FILE="$SCRIPT_DIR/backups/backup.log"

mkdir -p "$SCRIPT_DIR/backups"

echo "$(date) - Backup started" >> "$LOG_FILE"

cd "$SCRIPT_DIR"

# Activer le venv Python si disponible
if [ -f "../backend/venv/bin/activate" ]; then
    source ../backend/venv/bin/activate 2>/dev/null
fi

python3 backup.py backup >> "$LOG_FILE" 2>&1

echo "$(date) - Backup finished" >> "$LOG_FILE"
echo "---" >> "$LOG_FILE"
