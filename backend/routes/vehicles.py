from fastapi import APIRouter, HTTPException, Depends, File, UploadFile, Response, Query, Header
from typing import Optional, List
from datetime import datetime, timedelta, timezone
import base64
import uuid
import logging

from database import db
from models import Vehicle, VehicleCreate, Base64ImageUpload
from deps import get_current_user, get_agency_admin
from utils.storage import put_object, get_object, generate_storage_path

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/vehicles", response_model=List[Vehicle])
async def get_vehicles(
    type: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    location: Optional[str] = None,
    transmission: Optional[str] = None,
    agency_id: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
):
    query = {}

    # Filtres optionnels
    if type:
        query["type"] = type
    if min_price is not None:
        query["price_per_day"] = {"$gte": min_price}
    if max_price is not None:
        query.setdefault("price_per_day", {})["$lte"] = max_price
    if location:
        query["location"] = {"$regex": location, "$options": "i"}
    if transmission:
        query["transmission"] = transmission
    if agency_id:
        query["agency_id"] = agency_id

    vehicles = await db.vehicles.find(query).to_list(100)

    # If no agency_id filter and vehicles from multiple agencies, use default agency
    if not agency_id and vehicles:
        agency_ids = set(v.get('agency_id') for v in vehicles if v.get('agency_id'))
        if len(agency_ids) > 1:
            # Return only the first agency's vehicles (default behavior for single-tenant)
            default_agency = await db.agencies.find_one({}, {"_id": 0, "id": 1})
            if default_agency:
                vehicles = [v for v in vehicles if v.get('agency_id') == default_agency['id']]

    if start_date and end_date:
        vehicle_ids = [v['id'] for v in vehicles]
        overlapping = await db.reservations.find({
            "vehicle_id": {"$in": vehicle_ids},
            "status": {"$in": ["pending", "confirmed", "active"]},
            "$or": [{"start_date": {"$lt": end_date}, "end_date": {"$gt": start_date}}]
        }, {"_id": 0, "vehicle_id": 1}).to_list(None)
        blocked_ids = set(r['vehicle_id'] for r in overlapping)
        vehicles = [v for v in vehicles if v['id'] not in blocked_ids]

    result = []
    for v in vehicles:
        vehicle = Vehicle(**v)
        # Only include first photo in list view to reduce payload
        if vehicle.photos and len(vehicle.photos) > 1:
            vehicle.photos = [vehicle.photos[0]]
        result.append(vehicle)

    return result


@router.get("/vehicles/{vehicle_id}", response_model=Vehicle)
async def get_vehicle(vehicle_id: str):
    vehicle = await db.vehicles.find_one({"id": vehicle_id})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return Vehicle(**vehicle)


@router.get("/vehicles/{vehicle_id}/availability")
async def get_vehicle_availability(vehicle_id: str, month: int = None, year: int = None):
    if month is None:
        month = datetime.utcnow().month
    if year is None:
        year = datetime.utcnow().year

    start_of_month = datetime(year, month, 1)
    if month == 12:
        end_of_month = datetime(year + 1, 1, 1)
    else:
        end_of_month = datetime(year, month + 1, 1)

    reservations = await db.reservations.find({
        "vehicle_id": vehicle_id,
        "status": {"$in": ["confirmed", "active", "pending", "pending_cash"]},
        "start_date": {"$lt": end_of_month},
        "end_date": {"$gt": start_of_month}
    }, {"_id": 0}).to_list(100)

    booked_dates = []
    reservations_detail = []
    for res in reservations:
        current = max(res['start_date'], start_of_month)
        end = min(res['end_date'], end_of_month)
        while current < end:
            booked_dates.append(current.strftime("%Y-%m-%d"))
            current += timedelta(days=1)
        reservations_detail.append({
            "start_date": res['start_date'].isoformat(),
            "end_date": res['end_date'].isoformat(),
            "status": res.get('status', ''),
        })

    return {"booked_dates": booked_dates, "reservations": reservations_detail}


# Admin vehicle routes
@router.post("/admin/vehicles", response_model=Vehicle)
async def create_vehicle(vehicle_data: VehicleCreate, user: dict = Depends(get_agency_admin)):
    # Filter out None values and set defaults for required fields
    vehicle_dict = {k: v for k, v in vehicle_data.dict().items() if v is not None}
    # Set default status if not provided
    if 'status' not in vehicle_dict or vehicle_dict.get('status') is None:
        vehicle_dict['status'] = 'available'
    # Set default documents if not provided
    if 'documents' not in vehicle_dict or vehicle_dict.get('documents') is None:
        vehicle_dict['documents'] = []
    
    vehicle = Vehicle(**vehicle_dict)
    vehicle.agency_id = user.get('agency_id')
    await db.vehicles.insert_one(vehicle.dict())
    return vehicle


