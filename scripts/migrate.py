#!/usr/bin/env python3
"""
LogiRent - Migration Complète vers VPS
=======================================
Ce script exporte TOUTES les données de la base source,
les normalise, et les importe dans la base cible (VPS/Atlas).

Usage:
    # Export depuis la base dev
    python3 migrate.py export

    # Import vers le VPS (MongoDB Atlas)
    python3 migrate.py import

    # Export + Import en une commande
    python3 migrate.py full

    # Audit seulement
    python3 migrate.py audit

    # Nettoyage/normalisation des données exportées
    python3 migrate.py normalize
"""

import sys, os, json, uuid
from datetime import datetime, timezone
from pathlib import Path

# ==================== CONFIGURATION ====================
# Source (environnement de dev Emergent)
SOURCE_MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
SOURCE_DB_NAME = os.environ.get("DB_NAME", "test_database")

# Cible (VPS / MongoDB Atlas)
TARGET_MONGO_URL = "mongodb+srv://janouinfo_db_user:Omar2007@cluster0.isugn1l.mongodb.net/?appName=Cluster0"
TARGET_DB_NAME = "logirent"

# Dossier d'export
EXPORT_DIR = Path(__file__).parent / "migration_data"

# Collections a migrer
COLLECTIONS = [
    "agencies", "users", "vehicles", "reservations",
    "contracts", "contract_templates", "notifications",
    "payment_transactions", "push_tokens", "password_resets"
]
# ========================================================

def get_client(url):
    from pymongo import MongoClient
    return MongoClient(url, serverSelectionTimeoutMS=10000)


def audit(db, label=""):
    print(f"\n{'='*60}")
    print(f"  AUDIT: {label} ({db.name})")
    print(f"{'='*60}")
    total = 0
    for col_name in sorted(db.list_collection_names()):
        count = db[col_name].count_documents({})
        total += count
        print(f"  {col_name:30s} {count:>6d} docs")
    print(f"  {'─'*38}")
    print(f"  {'TOTAL':30s} {total:>6d} docs")
    print(f"{'='*60}")
    return total


def export_data():
    """Exporte toutes les collections en fichiers JSON."""
    print("\n[EXPORT] Connexion a la source...")
    client = get_client(SOURCE_MONGO_URL)
    db = client[SOURCE_DB_NAME]
    client.admin.command("ping")
    print("[EXPORT] Connexion OK")

    audit(db, "SOURCE")

    EXPORT_DIR.mkdir(parents=True, exist_ok=True)

    total_exported = 0
    for col_name in COLLECTIONS:
        col = db[col_name]
        docs = list(col.find({}))
        count = len(docs)

        # Convertir ObjectId et datetime pour JSON
        for doc in docs:
            for key, val in doc.items():
                if key == "_id":
                    doc[key] = str(val)
                elif isinstance(val, datetime):
                    doc[key] = val.isoformat()

        filepath = EXPORT_DIR / f"{col_name}.json"
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(docs, f, ensure_ascii=False, indent=2, default=str)

        total_exported += count
        print(f"  [+] {col_name}: {count} docs -> {filepath.name}")

    # Backup complet en un seul fichier
    backup_path = EXPORT_DIR / "full_backup.json"
    backup = {}
    for col_name in COLLECTIONS:
        filepath = EXPORT_DIR / f"{col_name}.json"
        if filepath.exists():
            with open(filepath, "r") as f:
                backup[col_name] = json.load(f)
    with open(backup_path, "w", encoding="utf-8") as f:
        json.dump(backup, f, ensure_ascii=False, default=str)

    print(f"\n[EXPORT] Total: {total_exported} documents exportes")
    print(f"[EXPORT] Backup complet: {backup_path}")
    client.close()
    return total_exported


