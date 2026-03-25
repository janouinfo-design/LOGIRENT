from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
import uuid
import logging

from database import db
from deps import get_agency_admin
from models import InspectionCreate
from utils.notifications import create_notification
from utils.helpers import analyze_vehicle_damage

router = APIRouter()
logger = logging.getLogger(__name__)

DEFAULT_CHECKOUT_ITEMS = [
    {"name": "Carrosserie exterieure", "checked": False, "condition": "ok", "notes": ""},
    {"name": "Pare-brise et vitres", "checked": False, "condition": "ok", "notes": ""},
    {"name": "Pneus et jantes", "checked": False, "condition": "ok", "notes": ""},
    {"name": "Eclairage (phares, clignotants)", "checked": False, "condition": "ok", "notes": ""},
    {"name": "Interieur et sieges", "checked": False, "condition": "ok", "notes": ""},
    {"name": "Tableau de bord et commandes", "checked": False, "condition": "ok", "notes": ""},
    {"name": "Climatisation", "checked": False, "condition": "ok", "notes": ""},
    {"name": "Documents du vehicule", "checked": False, "condition": "ok", "notes": ""},
    {"name": "Roue de secours / kit", "checked": False, "condition": "ok", "notes": ""},
    {"name": "Niveau d'huile", "checked": False, "condition": "ok", "notes": ""},
]


@router.get("/inspections/defaults")
async def get_default_checklist(admin: dict = Depends(get_agency_admin)):
    return {"items": DEFAULT_CHECKOUT_ITEMS}


@router.get("/inspections/reservation/{reservation_id}")
async def get_inspections_for_reservation(reservation_id: str, admin: dict = Depends(get_agency_admin)):
    inspections = await db.inspections.find(
        {"reservation_id": reservation_id},
        {"_id": 0}
    ).to_list(10)
    return {"inspections": inspections}


@router.post("/inspections")
async def create_inspection(data: InspectionCreate, admin: dict = Depends(get_agency_admin)):
    reservation = await db.reservations.find_one({"id": data.reservation_id})
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation introuvable")

    if admin.get('role') != 'super_admin' and reservation.get('agency_id') != admin.get('agency_id'):
        raise HTTPException(status_code=403, detail="Acces non autorise")

    existing = await db.inspections.find_one({
        "reservation_id": data.reservation_id,
        "type": data.type
    })
    if existing:
        raise HTTPException(status_code=400, detail=f"Inspection {data.type} deja existante pour cette reservation")

    inspection = {
        "id": str(uuid.uuid4()),
        "reservation_id": data.reservation_id,
        "vehicle_id": data.vehicle_id,
        "agency_id": reservation.get("agency_id"),
        "type": data.type,
        "items": data.items or DEFAULT_CHECKOUT_ITEMS,
        "photos": data.photos,
        "km_reading": data.km_reading,
        "fuel_level": data.fuel_level,
        "notes": data.notes,
        "signature_data": data.signature_data,
        "completed_by": admin.get("id"),
        "completed_at": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    await db.inspections.insert_one(inspection)

    type_label = "Depart" if data.type == "checkout" else "Retour"
    if data.type == "checkout":
        await db.reservations.update_one(
            {"id": data.reservation_id},
            {"$set": {"status": "active", "checkout_inspection_id": inspection["id"]}}
        )
    else:
        await db.reservations.update_one(
            {"id": data.reservation_id},
            {"$set": {"checkin_inspection_id": inspection["id"]}}
        )

    await create_notification(
        user_id=reservation.get("user_id"),
        notif_type="inspection",
        message=f"L'etat des lieux de {type_label.lower()} a ete complete pour votre reservation.",
        reservation_id=data.reservation_id
    )

    result = {k: v for k, v in inspection.items() if k != "_id"}
    return result


@router.put("/inspections/{inspection_id}")
async def update_inspection(inspection_id: str, data: dict, admin: dict = Depends(get_agency_admin)):
    inspection = await db.inspections.find_one({"id": inspection_id})
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection introuvable")

    if admin.get('role') != 'super_admin' and inspection.get('agency_id') != admin.get('agency_id'):
        raise HTTPException(status_code=403, detail="Acces non autorise")

    allowed_fields = {"items", "photos", "km_reading", "fuel_level", "notes", "signature_data"}
    update_data = {k: v for k, v in data.items() if k in allowed_fields}
    update_data["completed_at"] = datetime.now(timezone.utc).isoformat()
    update_data["completed_by"] = admin.get("id")

    await db.inspections.update_one({"id": inspection_id}, {"$set": update_data})

    updated = await db.inspections.find_one({"id": inspection_id}, {"_id": 0})
    return updated


@router.get("/inspections/{inspection_id}")
async def get_inspection(inspection_id: str, admin: dict = Depends(get_agency_admin)):
    inspection = await db.inspections.find_one({"id": inspection_id}, {"_id": 0})
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection introuvable")
    return inspection


@router.post("/inspections/{inspection_id}/photos")
async def add_inspection_photo(inspection_id: str, data: dict, admin: dict = Depends(get_agency_admin)):
    inspection = await db.inspections.find_one({"id": inspection_id})
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection introuvable")

    photo_url = data.get("photo_url")
    if not photo_url:
        raise HTTPException(status_code=400, detail="photo_url requis")

    await db.inspections.update_one(
        {"id": inspection_id},
        {"$push": {"photos": photo_url}}
    )
    return {"message": "Photo ajoutee", "photo_url": photo_url}



@router.post("/inspections/analyze-damage")
async def analyze_damage(data: dict, admin: dict = Depends(get_agency_admin)):
    """Analyse une photo de véhicule pour détecter des dommages via IA."""
    image_data = data.get("image_data")
    if not image_data:
        raise HTTPException(status_code=400, detail="image_data (base64) requis")

    context = data.get("context", "general")  # checkout, checkin, general
    inspection_id = data.get("inspection_id")

    result = await analyze_vehicle_damage(image_data, context)

    # Store the analysis result in the inspection if provided
    if inspection_id:
        await db.inspections.update_one(
            {"id": inspection_id},
            {"$push": {"damage_analyses": {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "result": result,
                "analyzed_by": admin.get("id"),
            }}}
        )

    return result


@router.post("/inspections/{inspection_id}/analyze-all-photos")
async def analyze_all_photos(inspection_id: str, admin: dict = Depends(get_agency_admin)):
    """Analyse toutes les photos d'une inspection pour détecter des dommages."""
    inspection = await db.inspections.find_one({"id": inspection_id})
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection introuvable")

    photos = inspection.get("photos", [])
    if not photos:
        raise HTTPException(status_code=400, detail="Aucune photo a analyser")

    # For URL-based photos, we can't analyze them directly with base64
    # This endpoint is for when photos are stored as base64 or we have access to URLs
    return {"message": f"{len(photos)} photos trouvees", "photos_count": len(photos)}