@router.post("/admin/vehicles/{vehicle_id}/photos")
async def upload_vehicle_photo(vehicle_id: str, file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    vehicle = await db.vehicles.find_one({"id": vehicle_id})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    content = await file.read()
    content_type = file.content_type or 'image/jpeg'

    # Store in object storage
    storage_path = generate_storage_path(vehicle_id, file.filename or "photo.jpg")
    put_object(storage_path, content, content_type)

    # Store the proxy URL (served via our backend)
    photo_url = f"/api/vehicles/photo/{storage_path}"

    photos = vehicle.get('photos', [])
    photos.append(photo_url)

    await db.vehicles.update_one({"id": vehicle_id}, {"$set": {"photos": photos}})
    return {"message": "Photo uploaded successfully", "photo": photo_url, "total_photos": len(photos)}


@router.get("/vehicles/photo/{file_path:path}")
async def serve_vehicle_photo(file_path: str):
    """Proxy endpoint to serve photos from object storage"""
    try:
        file_data, content_type = get_object(file_path)
        return Response(content=file_data, media_type=content_type)
    except Exception as e:
        logger.error(f"Failed to serve photo {file_path}: {e}")
        raise HTTPException(status_code=404, detail="Photo not found")


@router.post("/admin/vehicles/{vehicle_id}/photos/base64")
async def upload_vehicle_photo_base64(vehicle_id: str, data: Base64ImageUpload, user: dict = Depends(get_current_user)):
    vehicle = await db.vehicles.find_one({"id": vehicle_id})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    data_uri = f"data:{data.content_type};base64,{data.image}"
    photos = vehicle.get('photos', [])
    photos.append(data_uri)

    await db.vehicles.update_one({"id": vehicle_id}, {"$set": {"photos": photos}})
    return {"message": "Photo uploaded successfully", "photo": data_uri, "total_photos": len(photos)}


@router.delete("/admin/vehicles/{vehicle_id}/photos/{photo_index}")
async def delete_vehicle_photo(vehicle_id: str, photo_index: int, user: dict = Depends(get_current_user)):
    vehicle = await db.vehicles.find_one({"id": vehicle_id})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    photos = vehicle.get('photos', [])
    if photo_index < 0 or photo_index >= len(photos):
        raise HTTPException(status_code=400, detail="Invalid photo index")

    photos.pop(photo_index)
    await db.vehicles.update_one({"id": vehicle_id}, {"$set": {"photos": photos}})
    return {"message": "Photo deleted successfully"}


@router.put("/admin/vehicles/{vehicle_id}", response_model=Vehicle)
async def update_vehicle(vehicle_id: str, vehicle_data: VehicleCreate, user: dict = Depends(get_current_user)):
    existing = await db.vehicles.find_one({"id": vehicle_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    update_dict = {k: v for k, v in vehicle_data.dict().items() if v is not None}
    # Preserve existing documents list if not provided
    if "documents" not in update_dict or update_dict.get("documents") is None:
        update_dict.pop("documents", None)
    # Preserve existing photos list if not provided or empty default
    if "photos" not in update_dict or not update_dict.get("photos"):
        update_dict.pop("photos", None)
    await db.vehicles.update_one({"id": vehicle_id}, {"$set": update_dict})

    updated = await db.vehicles.find_one({"id": vehicle_id})
    return Vehicle(**updated)



@router.put("/admin/vehicles/{vehicle_id}/photos")
async def update_vehicle_photos(vehicle_id: str, data: dict, user: dict = Depends(get_current_user)):
    existing = await db.vehicles.find_one({"id": vehicle_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    photos = data.get("photos", [])
    await db.vehicles.update_one({"id": vehicle_id}, {"$set": {"photos": photos}})
    updated = await db.vehicles.find_one({"id": vehicle_id}, {"_id": 0})
    return {"photos": updated.get("photos", []), "message": "Photos updated"}



@router.delete("/admin/vehicles/{vehicle_id}")
async def delete_vehicle(vehicle_id: str, user: dict = Depends(get_current_user)):
    result = await db.vehicles.delete_one({"id": vehicle_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return {"message": "Vehicle deleted"}


# ==================== VEHICLE DOCUMENT ENDPOINTS ====================

DOCUMENT_TYPES = {
    "carte_grise": "Carte Grise",
    "assurance": "Assurance",
    "controle_technique": "Controle Technique",
    "photo": "Photo",
    "autre": "Autre",
}


@router.post("/admin/vehicles/{vehicle_id}/documents")
async def upload_vehicle_document(
    vehicle_id: str,
    file: UploadFile = File(...),
    doc_type: str = Query("autre"),
    expiry_date: Optional[str] = Query(None),
    user: dict = Depends(get_current_user),
):
    vehicle = await db.vehicles.find_one({"id": vehicle_id})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    data = await file.read()
    if len(data) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Fichier trop volumineux (max 10 MB)")

    content_type = file.content_type or "application/octet-stream"
    storage_path = generate_storage_path(vehicle_id, file.filename or "document.bin")

    try:
        result = put_object(storage_path, data, content_type)
    except Exception as e:
        logger.error(f"Storage upload failed: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de l'upload du fichier")

    doc_id = str(uuid.uuid4())
    doc_record = {
        "id": doc_id,
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": content_type,
        "size": result.get("size", len(data)),
        "doc_type": doc_type,
        "doc_type_label": DOCUMENT_TYPES.get(doc_type, doc_type),
        "expiry_date": expiry_date,
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
        "is_deleted": False,
    }

    await db.vehicles.update_one(
        {"id": vehicle_id},
        {"$push": {"documents": doc_record}},
    )

    return {
        "message": "Document uploade avec succes",
        "document": doc_record,
    }


@router.get("/vehicles/{vehicle_id}/documents/{doc_id}/download")
async def download_vehicle_document(
    vehicle_id: str,
    doc_id: str,
    authorization: str = Header(None),
    auth: str = Query(None),
):
    vehicle = await db.vehicles.find_one({"id": vehicle_id})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    documents = vehicle.get("documents", [])
    doc = next((d for d in documents if d.get("id") == doc_id and not d.get("is_deleted")), None)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    try:
        file_data, ct = get_object(doc["storage_path"])
    except Exception as e:
        logger.error(f"Storage download failed: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors du telechargement")

    return Response(
        content=file_data,
        media_type=doc.get("content_type", ct),
        headers={"Content-Disposition": f'inline; filename="{doc.get("original_filename", "document")}"'},
    )


@router.delete("/admin/vehicles/{vehicle_id}/documents/{doc_id}")
async def delete_vehicle_document(
    vehicle_id: str,
    doc_id: str,
    user: dict = Depends(get_current_user),
):
    vehicle = await db.vehicles.find_one({"id": vehicle_id})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    documents = vehicle.get("documents", [])
    found = False
    for doc in documents:
        if doc.get("id") == doc_id:
            doc["is_deleted"] = True
            found = True
            break

    if not found:
        raise HTTPException(status_code=404, detail="Document not found")

    await db.vehicles.update_one({"id": vehicle_id}, {"$set": {"documents": documents}})
    return {"message": "Document supprime"}


@router.get("/admin/vehicles/document-alerts")
async def get_document_alerts(
    days: int = Query(30),
    user: dict = Depends(get_current_user),
):
    """Return documents expiring within the next N days (default 30)."""
    now = datetime.now(timezone.utc)
    threshold = (now + timedelta(days=days)).isoformat()
    now_iso = now.isoformat()

    agency_id = user.get("agency_id")
    query = {"agency_id": agency_id} if agency_id else {}
    vehicles = await db.vehicles.find(query, {"_id": 0}).to_list(200)

    alerts = []
    for v in vehicles:
        for doc in v.get("documents", []):
            if doc.get("is_deleted"):
                continue
            exp = doc.get("expiry_date")
            if not exp:
                continue
            if exp <= now_iso:
                alerts.append({
                    "vehicle_id": v["id"],
                    "vehicle_name": f"{v.get('brand','')} {v.get('model','')}",
                    "plate_number": v.get("plate_number", ""),
                    "doc_id": doc["id"],
                    "doc_type": doc["doc_type"],
                    "doc_type_label": doc.get("doc_type_label", doc["doc_type"]),
                    "original_filename": doc.get("original_filename", ""),
                    "expiry_date": exp,
                    "severity": "expired",
                })
            elif exp <= threshold:
                alerts.append({
                    "vehicle_id": v["id"],
                    "vehicle_name": f"{v.get('brand','')} {v.get('model','')}",
                    "plate_number": v.get("plate_number", ""),
                    "doc_id": doc["id"],
                    "doc_type": doc["doc_type"],
                    "doc_type_label": doc.get("doc_type_label", doc["doc_type"]),
                    "original_filename": doc.get("original_filename", ""),
                    "expiry_date": exp,
                    "severity": "warning",
                })

    # Sort: expired first, then by closest expiry
    alerts.sort(key=lambda a: (0 if a["severity"] == "expired" else 1, a["expiry_date"]))
    return {"alerts": alerts, "total": len(alerts)}
