#!/usr/bin/env python3
"""
LogiRent - Script de seed complet
==================================
Remplit la base MongoDB "logirent" avec des donnees de test.

Usage sur VPS:
    cd ~/apps/LOGIRENT
    source venv/bin/activate  (ou backend/venv/bin/activate)
    pip install pymongo bcrypt dnspython
    python3 seed_logirent.py
"""

import uuid
from datetime import datetime, timedelta

# ==================== CONFIGURATION ====================
MONGO_URL = "mongodb+srv://janouinfo_db_user:Omar2007@cluster0.isugn1l.mongodb.net/?appName=Cluster0"
DB_NAME = "logirent"
DEFAULT_PASSWORD = "LogiRent2024!"
# ========================================================


def uid():
    return str(uuid.uuid4())


def main():
    try:
        import pymongo
        import bcrypt
    except ImportError:
        print("Installez les dependances:")
        print("  pip install pymongo bcrypt dnspython")
        return

    def hp(pw):
        return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    print("=" * 55)
    print("  LOGIRENT - SEED DATABASE")
    print("=" * 55)
    print(f"  MongoDB: {MONGO_URL[:50]}...")
    print(f"  DB:      {DB_NAME}")
    print("=" * 55)

    client = pymongo.MongoClient(MONGO_URL)
    db = client[DB_NAME]

    try:
        client.admin.command("ping")
        print("\n  Connexion MongoDB OK\n")
    except Exception as e:
        print(f"\n  ERREUR connexion: {e}")
        return

    now = datetime.utcnow()
    counts = {"agencies": 0, "users": 0, "vehicles": 0, "reservations": 0}

    # ==================== AGENCES ====================
    print("--- AGENCES ---")
    agencies_data = [
        {"name": "LogiRent Geneve", "slug": "logirent-geneve", "address": "Rue du Rhone 42, 1204 Geneve", "phone": "+41 22 300 00 01", "email": "geneve@logirent.ch"},
        {"name": "LogiRent Lausanne", "slug": "logirent-lausanne", "address": "Avenue de la Gare 10, 1003 Lausanne", "phone": "+41 21 300 00 02", "email": "lausanne@logirent.ch"},
        {"name": "LogiRent Zurich", "slug": "logirent-zurich", "address": "Bahnhofstrasse 25, 8001 Zurich", "phone": "+41 44 300 00 03", "email": "zurich@logirent.ch"},
    ]

    agency_ids = {}
    for a in agencies_data:
        existing = db.agencies.find_one({"slug": a["slug"]})
        if existing:
            agency_ids[a["slug"]] = existing["id"]
            print(f"  [EXISTE] {a['name']}")
        else:
            aid = uid()
            agency_ids[a["slug"]] = aid
            db.agencies.insert_one({
                "id": aid, "name": a["name"], "slug": a["slug"],
                "address": a["address"], "phone": a["phone"], "email": a["email"],
                "logo": None, "navixy_api_url": None, "navixy_hash": None,
                "is_active": True, "created_at": now,
            })
            counts["agencies"] += 1
            print(f"  [CREE]   {a['name']}")

    gva = agency_ids["logirent-geneve"]
    lsn = agency_ids["logirent-lausanne"]
    zrh = agency_ids["logirent-zurich"]

    # ==================== UTILISATEURS ====================
    print("\n--- UTILISATEURS ---")
    users_data = [
        {"email": "superadmin@logirent.ch", "name": "Super Admin", "role": "super_admin", "agency_id": None, "phone": "+41 79 100 00 00"},
        {"email": "admin-geneva@logirent.ch", "name": "Admin Geneve", "role": "admin", "agency_id": gva, "phone": "+41 79 200 00 01"},
        {"email": "admin-lausanne@logirent.ch", "name": "Admin Lausanne", "role": "admin", "agency_id": lsn, "phone": "+41 79 200 00 02"},
        {"email": "admin-zurich@logirent.ch", "name": "Admin Zurich", "role": "admin", "agency_id": zrh, "phone": "+41 79 200 00 03"},
        {"email": "manager@test.ch", "name": "Marc Dupont", "role": "admin", "agency_id": gva, "phone": "+41 79 300 00 01"},
        {"email": "employe@test.ch", "name": "Julie Martin", "role": "admin", "agency_id": lsn, "phone": "+41 79 300 00 02"},
        {"email": "client1@logirent.ch", "name": "Pierre Muller", "role": "client", "agency_id": gva, "phone": "+41 79 400 00 01"},
        {"email": "client2@logirent.ch", "name": "Sophie Berger", "role": "client", "agency_id": gva, "phone": "+41 79 400 00 02"},
        {"email": "client3@logirent.ch", "name": "Thomas Weber", "role": "client", "agency_id": lsn, "phone": "+41 79 400 00 03"},
        {"email": "client4@logirent.ch", "name": "Anna Schmidt", "role": "client", "agency_id": zrh, "phone": "+41 79 400 00 04"},
    ]

    user_ids = {}
    password_hash = hp(DEFAULT_PASSWORD)
    for u in users_data:
        existing = db.users.find_one({"email": u["email"].lower()})
        if existing:
            user_ids[u["email"]] = existing["id"]
            print(f"  [EXISTE] {u['email']} ({u['role']})")
        else:
            user_id = uid()
            user_ids[u["email"]] = user_id
            db.users.insert_one({
                "id": user_id, "email": u["email"].lower(),
                "password_hash": password_hash, "name": u["name"],
                "phone": u["phone"], "address": None,
                "id_photo": None, "license_photo": None, "profile_photo": None,
                "birth_place": None, "date_of_birth": None,
                "license_number": None, "license_issue_date": None, "license_expiry_date": None,
                "nationality": "Suisse",
                "role": u["role"], "agency_id": u["agency_id"],
                "is_active": True, "created_at": now,
            })
            counts["users"] += 1
            print(f"  [CREE]   {u['email']} ({u['role']})")

    # ==================== VEHICULES ====================
    print("\n--- VEHICULES ---")
    vehicles_data = [
        # Geneve (3)
        {"brand": "BMW", "model": "Serie 3", "year": 2024, "type": "berline", "price": 120, "plate": "GE 100 001", "chassis": "WBA3A5C50FK123001", "color": "Noir", "seats": 5, "trans": "automatic", "fuel": "hybrid", "loc": "Geneve", "agency": gva,
         "photo": "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800", "desc": "BMW Serie 3 hybride, equipement premium."},
        {"brand": "Mercedes", "model": "Classe C", "year": 2023, "type": "berline", "price": 150, "plate": "GE 200 002", "chassis": "WDD2050041R234002", "color": "Blanc", "seats": 5, "trans": "automatic", "fuel": "diesel", "loc": "Geneve", "agency": gva,
         "photo": "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800", "desc": "Mercedes Classe C, interieur cuir."},
        {"brand": "Tesla", "model": "Model 3", "year": 2024, "type": "berline", "price": 200, "plate": "GE 300 003", "chassis": "5YJ3E1EA7KF345003", "color": "Rouge", "seats": 5, "trans": "automatic", "fuel": "electric", "loc": "Geneve", "agency": gva,
         "photo": "https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800", "desc": "Tesla Model 3 Long Range, autopilot inclus."},
        # Lausanne (3)
        {"brand": "Audi", "model": "Q5", "year": 2024, "type": "SUV", "price": 180, "plate": "VD 400 004", "chassis": "WAUZZZFY5MA456004", "color": "Gris", "seats": 5, "trans": "automatic", "fuel": "diesel", "loc": "Lausanne", "agency": lsn,
         "photo": "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800", "desc": "Audi Q5 Quattro, ideal pour la montagne."},
        {"brand": "Volkswagen", "model": "Golf", "year": 2023, "type": "citadine", "price": 65, "plate": "VD 500 005", "chassis": "WVWZZZAUZME567005", "color": "Bleu", "seats": 5, "trans": "manual", "fuel": "essence", "loc": "Lausanne", "agency": lsn,
         "photo": "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800", "desc": "Volkswagen Golf 8, compacte et economique."},
        {"brand": "Renault", "model": "Kangoo", "year": 2023, "type": "utilitaire", "price": 85, "plate": "VD 600 006", "chassis": "VF1FK0AH0HY678006", "color": "Blanc", "seats": 2, "trans": "manual", "fuel": "diesel", "loc": "Lausanne", "agency": lsn,
         "photo": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800", "desc": "Renault Kangoo utilitaire, grand volume."},
        # Zurich (2)
        {"brand": "Porsche", "model": "Cayenne", "year": 2024, "type": "SUV", "price": 350, "plate": "ZH 700 007", "chassis": "WP1AB29P19LA789007", "color": "Noir", "seats": 5, "trans": "automatic", "fuel": "hybrid", "loc": "Zurich", "agency": zrh,
         "photo": "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800", "desc": "Porsche Cayenne E-Hybrid, luxe et performance."},
        {"brand": "Toyota", "model": "Yaris", "year": 2023, "type": "citadine", "price": 55, "plate": "ZH 800 008", "chassis": "JTDKN3DU5A0890008", "color": "Vert", "seats": 5, "trans": "automatic", "fuel": "hybrid", "loc": "Zurich", "agency": zrh,
         "photo": "https://images.unsplash.com/photo-1549317661-bd32c8ce0afa?w=800", "desc": "Toyota Yaris hybride, ultra economique."},
    ]

    vehicle_ids = {}
    options_gps = {"name": "GPS", "price_per_day": 10.0}
    options_baby = {"name": "Siege bebe", "price_per_day": 15.0}
    options_driver = {"name": "Conducteur additionnel", "price_per_day": 20.0}

    for v in vehicles_data:
        existing = db.vehicles.find_one({"plate_number": v["plate"]})
        if existing:
            vehicle_ids[v["plate"]] = existing["id"]
            print(f"  [EXISTE] {v['brand']} {v['model']} ({v['plate']})")
        else:
            vid = uid()
            vehicle_ids[v["plate"]] = vid
            db.vehicles.insert_one({
                "id": vid, "brand": v["brand"], "model": v["model"],
                "year": v["year"], "type": v["type"], "price_per_day": v["price"],
                "photos": [v["photo"]], "description": v["desc"],
                "seats": v["seats"], "transmission": v["trans"], "fuel_type": v["fuel"],
                "options": [options_gps, options_baby, options_driver],
                "status": "available", "location": v["loc"],
                "plate_number": v["plate"], "chassis_number": v["chassis"], "color": v["color"],
                "documents": [], "agency_id": v["agency"],
                "created_at": now,
            })
            counts["vehicles"] += 1
            print(f"  [CREE]   {v['brand']} {v['model']} ({v['plate']})")

    # ==================== RESERVATIONS ====================
    print("\n--- RESERVATIONS ---")

    # Helper
    def make_res(client_email, plate, agency_id, days_offset, duration, status, pay_status, pay_method):
        start = now + timedelta(days=days_offset)
        end = start + timedelta(days=duration)
        vid = vehicle_ids.get(plate)
        cid = user_ids.get(client_email)
        if not vid or not cid:
            return None
        veh = db.vehicles.find_one({"id": vid})
        ppd = veh["price_per_day"] if veh else 100
        base = ppd * duration
        return {
            "id": uid(), "user_id": cid, "vehicle_id": vid, "agency_id": agency_id,
            "start_date": start, "end_date": end, "options": [],
            "total_days": duration, "base_price": base, "options_price": 0, "total_price": base,
            "status": status, "payment_method": pay_method,
            "payment_session_id": None, "payment_status": pay_status,
            "created_at": now - timedelta(days=max(0, -days_offset + 2)),
            "updated_at": now,
        }

    reservations_data = [
        # Geneve
        ("client1@logirent.ch", "GE 100 001", gva, -10, 5, "completed", "paid", "card"),
        ("client2@logirent.ch", "GE 200 002", gva, -3, 7, "active", "paid", "cash"),
        ("client1@logirent.ch", "GE 300 003", gva, 2, 3, "confirmed", "paid", "card"),
        ("client2@logirent.ch", "GE 100 001", gva, 7, 4, "pending", "unpaid", "card"),
        # Lausanne
        ("client3@logirent.ch", "VD 400 004", lsn, -15, 10, "completed", "paid", "card"),
        ("client3@logirent.ch", "VD 500 005", lsn, -1, 5, "active", "paid", "cash"),
        ("client3@logirent.ch", "VD 600 006", lsn, 5, 2, "confirmed", "paid", "card"),
        # Zurich
        ("client4@logirent.ch", "ZH 700 007", zrh, -20, 7, "completed", "paid", "card"),
        ("client4@logirent.ch", "ZH 800 008", zrh, 0, 3, "active", "paid", "cash"),
        ("client4@logirent.ch", "ZH 700 007", zrh, 10, 5, "pending", "unpaid", "card"),
    ]

    existing_res_count = db.reservations.count_documents({})
    if existing_res_count > 0:
        print(f"  [EXISTE] {existing_res_count} reservations deja presentes, on passe.")
    else:
        for r in reservations_data:
            res = make_res(*r)
            if res:
                db.reservations.insert_one(res)
                counts["reservations"] += 1
                veh = db.vehicles.find_one({"id": res["vehicle_id"]})
                vname = f"{veh['brand']} {veh['model']}" if veh else "?"
                print(f"  [CREE]   {r[0]} -> {vname} ({r[5]})")

    # ==================== CONTRAT TEMPLATES ====================
    print("\n--- TEMPLATES CONTRAT ---")
    for slug, aid in [("logirent-geneve", gva), ("logirent-lausanne", lsn), ("logirent-zurich", zrh)]:
        existing = db.contract_templates.find_one({"agency_id": aid})
        if existing:
            print(f"  [EXISTE] Template {slug}")
        else:
            db.contract_templates.insert_one({
                "id": uid(), "agency_id": aid,
                "legal_text": (
                    "Le/la soussigne(e) declare avoir pris connaissance et accepter les conditions generales "
                    "de location, lesquelles font partie integrante du present document.\n\n"
                    "Le locataire s'engage a utiliser le vehicule avec diligence et a respecter strictement "
                    "la Loi federale sur la circulation routiere (LCR).\n\n"
                    "Les dommages couverts par l'assurance Casco collision du loueur sont soumis a une franchise de "
                    "CHF {franchise}.-- par sinistre, a la charge du locataire."
                ),
                "default_prices": {"jour": 100, "semaine": 600, "mois": 2000},
                "deductible": "1500",
                "agency_website": "https://logirent.ch",
                "logo_path": None,
                "created_at": now.isoformat(), "updated_at": now.isoformat(),
            })
            print(f"  [CREE]   Template {slug}")

    # ==================== RESUME ====================
    client.close()

    print("\n" + "=" * 55)
    print("  SEED TERMINE AVEC SUCCES!")
    print("=" * 55)
    print(f"  Agences creees:      {counts['agencies']}")
    print(f"  Utilisateurs crees:  {counts['users']}")
    print(f"  Vehicules crees:     {counts['vehicles']}")
    print(f"  Reservations creees: {counts['reservations']}")
    print("=" * 55)
    print(f"\n  Mot de passe pour TOUS les comptes: {DEFAULT_PASSWORD}")
    print()
    print("  COMPTES:")
    print(f"    Super Admin:   superadmin@logirent.ch")
    print(f"    Admin Geneve:  admin-geneva@logirent.ch")
    print(f"    Admin Lausanne: admin-lausanne@logirent.ch")
    print(f"    Admin Zurich:  admin-zurich@logirent.ch")
    print(f"    Manager:       manager@test.ch")
    print(f"    Employe:       employe@test.ch")
    print(f"    Client 1:      client1@logirent.ch")
    print(f"    Client 2:      client2@logirent.ch")
    print(f"    Client 3:      client3@logirent.ch")
    print(f"    Client 4:      client4@logirent.ch")
    print("=" * 55)


if __name__ == "__main__":
    main()
