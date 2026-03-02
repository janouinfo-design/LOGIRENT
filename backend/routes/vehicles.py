from fastapi import APIRouter, HTTPException, Depends, File, UploadFile
from typing import Optional, List
from datetime import datetime, timedelta
import base64

from database import db
from models import Vehicle, VehicleCreate, Base64ImageUpload
from deps import get_current_user, get_agency_admin

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
    query = {"status": {"$ne": "maintenance"}}

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

    if start_date and end_date:
        available_vehicles = []
        for vehicle in vehicles:
            overlap = await db.reservations.find_one({
                "vehicle_id": vehicle['id'],
                "status": {"$in": ["pending", "confirmed", "active"]},
                "$or": [{"start_date": {"$lt": end_date}, "end_date": {"$gt": start_date}}]
            })
            if not overlap:
                available_vehicles.append(vehicle)
        vehicles = available_vehicles

    return [Vehicle(**v) for v in vehicles]


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
    }).to_list(100)

    booked_dates = []
    for res in reservations:
        current = max(res['start_date'], start_of_month)
        end = min(res['end_date'], end_of_month)
        while current < end:
            booked_dates.append(current.strftime("%Y-%m-%d"))
            current += timedelta(days=1)

    return {"booked_dates": booked_dates}


# Admin vehicle routes
@router.post("/admin/vehicles", response_model=Vehicle)
async def create_vehicle(vehicle_data: VehicleCreate, user: dict = Depends(get_agency_admin)):
    vehicle = Vehicle(**vehicle_data.dict())
    vehicle.agency_id = user.get('agency_id')
    await db.vehicles.insert_one(vehicle.dict())
    return vehicle


@router.post("/admin/vehicles/{vehicle_id}/photos")
async def upload_vehicle_photo(vehicle_id: str, file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    vehicle = await db.vehicles.find_one({"id": vehicle_id})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    content = await file.read()
    base64_image = base64.b64encode(content).decode('utf-8')
    content_type = file.content_type or 'image/jpeg'
    data_uri = f"data:{content_type};base64,{base64_image}"

    photos = vehicle.get('photos', [])
    photos.append(data_uri)

    await db.vehicles.update_one({"id": vehicle_id}, {"$set": {"photos": photos}})
    return {"message": "Photo uploaded successfully", "photo": data_uri, "total_photos": len(photos)}


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

    update_dict = vehicle_data.dict()
    await db.vehicles.update_one({"id": vehicle_id}, {"$set": update_dict})

    updated = await db.vehicles.find_one({"id": vehicle_id})
    return Vehicle(**updated)


@router.delete("/admin/vehicles/{vehicle_id}")
async def delete_vehicle(vehicle_id: str, user: dict = Depends(get_current_user)):
    result = await db.vehicles.delete_one({"id": vehicle_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return {"message": "Vehicle deleted"}
