#!/usr/bin/env python3
"""
LogiRent - Script de création du Super Admin
=============================================
Exécutez ce script sur votre VPS pour créer le premier Super Admin
dans votre base de données MongoDB Atlas.

Usage:
    python3 seed_superadmin.py

Prérequis:
    pip install pymongo bcrypt dnspython
"""

import uuid
from datetime import datetime

# ==================== CONFIGURATION ====================
# Modifiez ces valeurs selon votre configuration

MONGO_URL = "mongodb+srv://janouinfo_db_user:Omar2007@cluster0.isugn1l.mongodb.net/?appName=Cluster0"
DB_NAME = "logirent"  # Nom de votre base de données de production

# Informations du Super Admin
SUPER_ADMIN_EMAIL = "admin@logirent.ch"
SUPER_ADMIN_PASSWORD = "LogiRent2024!"
SUPER_ADMIN_NAME = "Super Admin LogiRent"

# ==================== SCRIPT ====================

def main():
    try:
        import pymongo
        import bcrypt
    except ImportError:
        print("Installez les dépendances requises:")
        print("  pip install pymongo bcrypt dnspython")
        return

    print("Connexion a MongoDB Atlas...")
    client = pymongo.MongoClient(MONGO_URL)
    db = client[DB_NAME]

    # Verifier la connexion
    try:
        client.admin.command('ping')
        print("Connexion reussie!")
    except Exception as e:
        print(f"Erreur de connexion: {e}")
        return

    # Verifier si le super admin existe deja
    existing = db.users.find_one({"email": SUPER_ADMIN_EMAIL.lower()})
    if existing:
        print(f"Un utilisateur avec l'email {SUPER_ADMIN_EMAIL} existe deja.")
        print(f"  Role: {existing.get('role', 'N/A')}")
        print(f"  Nom: {existing.get('name', 'N/A')}")
        client.close()
        return

    # Hasher le mot de passe
    password_hash = bcrypt.hashpw(
        SUPER_ADMIN_PASSWORD.encode('utf-8'),
        bcrypt.gensalt()
    ).decode('utf-8')

    # Creer le super admin
    super_admin = {
        "id": str(uuid.uuid4()),
        "email": SUPER_ADMIN_EMAIL.lower(),
        "password_hash": password_hash,
        "name": SUPER_ADMIN_NAME,
        "phone": None,
        "address": None,
        "id_photo": None,
        "license_photo": None,
        "profile_photo": None,
        "role": "super_admin",
        "agency_id": None,
        "created_at": datetime.utcnow()
    }

    db.users.insert_one(super_admin)
    print("")
    print("=" * 50)
    print("  SUPER ADMIN CREE AVEC SUCCES!")
    print("=" * 50)
    print(f"  Email:    {SUPER_ADMIN_EMAIL}")
    print(f"  Mot de passe: {SUPER_ADMIN_PASSWORD}")
    print(f"  Role:     super_admin")
    print(f"  DB:       {DB_NAME}")
    print("=" * 50)
    print("")
    print("Vous pouvez maintenant vous connecter a LogiRent")
    print("avec ces identifiants.")

    client.close()


if __name__ == "__main__":
    main()
