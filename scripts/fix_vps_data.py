#!/usr/bin/env python3
"""
Script de nettoyage de la base VPS LogiRent
- Supprime les agences sans champ 'id'
- Supprime les agences TEST
- Vérifie la liaison users -> agencies -> reservations
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', 'backend', '.env'))

MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME', 'logirent')


async def main():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    print("=" * 60)
    print("DIAGNOSTIC BASE LOGIRENT")
    print("=" * 60)

    # 1. Lister toutes les agences
    agencies = await db.agencies.find({}).to_list(100)
    print(f"\n--- {len(agencies)} agences trouvées ---")
    
    valid_agencies = []
    invalid_agencies = []
    test_agencies = []
    
    for a in agencies:
        name = a.get('name', 'NO_NAME')
        aid = a.get('id')
        oid = str(a.get('_id'))
        
        if not aid:
            invalid_agencies.append(a)
            print(f"  [SANS ID] name='{name}' _id={oid}")
        elif 'TEST' in name or 'test' in name.lower():
            test_agencies.append(a)
            print(f"  [TEST]    name='{name}' id={aid}")
        else:
            valid_agencies.append(a)
            print(f"  [OK]      name='{name}' id={aid}")

    # 2. Vérifier les réservations
    res_count = await db.reservations.count_documents({})
    agency_ids_in_res = await db.reservations.distinct('agency_id')
    print(f"\n--- {res_count} réservations ---")
    print(f"  agency_ids utilisés: {agency_ids_in_res}")

    # 3. Vérifier les utilisateurs admin
    admins = await db.users.find({"role": {"$in": ["admin", "super_admin"]}}).to_list(100)
    print(f"\n--- {len(admins)} utilisateurs admin ---")
    for admin in admins:
        name = admin.get('name', 'NO_NAME')
        email = admin.get('email', 'NO_EMAIL')
        role = admin.get('role')
        uid = admin.get('id')
        agency_id = admin.get('agency_id')
        
        # Vérifier si l'agency_id pointe vers une agence valide
        agency_match = None
        for va in valid_agencies:
            if va.get('id') == agency_id:
                agency_match = va.get('name')
                break
        
        status = f"-> {agency_match}" if agency_match else ("-> AUCUNE AGENCE" if agency_id else "-> (super_admin, pas d'agence)")
        print(f"  [{role}] {name} ({email}) agency_id={agency_id} {status}")

    # 4. Proposer le nettoyage
    print("\n" + "=" * 60)
    print("NETTOYAGE PROPOSÉ")
    print("=" * 60)
    print(f"  - Supprimer {len(invalid_agencies)} agences sans 'id'")
    print(f"  - Supprimer {len(test_agencies)} agences TEST")
    
    confirm = input("\nVoulez-vous procéder au nettoyage ? (oui/non): ").strip().lower()
    if confirm != 'oui':
        print("Annulé.")
        client.close()
        return

    # 5. Supprimer les agences invalides
    for a in invalid_agencies:
        await db.agencies.delete_one({"_id": a['_id']})
        print(f"  Supprimé: '{a.get('name')}' (sans id)")

    # 6. Supprimer les agences TEST
    for a in test_agencies:
        aid = a.get('id')
        # Supprimer aussi les users et véhicules liés au TEST
        del_users = await db.users.delete_many({"agency_id": aid})
        del_vehicles = await db.vehicles.delete_many({"agency_id": aid})
        del_res = await db.reservations.delete_many({"agency_id": aid})
        await db.agencies.delete_one({"_id": a['_id']})
        print(f"  Supprimé: '{a.get('name')}' + {del_users.deleted_count} users, {del_vehicles.deleted_count} véhicules, {del_res.deleted_count} réservations")

    # 7. Vérifier les admin orphelins (agency_id pointe vers rien)
    remaining_agencies = await db.agencies.find({}).to_list(100)
    valid_ids = set(a.get('id') for a in remaining_agencies if a.get('id'))
    
    orphan_admins = await db.users.find({
        "role": "admin",
        "agency_id": {"$nin": list(valid_ids), "$ne": None}
    }).to_list(100)
    
    if orphan_admins:
        print(f"\n  {len(orphan_admins)} admins orphelins trouvés:")
        for oa in orphan_admins:
            print(f"    - {oa.get('email')} (agency_id: {oa.get('agency_id')})")
        print("  -> Ces admins ne sont liés à aucune agence valide.")

    # 8. Résumé final
    final_agencies = await db.agencies.count_documents({})
    final_res = await db.reservations.count_documents({})
    final_users = await db.users.count_documents({})
    print(f"\n--- RÉSUMÉ FINAL ---")
    print(f"  Agences: {final_agencies}")
    print(f"  Réservations: {final_res}")
    print(f"  Utilisateurs: {final_users}")
    
    client.close()
    print("\nTerminé.")


if __name__ == "__main__":
    asyncio.run(main())
