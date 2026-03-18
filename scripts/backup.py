#!/usr/bin/env python3
"""
LogiRent - Scripts de backup et restauration
=============================================
Usage sur VPS:
    # Backup quotidien
    python3 backup.py backup

    # Restauration depuis backup
    python3 backup.py restore [fichier_backup.json]

    # Reset complet (drop + seed)
    python3 backup.py reset
"""

import sys, os, json, shutil
from datetime import datetime
from pathlib import Path

MONGO_URL = os.environ.get("MONGO_URL", "mongodb+srv://janouinfo_db_user:Omar2007@cluster0.isugn1l.mongodb.net/?appName=Cluster0")
DB_NAME = os.environ.get("DB_NAME", "logirent")
BACKUP_DIR = Path(__file__).parent / "backups"
MAX_BACKUPS = 7  # Rotation: garder les 7 derniers

COLLECTIONS = [
    "agencies", "users", "vehicles", "reservations",
    "contracts", "contract_templates", "notifications",
    "payment_transactions", "push_tokens", "password_resets"
]


def backup():
    from pymongo import MongoClient
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]

    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filepath = BACKUP_DIR / f"backup_{timestamp}.json"

    data = {}
    total = 0
    for col_name in COLLECTIONS:
        docs = list(db[col_name].find({}))
        for d in docs:
            d["_id"] = str(d["_id"])
            for k, v in d.items():
                if isinstance(v, datetime):
                    d[k] = v.isoformat()
        data[col_name] = docs
        total += len(docs)
        print(f"  {col_name}: {len(docs)} docs")

    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, default=str)

    print(f"\n[BACKUP] {total} documents -> {filepath}")
    print(f"[BACKUP] Taille: {filepath.stat().st_size / 1024 / 1024:.1f} MB")

    # Rotation
    backups = sorted(BACKUP_DIR.glob("backup_*.json"))
    if len(backups) > MAX_BACKUPS:
        for old in backups[:-MAX_BACKUPS]:
            old.unlink()
            print(f"[ROTATION] Supprime: {old.name}")

    client.close()
    return filepath


def restore(filepath=None):
    from pymongo import MongoClient

    if filepath is None:
        # Dernier backup
        backups = sorted(BACKUP_DIR.glob("backup_*.json"))
        if not backups:
            print("[ERREUR] Aucun backup trouve")
            return
        filepath = backups[-1]
    else:
        filepath = Path(filepath)

    if not filepath.exists():
        print(f"[ERREUR] Fichier non trouve: {filepath}")
        return

    print(f"[RESTORE] Depuis: {filepath}")

    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]

    total = 0
    for col_name, docs in data.items():
        if not docs:
            continue
        col = db[col_name]
        col.drop()
        for d in docs:
            d.pop("_id", None)
        col.insert_many(docs)
        total += len(docs)
        print(f"  {col_name}: {len(docs)} docs restaures")

    print(f"\n[RESTORE] {total} documents restaures")
    client.close()


def reset():
    from pymongo import MongoClient
    print("[RESET] Suppression de toutes les collections...")

    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]

    for col_name in COLLECTIONS:
        db[col_name].drop()
        print(f"  [x] {col_name} supprime")

    print("[RESET] Base videe. Executez seed_demo.py pour recreer les donnees.")
    client.close()


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "backup"

    if cmd == "backup":
        backup()
    elif cmd == "restore":
        fp = sys.argv[2] if len(sys.argv) > 2 else None
        restore(fp)
    elif cmd == "reset":
        confirm = input("ATTENTION: Cela va SUPPRIMER toutes les donnees. Continuer? (oui/non): ")
        if confirm.lower() == "oui":
            reset()
        else:
            print("Annule.")
    else:
        print(f"Usage: python3 backup.py [backup|restore|reset]")
