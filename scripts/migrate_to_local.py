#!/usr/bin/env python3
"""
LogiRent - Migration Atlas -> MongoDB local
=============================================
Exporte depuis Atlas et importe dans votre MongoDB local.

PREREQUIS:
    1. MongoDB local installe et demarre (voir 01_install_mongodb.sh)
    2. Fichier scripts/migration.env rempli avec votre ATLAS_URL
    3. pip install pymongo dnspython

USAGE:
    python3 migrate_to_local.py

SECURITE:
    - Aucun credential en dur dans le code
    - ATLAS_URL lu depuis scripts/migration.env
    - Base locale lue depuis backend/.env (MONGO_URL + DB_NAME)
    - Idempotent: peut etre relance sans doublons
"""

import json, sys
from pathlib import Path
from datetime import datetime

# Ajouter le dossier scripts/ au path pour importer env_loader
sys.path.insert(0, str(Path(__file__).resolve().parent))
from env_loader import load_env, load_migration_env, require_keys

COLLECTIONS = [
    "agencies", "users", "vehicles", "reservations",
    "contracts", "contract_templates", "notifications",
    "payment_transactions", "push_tokens", "password_resets"
]

EXPORT_DIR = Path(__file__).parent / "migration_data"


def main():
    try:
        from pymongo import MongoClient
    except ImportError:
        print("[ERREUR] pymongo non installe.")
        print("  pip install pymongo dnspython")
        return 1

    # --- Charger les configurations ---
    print("=" * 60)
    print("  CHARGEMENT DE LA CONFIGURATION")
    print("=" * 60)

    try:
        migration_env = load_migration_env()
    except (FileNotFoundError, ValueError) as e:
        print(f"  [ERREUR] {e}")
        return 1

    try:
        backend_env = load_env()
        require_keys(backend_env, "MONGO_URL", "DB_NAME")
    except (FileNotFoundError, ValueError) as e:
        print(f"  [ERREUR] {e}")
        return 1

    atlas_url = migration_env["ATLAS_URL"]
    atlas_db_name = migration_env.get("ATLAS_DB_NAME", "logirent")
    local_url = backend_env["MONGO_URL"]
    local_db_name = backend_env["DB_NAME"]

    # Securite: verifier qu'on ne pointe pas vers Atlas en local
    if "mongodb+srv" in local_url or "mongodb.net" in local_url:
        print("  [ATTENTION] MONGO_URL dans backend/.env pointe vers Atlas!")
        print("  La migration va importer dans cette base distante.")
        confirm = input("  Continuer quand meme? (oui/non): ").strip().lower()
        if confirm != "oui":
            print("  Annule.")
            return 1

    print(f"  Source:      Atlas ({atlas_db_name})")
    print(f"  Destination: {local_url}/{local_db_name}")
    print()

    # --- ETAPE 1: Export depuis Atlas ---
    print("=" * 60)
    print("  ETAPE 1: Export depuis MongoDB Atlas")
    print("=" * 60)

    try:
        atlas = MongoClient(atlas_url, serverSelectionTimeoutMS=15000)
        atlas_db = atlas[atlas_db_name]
        atlas.admin.command("ping")
        print("  [OK] Connexion Atlas reussie")
    except Exception as e:
        print(f"  [ERREUR] Impossible de se connecter a Atlas: {e}")
        print("  Verifiez ATLAS_URL dans scripts/migration.env")
        return 1

    EXPORT_DIR.mkdir(parents=True, exist_ok=True)
    total_export = 0
    for col_name in COLLECTIONS:
        docs = list(atlas_db[col_name].find({}))
        for d in docs:
            d["_id"] = str(d["_id"])
            for k, v in d.items():
                if hasattr(v, "isoformat"):
                    d[k] = v.isoformat()
        with open(EXPORT_DIR / f"{col_name}.json", "w", encoding="utf-8") as f:
            json.dump(docs, f, ensure_ascii=False, default=str)
        total_export += len(docs)
        print(f"    {col_name}: {len(docs)} docs exportes")

    atlas.close()
    print(f"  Total exporte: {total_export}")
    print(f"  Fichiers JSON dans: {EXPORT_DIR}")

    # --- ETAPE 2: Import vers MongoDB local ---
    print(f"\n{'='*60}")
    print("  ETAPE 2: Import vers MongoDB local")
    print("=" * 60)

    try:
        local = MongoClient(local_url, serverSelectionTimeoutMS=5000)
        local.admin.command("ping")
        print(f"  [OK] Connexion locale reussie ({local_url})")
    except Exception as e:
        print(f"\n  [ERREUR] MongoDB local non accessible!")
        print(f"  {e}")
        print(f"\n  Lancez d'abord: ./01_install_mongodb.sh")
        print(f"  Puis verifiez: sudo systemctl status mongod")
        return 1

    local_db = local[local_db_name]

    total_import = 0
    total_skipped = 0
    for col_name in COLLECTIONS:
        filepath = EXPORT_DIR / f"{col_name}.json"
        if not filepath.exists():
            continue

        with open(filepath, "r", encoding="utf-8") as f:
            docs = json.load(f)

        if not docs:
            continue

        col = local_db[col_name]

        # Verifier doublons par champ "id"
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
        total_skipped += skipped
        print(f"    {col_name}: {len(new_docs)} importes, {skipped} deja existants")

    local.close()

    # --- ETAPE 3: Normalisation ---
    print(f"\n{'='*60}")
    print("  ETAPE 3: Normalisation des donnees")
    print("=" * 60)

    local = MongoClient(local_url)
    db = local[local_db_name]
    fixes = 0

    r = db.users.update_many(
        {"$or": [{"name": {"$exists": False}}, {"name": None}, {"name": ""}]},
        {"$set": {"name": "Utilisateur"}}
    )
    fixes += r.modified_count

    r = db.users.update_many({"role": {"$exists": False}}, {"$set": {"role": "client"}})
    fixes += r.modified_count

    r = db.users.update_many({"is_active": {"$exists": False}}, {"$set": {"is_active": True}})
    fixes += r.modified_count

    r = db.vehicles.update_many({"year": {"$exists": False}}, {"$set": {"year": 0}})
    fixes += r.modified_count
    r = db.vehicles.update_many({"seats": {"$exists": False}}, {"$set": {"seats": 5}})
    fixes += r.modified_count
    r = db.vehicles.update_many({"price_per_day": {"$exists": False}}, {"$set": {"price_per_day": 0}})
    fixes += r.modified_count

    print(f"  {fixes} corrections appliquees")

    # --- ETAPE 4: Verification ---
    print(f"\n{'='*60}")
    print("  ETAPE 4: Verification finale")
    print("=" * 60)

    total = 0
    for col_name in COLLECTIONS:
        count = db[col_name].count_documents({})
        total += count
        print(f"    {col_name:30s} {count:>5d} docs")
    print(f"    {'─'*36}")
    print(f"    {'TOTAL':30s} {total:>5d} docs")
    local.close()

    print(f"\n{'='*60}")
    print("  MIGRATION TERMINEE!")
    print("=" * 60)
    print(f"  Documents exportes (Atlas):     {total_export}")
    print(f"  Documents importes (nouveau):   {total_import}")
    print(f"  Documents deja existants:       {total_skipped}")
    print(f"  Total en base locale:           {total}")
    print(f"\n  PROCHAINE ETAPE:")
    print(f"    Executez ./03_update_env.sh pour basculer le backend")
    print(f"    vers la base locale.")
    print("=" * 60)
    return 0


if __name__ == "__main__":
    sys.exit(main() or 0)
