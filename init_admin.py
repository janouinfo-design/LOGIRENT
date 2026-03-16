"""
Script d'initialisation LogiRent - Créer le Super Admin
À exécuter UNE SEULE FOIS sur le VPS de production

Usage: python3 init_admin.py
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from datetime import datetime
import uuid

# Configuration - MODIFIER SI NÉCESSAIRE
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "logirent"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def main():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    # 1. Créer le Super Admin
    super_admin_email = "admin@logirent.ch"  # <-- CHANGEZ SI VOUS VOULEZ
    super_admin_password = "LogiRent2024!"    # <-- CHANGEZ CE MOT DE PASSE
    
    existing = await db.users.find_one({"email": super_admin_email})
    if existing:
        print(f"Super Admin '{super_admin_email}' existe déjà!")
    else:
        admin = {
            "id": str(uuid.uuid4()),
            "email": super_admin_email,
            "password_hash": pwd_context.hash(super_admin_password),
            "name": "Super Admin",
            "role": "super_admin",
            "is_active": True,
            "created_at": datetime.utcnow(),
        }
        await db.users.insert_one(admin)
        print(f"✅ Super Admin créé!")
        print(f"   Email: {super_admin_email}")
        print(f"   Mot de passe: {super_admin_password}")

    # 2. Créer une agence par défaut (Geneva)
    existing_agency = await db.agencies.find_one({"name": {"$regex": "Geneva|Genève", "$options": "i"}})
    if existing_agency:
        print(f"Agence existe déjà: {existing_agency.get('name')}")
        agency_id = existing_agency.get("id")
    else:
        agency_id = str(uuid.uuid4())
        agency = {
            "id": agency_id,
            "name": "LogiRent Geneva",
            "address": "Geneva, Switzerland",
            "city": "Geneva",
            "phone": "",
            "email": "contact@logirent.ch",
            "website": "www.logirent.ch",
            "is_active": True,
            "created_at": datetime.utcnow(),
        }
        await db.agencies.insert_one(agency)
        print(f"✅ Agence 'LogiRent Geneva' créée (ID: {agency_id})")

    # 3. Créer un Admin Agence
    agency_admin_email = "admin-geneva@logirent.ch"  # <-- CHANGEZ SI VOUS VOULEZ
    agency_admin_password = "LogiRent2024"            # <-- CHANGEZ CE MOT DE PASSE
    
    existing_aa = await db.users.find_one({"email": agency_admin_email})
    if existing_aa:
        print(f"Admin Agence '{agency_admin_email}' existe déjà!")
    else:
        aa = {
            "id": str(uuid.uuid4()),
            "email": agency_admin_email,
            "password_hash": pwd_context.hash(agency_admin_password),
            "name": "Admin Geneva",
            "role": "agency_admin",
            "agency_id": agency_id,
            "is_active": True,
            "created_at": datetime.utcnow(),
        }
        await db.users.insert_one(aa)
        print(f"✅ Admin Agence créé!")
        print(f"   Email: {agency_admin_email}")
        print(f"   Mot de passe: {agency_admin_password}")

    print("\n🎉 Initialisation terminée!")
    print(f"\nConnectez-vous sur app.logirent.ch:")
    print(f"  Super Admin:  {super_admin_email}")
    print(f"  Admin Agence: {agency_admin_email}")
    
    client.close()

asyncio.run(main())