def normalize_data():
    """Nettoie et normalise les données exportées."""
    print("\n[NORMALIZE] Nettoyage des donnees...")
    fixes = 0

    for col_name in COLLECTIONS:
        filepath = EXPORT_DIR / f"{col_name}.json"
        if not filepath.exists():
            continue

        with open(filepath, "r", encoding="utf-8") as f:
            docs = json.load(f)

        for doc in docs:
            # Supprimer _id MongoDB (sera regenere a l'import)
            if "_id" in doc:
                del doc["_id"]
                fixes += 1

            # === USERS ===
            if col_name == "users":
                doc.setdefault("name", "Utilisateur")
                doc.setdefault("phone", None)
                doc.setdefault("address", None)
                doc.setdefault("nationality", "")
                doc.setdefault("role", "client")
                doc.setdefault("is_active", True)
                doc.setdefault("profile_photo", None)
                doc.setdefault("id_photo", None)
                doc.setdefault("license_photo", None)
                doc.setdefault("date_of_birth", None)
                doc.setdefault("license_number", None)
                doc.setdefault("license_issue_date", None)
                doc.setdefault("license_expiry_date", None)
                doc.setdefault("birth_place", None)
                if doc.get("email"):
                    doc["email"] = doc["email"].lower().strip()
                if doc.get("role") not in ("super_admin", "admin", "client"):
                    doc["role"] = "client"
                    fixes += 1

            # === VEHICLES ===
            if col_name == "vehicles":
                doc.setdefault("brand", "")
                doc.setdefault("model", "")
                doc["year"] = int(doc.get("year") or 0)
                doc["seats"] = int(doc.get("seats") or 0)
                doc["price_per_day"] = float(doc.get("price_per_day") or 0)
                doc.setdefault("transmission", "automatic")
                doc.setdefault("fuel_type", "essence")
                doc.setdefault("color", "")
                doc.setdefault("plate_number", "")
                doc.setdefault("chassis_number", "")
                doc.setdefault("description", "")
                doc.setdefault("location", "")
                doc.setdefault("status", "available")
                if not isinstance(doc.get("photos"), list):
                    doc["photos"] = []
                if not isinstance(doc.get("options"), list):
                    doc["options"] = []
                if not isinstance(doc.get("documents"), list):
                    doc["documents"] = []
                if doc["status"] not in ("available", "rented", "maintenance"):
                    doc["status"] = "available"
                    fixes += 1

            # === RESERVATIONS ===
            if col_name == "reservations":
                doc["total_days"] = int(doc.get("total_days") or 0)
                doc["base_price"] = float(doc.get("base_price") or 0)
                doc["options_price"] = float(doc.get("options_price") or 0)
                doc["total_price"] = float(doc.get("total_price") or 0)
                doc.setdefault("payment_method", "card")
                doc.setdefault("payment_status", "unpaid")
                doc.setdefault("options", [])
                if doc.get("status") not in ("pending", "confirmed", "active", "completed", "cancelled"):
                    doc["status"] = "pending"
                    fixes += 1
                if doc.get("payment_status") not in ("unpaid", "paid", "refunded", "pending"):
                    doc["payment_status"] = "unpaid"
                    fixes += 1

            # === AGENCIES ===
            if col_name == "agencies":
                doc.setdefault("is_active", True)
                doc.setdefault("slug", doc.get("name", "").lower().replace(" ", "-"))
                doc.setdefault("navixy_api_url", None)
                doc.setdefault("navixy_hash", None)

            # === CONTRACTS ===
            if col_name == "contracts":
                doc.setdefault("status", "draft")
                doc.setdefault("contract_data", {})
                doc.setdefault("damages", [])

            # === NOTIFICATIONS ===
            if col_name == "notifications":
                doc.setdefault("read", False)
                doc.setdefault("type", "info")

            # === PAYMENT TRANSACTIONS ===
            if col_name == "payment_transactions":
                doc["amount"] = float(doc.get("amount") or 0)
                doc.setdefault("currency", "chf")
                doc.setdefault("status", "initiated")
                doc.setdefault("payment_status", "pending")

        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(docs, f, ensure_ascii=False, indent=2, default=str)

    print(f"[NORMALIZE] {fixes} corrections appliquees")
    return fixes


def import_data():
    """Importe les données normalisées vers la base cible."""
    print("\n[IMPORT] Connexion a la cible...")
    client = get_client(TARGET_MONGO_URL)
    db = client[TARGET_DB_NAME]
    client.admin.command("ping")
    print(f"[IMPORT] Connexion OK -> {TARGET_DB_NAME}")

    # Audit avant import
    audit(db, "CIBLE (avant)")

    total_imported = 0
    for col_name in COLLECTIONS:
        filepath = EXPORT_DIR / f"{col_name}.json"
        if not filepath.exists():
            print(f"  [!] {col_name}: fichier non trouve, skip")
            continue

        with open(filepath, "r", encoding="utf-8") as f:
            docs = json.load(f)

        if not docs:
            print(f"  [-] {col_name}: vide, skip")
            continue

        col = db[col_name]

        # Verifier doublons par champ 'id'
        existing_ids = set()
        for d in col.find({}, {"id": 1, "_id": 0}):
            if "id" in d:
                existing_ids.add(d["id"])

        new_docs = [d for d in docs if d.get("id") not in existing_ids]
        skipped = len(docs) - len(new_docs)

        if new_docs:
            # Nettoyer _id avant insert
            for d in new_docs:
                d.pop("_id", None)
            col.insert_many(new_docs)

        total_imported += len(new_docs)
        print(f"  [+] {col_name}: {len(new_docs)} importes, {skipped} deja existants")

    # Audit apres import
    audit(db, "CIBLE (apres)")

    print(f"\n[IMPORT] Total: {total_imported} documents importes")
    client.close()
    return total_imported


