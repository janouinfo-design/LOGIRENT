#!/usr/bin/env python3
"""
LogiRent - Seed complet avec données réalistes pour 1 mois
============================================================
Insère agences, clients détaillés, véhicules avec photos, et 30+ réservations
sur 1 mois complet pour une démonstration crédible.

Usage:
    python3 seed_demo.py
"""

import uuid, os, sys
from datetime import datetime, timedelta
from pathlib import Path

# ==================== CONFIG ====================
# Try to read from backend .env, fallback to Atlas
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")
DEFAULT_PASSWORD = "LogiRent2024!"
# ================================================

def uid():
    return str(uuid.uuid4())

def main():
    try:
        import pymongo
        import bcrypt
    except ImportError:
        print("pip install pymongo bcrypt dnspython")
        return

    def hp(pw):
        return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    client = pymongo.MongoClient(MONGO_URL)
    db = client[DB_NAME]
    try:
        client.admin.command("ping")
    except Exception as e:
        print(f"ERREUR connexion: {e}")
        return

    now = datetime.utcnow()
    counts = {"agencies": 0, "users": 0, "vehicles": 0, "reservations": 0}

    # ==================== AGENCES ====================
    print("--- AGENCES ---")
    agencies = [
        {"name": "LogiRent Geneve", "slug": "logirent-geneve", "address": "Rue du Rhone 42, 1204 Geneve", "phone": "+41 22 300 00 01", "email": "geneve@logirent.ch"},
        {"name": "LogiRent Lausanne", "slug": "logirent-lausanne", "address": "Avenue de la Gare 10, 1003 Lausanne", "phone": "+41 21 300 00 02", "email": "lausanne@logirent.ch"},
    ]
    agency_ids = {}
    for a in agencies:
        ex = db.agencies.find_one({"slug": a["slug"]})
        if ex:
            agency_ids[a["slug"]] = ex["id"]
            print(f"  [OK] {a['name']}")
        else:
            aid = uid()
            agency_ids[a["slug"]] = aid
            db.agencies.insert_one({"id": aid, **a, "logo": None, "navixy_api_url": None, "navixy_hash": None, "is_active": True, "created_at": now})
            counts["agencies"] += 1
            print(f"  [+] {a['name']}")

    gva = agency_ids["logirent-geneve"]
    lsn = agency_ids["logirent-lausanne"]

    # ==================== UTILISATEURS ====================
    print("\n--- UTILISATEURS ---")
    pw = hp(DEFAULT_PASSWORD)
    users = [
        {"email": "superadmin@logirent.ch", "name": "Omar Bensalem", "role": "super_admin", "agency_id": None, "phone": "+41 79 100 00 00", "address": "Rue de Berne 15, 1201 Geneve", "nationality": "Suisse", "date_of_birth": "1985-03-15", "license_number": "CH-GE-2020-45678"},
        {"email": "admin-geneva@logirent.ch", "name": "Marc Favre", "role": "admin", "agency_id": gva, "phone": "+41 79 200 00 01", "address": "Rue de Carouge 88, 1205 Geneve", "nationality": "Suisse", "date_of_birth": "1980-07-22", "license_number": "CH-GE-2018-12345"},
        {"email": "admin-lausanne@logirent.ch", "name": "Claire Dubois", "role": "admin", "agency_id": lsn, "phone": "+41 79 200 00 02", "address": "Avenue d'Ouchy 4, 1006 Lausanne", "nationality": "Suisse", "date_of_birth": "1988-11-05", "license_number": "CH-VD-2019-67890"},
        {"email": "jean.dupont@gmail.com", "name": "Jean Dupont", "role": "client", "agency_id": gva, "phone": "+41 78 111 22 33", "address": "Chemin des Tulipes 12, 1208 Geneve", "nationality": "Suisse", "date_of_birth": "1992-01-18", "license_number": "CH-GE-2015-11111"},
        {"email": "sophie.martin@outlook.com", "name": "Sophie Martin", "role": "client", "agency_id": gva, "phone": "+41 76 222 33 44", "address": "Rue de Lyon 25, 1201 Geneve", "nationality": "France", "date_of_birth": "1989-06-30", "license_number": "FR-75-2017-22222"},
        {"email": "thomas.weber@bluewin.ch", "name": "Thomas Weber", "role": "client", "agency_id": gva, "phone": "+41 79 333 44 55", "address": "Boulevard Carl-Vogt 60, 1205 Geneve", "nationality": "Suisse", "date_of_birth": "1995-09-12", "license_number": "CH-GE-2018-33333"},
        {"email": "anna.schmidt@gmail.com", "name": "Anna Schmidt", "role": "client", "agency_id": gva, "phone": "+41 78 444 55 66", "address": "Rue de la Servette 40, 1202 Geneve", "nationality": "Allemagne", "date_of_birth": "1991-04-25", "license_number": "DE-BER-2016-44444"},
        {"email": "pierre.muller@yahoo.fr", "name": "Pierre Muller", "role": "client", "agency_id": lsn, "phone": "+41 76 555 66 77", "address": "Rue du Petit-Chene 18, 1003 Lausanne", "nationality": "Suisse", "date_of_birth": "1987-12-08", "license_number": "CH-VD-2014-55555"},
        {"email": "marie.roux@hotmail.com", "name": "Marie Roux", "role": "client", "agency_id": lsn, "phone": "+41 79 666 77 88", "address": "Avenue de Cour 72, 1007 Lausanne", "nationality": "France", "date_of_birth": "1993-08-14", "license_number": "FR-69-2019-66666"},
        {"email": "luca.ferrari@gmail.com", "name": "Luca Ferrari", "role": "client", "agency_id": lsn, "phone": "+41 78 777 88 99", "address": "Place de la Gare 5, 1003 Lausanne", "nationality": "Italie", "date_of_birth": "1990-02-28", "license_number": "IT-MI-2017-77777"},
        {"email": "nina.keller@proton.me", "name": "Nina Keller", "role": "client", "agency_id": gva, "phone": "+41 76 888 99 00", "address": "Route de Ferney 120, 1218 Le Grand-Saconnex", "nationality": "Suisse", "date_of_birth": "1994-05-19", "license_number": "CH-GE-2020-88888"},
        {"email": "david.blanc@sunrise.ch", "name": "David Blanc", "role": "client", "agency_id": gva, "phone": "+41 79 999 00 11", "address": "Rue de Montbrillant 36, 1201 Geneve", "nationality": "Suisse", "date_of_birth": "1986-10-03", "license_number": "CH-GE-2013-99999"},
    ]
    user_ids = {}
    for u in users:
        ex = db.users.find_one({"email": u["email"].lower()})
        if ex:
            user_ids[u["email"]] = ex["id"]
            print(f"  [OK] {u['email']} ({u['role']})")
        else:
            user_id = uid()
            user_ids[u["email"]] = user_id
            db.users.insert_one({
                "id": user_id, "email": u["email"].lower(), "password_hash": pw,
                "name": u["name"], "phone": u["phone"], "address": u.get("address"),
                "id_photo": None, "license_photo": None, "profile_photo": None,
                "birth_place": None, "date_of_birth": u.get("date_of_birth"),
                "license_number": u.get("license_number"),
                "license_issue_date": None, "license_expiry_date": None,
                "nationality": u.get("nationality", "Suisse"),
                "role": u["role"], "agency_id": u["agency_id"],
                "is_active": True, "created_at": now - timedelta(days=60),
            })
            counts["users"] += 1
            print(f"  [+] {u['email']} ({u['role']})")

    # ==================== VEHICULES ====================
    print("\n--- VEHICULES ---")
    vehicles = [
        {"brand": "BMW", "model": "Serie 3 320d", "year": 2024, "type": "berline", "price": 120, "plate": "GE 100 001", "chassis": "WBA3A5C50FK123001", "color": "Noir Saphir", "seats": 5, "trans": "automatic", "fuel": "diesel", "loc": "Geneve", "agency": gva, "status": "available",
         "photo": "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&q=80", "desc": "BMW Serie 3 320d, finition M Sport, GPS, camera de recul, sieges chauffants."},
        {"brand": "Mercedes-Benz", "model": "Classe C 200", "year": 2023, "type": "berline", "price": 150, "plate": "GE 200 002", "chassis": "WDD2050041R234002", "color": "Blanc Polaire", "seats": 5, "trans": "automatic", "fuel": "essence", "loc": "Geneve", "agency": gva, "status": "rented",
         "photo": "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&q=80", "desc": "Mercedes Classe C 200, interieur cuir beige, toit ouvrant panoramique."},
        {"brand": "Tesla", "model": "Model 3 Long Range", "year": 2024, "type": "berline", "price": 200, "plate": "GE 300 003", "chassis": "5YJ3E1EA7KF345003", "color": "Rouge Multi-couches", "seats": 5, "trans": "automatic", "fuel": "electric", "loc": "Geneve", "agency": gva, "status": "available",
         "photo": "https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800&q=80", "desc": "Tesla Model 3 LR, autopilot, 580km d'autonomie, supercharge gratuit 1 an."},
        {"brand": "Volkswagen", "model": "Golf 8 Life", "year": 2023, "type": "citadine", "price": 65, "plate": "GE 400 004", "chassis": "WVWZZZAUZME567004", "color": "Bleu Atlantic", "seats": 5, "trans": "manual", "fuel": "essence", "loc": "Geneve", "agency": gva, "status": "available",
         "photo": "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&q=80", "desc": "VW Golf 8, compacte et econome, Apple CarPlay, aide au stationnement."},
        {"brand": "Audi", "model": "Q5 45 TFSI", "year": 2024, "type": "SUV", "price": 180, "plate": "GE 500 005", "chassis": "WAUZZZFY5MA456005", "color": "Gris Daytona", "seats": 5, "trans": "automatic", "fuel": "hybrid", "loc": "Geneve", "agency": gva, "status": "available",
         "photo": "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800&q=80", "desc": "Audi Q5 Quattro hybride, Virtual Cockpit, bang & olufsen, attelage."},
        {"brand": "Renault", "model": "Kangoo Van", "year": 2023, "type": "utilitaire", "price": 75, "plate": "GE 600 006", "chassis": "VF1FK0AH0HY678006", "color": "Blanc Glacier", "seats": 2, "trans": "manual", "fuel": "diesel", "loc": "Geneve", "agency": gva, "status": "available",
         "photo": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80", "desc": "Renault Kangoo utilitaire, 3.3m3, porte laterale coulissante, GPS."},
        {"brand": "Toyota", "model": "Yaris Hybrid", "year": 2024, "type": "citadine", "price": 55, "plate": "VD 700 007", "chassis": "JTDKN3DU5A0890007", "color": "Vert Kaki", "seats": 5, "trans": "automatic", "fuel": "hybrid", "loc": "Lausanne", "agency": lsn, "status": "available",
         "photo": "https://images.unsplash.com/photo-1549317661-bd32c8ce0afa?w=800&q=80", "desc": "Toyota Yaris hybride, 3.8L/100km, camera 360, ecran tactile 10 pouces."},
        {"brand": "Porsche", "model": "Cayenne E-Hybrid", "year": 2024, "type": "SUV", "price": 350, "plate": "VD 800 008", "chassis": "WP1AB29P19LA789008", "color": "Noir Intense", "seats": 5, "trans": "automatic", "fuel": "hybrid", "loc": "Lausanne", "agency": lsn, "status": "available",
         "photo": "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80", "desc": "Porsche Cayenne E-Hybrid 470ch, cuir, BOSE, toit panoramique."},
        {"brand": "Fiat", "model": "500 Electrique", "year": 2024, "type": "citadine", "price": 50, "plate": "VD 900 009", "chassis": "ZFAEF00A0F1234009", "color": "Rose Pastel", "seats": 4, "trans": "automatic", "fuel": "electric", "loc": "Lausanne", "agency": lsn, "status": "available",
         "photo": "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800&q=80", "desc": "Fiat 500e, 320km autonomie, parfaite pour la ville, design retro chic."},
        {"brand": "Mercedes-Benz", "model": "Vito Tourer", "year": 2023, "type": "van", "price": 160, "plate": "VD 110 010", "chassis": "WDF44760313456010", "color": "Gris Tenorite", "seats": 9, "trans": "automatic", "fuel": "diesel", "loc": "Lausanne", "agency": lsn, "status": "available",
         "photo": "https://images.unsplash.com/photo-1570829460005-c840387bb1ca?w=800&q=80", "desc": "Mercedes Vito 9 places, ideal familles ou groupes, climatisation arriere, GPS."},
        {"brand": "Range Rover", "model": "Evoque P250", "year": 2024, "type": "SUV", "price": 220, "plate": "GE 120 011", "chassis": "SALVA2BN8LH123011", "color": "Bleu Byron", "seats": 5, "trans": "automatic", "fuel": "essence", "loc": "Geneve", "agency": gva, "status": "maintenance",
         "photo": "https://images.unsplash.com/photo-1519245659620-e859806a8d7b?w=800&q=80", "desc": "Range Rover Evoque, cuir Windsor, Meridian audio, toit panoramique."},
        {"brand": "Peugeot", "model": "3008 GT", "year": 2024, "type": "SUV", "price": 110, "plate": "VD 130 012", "chassis": "VF3MCYHZRMS456012", "color": "Vert Olivine", "seats": 5, "trans": "automatic", "fuel": "hybrid", "loc": "Lausanne", "agency": lsn, "status": "available",
         "photo": "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&q=80", "desc": "Peugeot 3008 GT hybrid 225ch, i-Cockpit, Night Vision, grip control."},
    ]

    vehicle_ids = {}
    opts = [{"name": "GPS", "price_per_day": 10.0}, {"name": "Siege bebe", "price_per_day": 15.0}, {"name": "Conducteur additionnel", "price_per_day": 20.0}]
    for v in vehicles:
        ex = db.vehicles.find_one({"plate_number": v["plate"]})
        if ex:
            vehicle_ids[v["plate"]] = ex["id"]
            print(f"  [OK] {v['brand']} {v['model']}")
        else:
            vid = uid()
            vehicle_ids[v["plate"]] = vid
            db.vehicles.insert_one({
                "id": vid, "brand": v["brand"], "model": v["model"], "year": v["year"],
                "type": v["type"], "price_per_day": v["price"], "photos": [v["photo"]],
                "description": v["desc"], "seats": v["seats"], "transmission": v["trans"],
                "fuel_type": v["fuel"], "options": opts, "status": v["status"],
                "location": v["loc"], "plate_number": v["plate"],
                "chassis_number": v["chassis"], "color": v["color"],
                "documents": [], "agency_id": v["agency"], "created_at": now - timedelta(days=90),
            })
            counts["vehicles"] += 1
            print(f"  [+] {v['brand']} {v['model']} ({v['plate']})")

    # ==================== RESERVATIONS (30+ sur 1 mois) ====================
    print("\n--- RESERVATIONS ---")
    client_emails = [u["email"] for u in users if u["role"] == "client"]
    plates = [v["plate"] for v in vehicles]

    def mk(email, plate, agency, d_off, dur, status, pay_s, pay_m):
        s = now + timedelta(days=d_off)
        e = s + timedelta(days=dur)
        vid = vehicle_ids.get(plate)
        cid = user_ids.get(email)
        if not vid or not cid:
            return None
        vdoc = db.vehicles.find_one({"id": vid})
        ppd = vdoc["price_per_day"] if vdoc else 100
        total = ppd * dur
        return {
            "id": uid(), "user_id": cid, "vehicle_id": vid, "agency_id": agency,
            "start_date": s, "end_date": e, "options": [],
            "total_days": dur, "base_price": total, "options_price": 0, "total_price": total,
            "status": status, "payment_method": pay_m,
            "payment_session_id": None, "payment_status": pay_s,
            "created_at": now + timedelta(days=d_off - 3), "updated_at": now,
        }

    reservations = [
        # === Completed (past) ===
        ("jean.dupont@gmail.com",     "GE 100 001", gva, -28, 4, "completed", "paid", "card"),
        ("sophie.martin@outlook.com", "GE 200 002", gva, -25, 3, "completed", "paid", "cash"),
        ("thomas.weber@bluewin.ch",   "GE 300 003", gva, -22, 5, "completed", "paid", "card"),
        ("anna.schmidt@gmail.com",    "GE 400 004", gva, -20, 2, "completed", "paid", "card"),
        ("pierre.muller@yahoo.fr",    "VD 700 007", lsn, -26, 7, "completed", "paid", "cash"),
        ("marie.roux@hotmail.com",    "VD 800 008", lsn, -18, 3, "completed", "paid", "card"),
        ("luca.ferrari@gmail.com",    "VD 900 009", lsn, -21, 4, "completed", "paid", "card"),
        ("david.blanc@sunrise.ch",    "GE 500 005", gva, -15, 5, "completed", "paid", "cash"),
        ("nina.keller@proton.me",     "GE 600 006", gva, -17, 2, "completed", "paid", "card"),
        # === Active (now) ===
        ("sophie.martin@outlook.com", "GE 200 002", gva, -3, 7,  "active", "paid", "card"),
        ("thomas.weber@bluewin.ch",   "GE 100 001", gva, -1, 5,  "active", "paid", "cash"),
        ("pierre.muller@yahoo.fr",    "VD 800 008", lsn, -2, 6,  "active", "paid", "card"),
        ("luca.ferrari@gmail.com",    "VD 130 012", lsn, -1, 4,  "active", "paid", "card"),
        # === Confirmed (upcoming) ===
        ("jean.dupont@gmail.com",     "GE 300 003", gva, 2, 3,  "confirmed", "paid", "card"),
        ("anna.schmidt@gmail.com",    "GE 500 005", gva, 3, 4,  "confirmed", "paid", "cash"),
        ("nina.keller@proton.me",     "GE 400 004", gva, 4, 2,  "confirmed", "paid", "card"),
        ("marie.roux@hotmail.com",    "VD 700 007", lsn, 2, 5,  "confirmed", "paid", "card"),
        ("david.blanc@sunrise.ch",    "GE 600 006", gva, 5, 3,  "confirmed", "paid", "card"),
        # === Pending ===
        ("sophie.martin@outlook.com", "GE 100 001", gva, 8, 4,  "pending", "unpaid", "card"),
        ("thomas.weber@bluewin.ch",   "GE 300 003", gva, 10, 5, "pending", "unpaid", "card"),
        ("luca.ferrari@gmail.com",    "VD 900 009", lsn, 7, 3,  "pending", "unpaid", "cash"),
        ("pierre.muller@yahoo.fr",    "VD 110 010", lsn, 9, 6,  "pending", "unpaid", "card"),
        ("jean.dupont@gmail.com",     "GE 500 005", gva, 12, 3, "pending", "unpaid", "card"),
        # === Cancelled ===
        ("anna.schmidt@gmail.com",    "GE 200 002", gva, -10, 3, "cancelled", "refunded", "card"),
        ("marie.roux@hotmail.com",    "VD 700 007", lsn, -8, 2,  "cancelled", "refunded", "card"),
        # === More future to fill calendar ===
        ("david.blanc@sunrise.ch",    "GE 100 001", gva, 15, 4, "confirmed", "paid", "card"),
        ("nina.keller@proton.me",     "GE 300 003", gva, 14, 3, "confirmed", "paid", "cash"),
        ("sophie.martin@outlook.com", "GE 400 004", gva, 18, 2, "pending", "unpaid", "card"),
        ("thomas.weber@bluewin.ch",   "GE 500 005", gva, 20, 5, "pending", "unpaid", "card"),
        ("pierre.muller@yahoo.fr",    "VD 700 007", lsn, 16, 7, "confirmed", "paid", "card"),
        ("luca.ferrari@gmail.com",    "VD 800 008", lsn, 18, 4, "pending", "unpaid", "card"),
        ("marie.roux@hotmail.com",    "VD 130 012", lsn, 22, 3, "pending", "unpaid", "cash"),
    ]

    existing_count = db.reservations.count_documents({})
    if existing_count >= 25:
        print(f"  [OK] {existing_count} reservations existantes, on passe.")
    else:
        # Clear old and insert fresh
        if existing_count > 0:
            db.reservations.delete_many({})
            print(f"  [x] Anciennes reservations supprimees")
        for r in reservations:
            doc = mk(*r)
            if doc:
                db.reservations.insert_one(doc)
                counts["reservations"] += 1
        print(f"  [+] {counts['reservations']} reservations creees")

    # ==================== CONTRACT TEMPLATES ====================
    print("\n--- TEMPLATES CONTRAT ---")
    for slug, aid in [("logirent-geneve", gva), ("logirent-lausanne", lsn)]:
        if not db.contract_templates.find_one({"agency_id": aid}):
            db.contract_templates.insert_one({
                "id": uid(), "agency_id": aid,
                "legal_text": "Le/la soussigne(e) declare avoir pris connaissance et accepter les conditions generales de location. Le locataire s'engage a utiliser le vehicule avec diligence et a respecter la LCR. Les dommages sont soumis a une franchise de CHF {franchise}.-- par sinistre.",
                "default_prices": {"jour": 100, "semaine": 600, "mois": 2000},
                "deductible": "1500", "agency_website": "https://logirent.ch",
                "logo_path": None, "created_at": now.isoformat(), "updated_at": now.isoformat(),
            })
            print(f"  [+] Template {slug}")
        else:
            print(f"  [OK] Template {slug}")

    # ==================== RESUME ====================
    client.close()
    print(f"\n{'='*50}")
    print(f"  SEED TERMINE!")
    print(f"{'='*50}")
    print(f"  Agences:      {counts['agencies']}")
    print(f"  Utilisateurs: {counts['users']}")
    print(f"  Vehicules:    {counts['vehicles']}")
    print(f"  Reservations: {counts['reservations']}")
    print(f"{'='*50}")
    print(f"  Mot de passe: {DEFAULT_PASSWORD}")
    print(f"{'='*50}")

if __name__ == "__main__":
    main()
