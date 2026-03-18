#!/usr/bin/env python3
"""
LogiRent - Migration Atlas → MongoDB local (VPS)
==================================================
Ce script exporte depuis Atlas et importe dans votre MongoDB local.

Prerequis sur le VPS:
    sudo apt install -y mongodb-org
    # ou
    sudo apt install -y mongosh mongodb-mongosh

Usage:
    python3 migrate_to_local.py
"""

import json, sys, os
from pathlib import Path

ATLAS_URL = "mongodb+srv://janouinfo_db_user:Omar2007@cluster0.isugn1l.mongodb.net/?appName=Cluster0"
LOCAL_URL = "mongodb://localhost:27017"
DB_NAME = "logirent"
EXPORT_DIR = Path(__file__).parent / "migration_data"

COLLECTIONS = [
    "agencies", "users", "vehicles", "reservations",
    "contracts", "contract_templates", "notifications",
    "payment_transactions", "push_tokens", "password_resets"
]


def main():
    try:
        from pymongo import MongoClient
    except ImportError:
        print("pip install pymongo dnspython")
        return

    # --- ETAPE 1: Export depuis Atlas ---
    print("=" * 60)
    print("  ETAPE 1: Export depuis MongoDB Atlas")
    print("=" * 60)

    atlas = MongoClient(ATLAS_URL)
    atlas_db = atlas[DB_NAME]
    try:
        atlas.admin.command("ping")
        print("  Connexion Atlas OK")
    except Exception as e:
        print(f"  ERREUR Atlas: {e}")
        return

    EXPORT_DIR.mkdir(parents=True, exist_ok=True)
    total_export = 0
    for col_name in COLLECTIONS:
        docs = list(atlas_db[col_name].find({}))
        for d in docs:
            d["_id"] = str(d["_id"])
            for k, v in d.items():
                if hasattr(v, 'isoformat'):
                    d[k] = v.isoformat()
        with open(EXPORT_DIR / f"{col_name}.json", "w", encoding="utf-8") as f:
            json.dump(docs, f, ensure_ascii=False, default=str)
        total_export += len(docs)
        print(f"  {col_name}: {len(docs)} docs exportes")

    atlas.close()
    print(f"  Total exporte: {total_export}")

    # --- ETAPE 2: Import vers MongoDB local ---
    print(f"\n{'='*60}")
    print("  ETAPE 2: Import vers MongoDB local")
    print("=" * 60)

    try:
        local = MongoClient(LOCAL_URL, serverSelectionTimeoutMS=5000)
        local.admin.command("ping")
        print("  Connexion locale OK")
    except Exception as e:
        print(f"\n  ERREUR: MongoDB local non accessible!")
        print(f"  {e}")
        print(f"\n  Installez MongoDB sur votre VPS:")
        print(f"    sudo apt install -y gnupg curl")
        print(f"    curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor")
        print(f"    echo 'deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse' | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list")
        print(f"    sudo apt update && sudo apt install -y mongodb-org")
        print(f"    sudo systemctl start mongod && sudo systemctl enable mongod")
        print(f"\n  Puis relancez ce script.")
        return

    local_db = local[DB_NAME]

    total_import = 0
    for col_name in COLLECTIONS:
        filepath = EXPORT_DIR / f"{col_name}.json"
        if not filepath.exists():
            continue

        with open(filepath, "r", encoding="utf-8") as f:
            docs = json.load(f)

        if not docs:
            continue

        col = local_db[col_name]

        # Verifier doublons
        existing_ids = set()
        for d in col.find({}, {"id": 1, "_id": 0}):
            if "id" in d:
                existing_ids.add(d["id"])

        new_docs = []
        for d in docs:
            d.pop("_id", None)
            if d.get("id") not in existing_ids:
                new_docs.append(d)

        skipped = len(docs) - len(new_docs)
        if new_docs:
            col.insert_many(new_docs)

        total_import += len(new_docs)
        print(f"  {col_name}: {len(new_docs)} importes, {skipped} existants")

    local.close()

    # --- ETAPE 3: Verification ---
    print(f"\n{'='*60}")
    print("  ETAPE 3: Verification")
    print("=" * 60)

    local = MongoClient(LOCAL_URL)
    local_db = local[DB_NAME]
    total = 0
    for col_name in COLLECTIONS:
        count = local_db[col_name].count_documents({})
        total += count
        print(f"  {col_name:30s} {count:>5d} docs")
    print(f"  {'─'*36}")
    print(f"  {'TOTAL':30s} {total:>5d} docs")
    local.close()

    print(f"\n{'='*60}")
    print("  MIGRATION TERMINEE!")
    print("=" * 60)
    print(f"  Documents exportes (Atlas):  {total_export}")
    print(f"  Documents importes (local):  {total_import}")
    print(f"  Total en base locale:        {total}")
    print(f"\n  IMPORTANT: Mettez a jour votre backend/.env:")
    print(f"    MONGO_URL=mongodb://localhost:27017")
    print(f"    DB_NAME=logirent")
    print(f"\n  Puis redemarrez le backend:")
    print(f"    pm2 restart logirent-backend")
    print("=" * 60)


if __name__ == "__main__":
    main()
