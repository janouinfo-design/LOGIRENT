#!/usr/bin/env python3
"""
LogiRent - Backup, restauration et reset
==========================================
Charge TOUJOURS depuis backend/.env (pas de fallback dangereux).

Usage:
    python3 backup.py backup              # Sauvegarde
    python3 backup.py restore             # Restaure le dernier backup
    python3 backup.py restore fichier.json  # Restaure un backup specifique
    python3 backup.py reset               # Vide la base (demande confirmation)
    python3 backup.py status              # Affiche l'etat de la base
"""

import sys, json
from datetime import datetime
from pathlib import Path

# Charger l'environnement depuis backend/.env
sys.path.insert(0, str(Path(__file__).resolve().parent))
from env_loader import load_env, require_keys

BACKUP_DIR = Path(__file__).parent / "backups"
MAX_BACKUPS = 7

COLLECTIONS = [
    "agencies", "users", "vehicles", "reservations",
    "contracts", "contract_templates", "notifications",
    "payment_transactions", "push_tokens", "password_resets"
]


def get_db():
    """Connecte a la base depuis backend/.env. Aucun fallback."""
    from pymongo import MongoClient
    env = load_env()
    require_keys(env, "MONGO_URL", "DB_NAME")
    client = MongoClient(env["MONGO_URL"], serverSelectionTimeoutMS=5000)
    try:
        client.admin.command("ping")
    except Exception as e:
        print(f"[ERREUR] Impossible de se connecter a MongoDB: {e}")
        print(f"  MONGO_URL: {env['MONGO_URL']}")
        print(f"  DB_NAME:   {env['DB_NAME']}")
        sys.exit(1)
    return client, client[env["DB_NAME"]]


def backup():
    client, db = get_db()

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

    size_mb = filepath.stat().st_size / 1024 / 1024
    print(f"\n[BACKUP] {total} documents -> {filepath}")
    print(f"[BACKUP] Taille: {size_mb:.1f} MB")

    # Rotation: garder les MAX_BACKUPS derniers
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
        backups = sorted(BACKUP_DIR.glob("backup_*.json"))
        if not backups:
            print("[ERREUR] Aucun backup trouve dans", BACKUP_DIR)
            return
        filepath = backups[-1]
    else:
        filepath = Path(filepath)

    if not filepath.exists():
        print(f"[ERREUR] Fichier non trouve: {filepath}")
        return

    print(f"[RESTORE] Depuis: {filepath}")
    print(f"[ATTENTION] Cela va REMPLACER toutes les donnees actuelles.")
    confirm = input("  Continuer? (oui/non): ").strip().lower()
    if confirm != "oui":
        print("  Annule.")
        return

    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    client, db = get_db()

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
    print("[RESET] Cette action va SUPPRIMER toutes les donnees!")
    confirm = input("  Tapez 'SUPPRIMER' pour confirmer: ").strip()
    if confirm != "SUPPRIMER":
        print("  Annule.")
        return

    client, db = get_db()

    for col_name in COLLECTIONS:
        db[col_name].drop()
        print(f"  [x] {col_name} supprime")

    print("[RESET] Base videe.")
    print("  Pour recreer les donnees: python3 seed_demo.py")
    client.close()


def status():
    client, db = get_db()
    env = load_env()

    print(f"\n  Base: {env['MONGO_URL']}/{env['DB_NAME']}")
    print(f"  {'─'*40}")
    total = 0
    for col_name in COLLECTIONS:
        count = db[col_name].count_documents({})
        total += count
        print(f"  {col_name:30s} {count:>5d} docs")
    print(f"  {'─'*40}")
    print(f"  {'TOTAL':30s} {total:>5d} docs")

    # Backups existants
    backups = sorted(BACKUP_DIR.glob("backup_*.json"))
    print(f"\n  Backups disponibles: {len(backups)}")
    for b in backups[-3:]:
        size = b.stat().st_size / 1024
        print(f"    {b.name} ({size:.0f} KB)")

    client.close()


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "backup"

    if cmd == "backup":
        backup()
    elif cmd == "restore":
        fp = sys.argv[2] if len(sys.argv) > 2 else None
        restore(fp)
    elif cmd == "reset":
        reset()
    elif cmd == "status":
        status()
    else:
        print("Usage: python3 backup.py [backup|restore|reset|status]")
