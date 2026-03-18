#!/bin/bash
# LogiRent - Backup automatique quotidien
# =========================================
# Installer dans crontab:
#   crontab -e
#   Ajouter: 0 2 * * * /home/user/apps/LOGIRENT/scripts/cron_backup.sh
#
# Cela fera un backup chaque nuit a 2h du matin

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_FILE="$SCRIPT_DIR/backups/backup.log"

echo "$(date) - Backup started" >> "$LOG_FILE"

cd "$SCRIPT_DIR"
source ../backend/venv/bin/activate 2>/dev/null

python3 backup.py backup >> "$LOG_FILE" 2>&1

echo "$(date) - Backup finished" >> "$LOG_FILE"
echo "---" >> "$LOG_FILE"