def verify_relations():
    """Vérifie l'intégrité des relations entre collections."""
    print("\n[VERIFY] Verification des relations...")
    client = get_client(TARGET_MONGO_URL)
    db = client[TARGET_DB_NAME]

    issues = []

    # Reservations -> Users
    for r in db.reservations.find({}, {"_id": 0, "id": 1, "user_id": 1, "vehicle_id": 1, "agency_id": 1}):
        if r.get("user_id") and not db.users.find_one({"id": r["user_id"]}):
            issues.append(f"Reservation {r['id'][:8]}... -> user_id {r['user_id'][:8]}... INTROUVABLE")
        if r.get("vehicle_id") and not db.vehicles.find_one({"id": r["vehicle_id"]}):
            issues.append(f"Reservation {r['id'][:8]}... -> vehicle_id {r['vehicle_id'][:8]}... INTROUVABLE")
        if r.get("agency_id") and not db.agencies.find_one({"id": r["agency_id"]}):
            issues.append(f"Reservation {r['id'][:8]}... -> agency_id {r['agency_id'][:8]}... INTROUVABLE")

    # Contracts -> Reservations
    for c in db.contracts.find({}, {"_id": 0, "id": 1, "reservation_id": 1}):
        if c.get("reservation_id") and not db.reservations.find_one({"id": c["reservation_id"]}):
            issues.append(f"Contract {c['id'][:8]}... -> reservation_id INTROUVABLE")

    # Vehicles -> Agencies
    for v in db.vehicles.find({}, {"_id": 0, "id": 1, "agency_id": 1}):
        if v.get("agency_id") and not db.agencies.find_one({"id": v["agency_id"]}):
            issues.append(f"Vehicle {v['id'][:8]}... -> agency_id INTROUVABLE")

    if issues:
        print(f"  [!] {len(issues)} problemes trouves:")
        for i in issues[:20]:
            print(f"      - {i}")
    else:
        print("  [OK] Toutes les relations sont valides")

    client.close()
    return issues


def full_migration():
    """Migration complète: export -> normalize -> import -> verify."""
    print("\n" + "=" * 60)
    print("  LOGIRENT - MIGRATION COMPLETE")
    print("=" * 60)

    step = 1
    print(f"\n[{step}] EXPORT...")
    exported = export_data()

    step += 1
    print(f"\n[{step}] NORMALISATION...")
    normalized = normalize_data()

    step += 1
    print(f"\n[{step}] IMPORT...")
    imported = import_data()

    step += 1
    print(f"\n[{step}] VERIFICATION...")
    issues = verify_relations()

    print("\n" + "=" * 60)
    print("  MIGRATION TERMINEE!")
    print("=" * 60)
    print(f"  Documents exportes:    {exported}")
    print(f"  Corrections:           {normalized}")
    print(f"  Documents importes:    {imported}")
    print(f"  Problemes relations:   {len(issues)}")
    print("=" * 60)


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "full"

    if cmd == "export":
        export_data()
    elif cmd == "normalize":
        normalize_data()
    elif cmd == "import":
        import_data()
    elif cmd == "audit":
        src = get_client(SOURCE_MONGO_URL)
        audit(src[SOURCE_DB_NAME], "SOURCE")
        src.close()
        try:
            tgt = get_client(TARGET_MONGO_URL)
            audit(tgt[TARGET_DB_NAME], "CIBLE")
            tgt.close()
        except Exception as e:
            print(f"  Cible inaccessible: {e}")
    elif cmd == "verify":
        verify_relations()
    elif cmd == "full":
        full_migration()
    else:
        print(f"Commande inconnue: {cmd}")
        print("Usage: python3 migrate.py [export|normalize|import|audit|verify|full]")
