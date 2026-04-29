"""
Migration: Create vehicle_models collection from existing vehicles.
- Each unique (brand, model, year, agency_id) combination becomes one VehicleModel.
- Each Vehicle gets a `model_id` foreign key pointing to its VehicleModel.
- Existing reservations get `model_id` derived from their assigned vehicle.

Idempotent: safe to run multiple times. Only creates models that don't exist.
"""
import logging
from datetime import datetime
import uuid

logger = logging.getLogger(__name__)


async def migrate_vehicle_models(db):
    """Auto-create vehicle_models from existing vehicles and link them."""
    try:
        # Step 1: Get all vehicles missing model_id
        vehicles = await db.vehicles.find({}, {"_id": 0}).to_list(10000)
        if not vehicles:
            logger.info("No vehicles to migrate")
            return

        # Group vehicles by (brand, model, year, agency_id) — case insensitive
        groups: dict = {}
        for v in vehicles:
            key = (
                (v.get("brand") or "").strip().lower(),
                (v.get("model") or "").strip().lower(),
                int(v.get("year") or 0),
                v.get("agency_id") or "",
            )
            groups.setdefault(key, []).append(v)

        # Step 2: For each group, find or create a VehicleModel
        models_created = 0
        vehicles_linked = 0

        for key, group_vehicles in groups.items():
            brand_lc, model_lc, year, agency_id = key
            # Use the first vehicle as the template for the model
            template = group_vehicles[0]

            # Check if model already exists for this group
            existing = await db.vehicle_models.find_one({
                "brand": template.get("brand"),
                "model": template.get("model"),
                "year": template.get("year"),
                "agency_id": agency_id or None,
            }, {"_id": 0})

            if existing:
                model_id = existing["id"]
            else:
                # Create new VehicleModel from template
                new_model = {
                    "id": str(uuid.uuid4()),
                    "brand": template.get("brand"),
                    "model": template.get("model"),
                    "year": template.get("year"),
                    "type": template.get("type", "Berline"),
                    "price_per_day": template.get("price_per_day", 0),
                    "photos": template.get("photos", []) or [],
                    "description": template.get("description"),
                    "seats": template.get("seats", 5),
                    "transmission": template.get("transmission", "automatic"),
                    "fuel_type": template.get("fuel_type", "essence"),
                    "options": template.get("options", []) or [],
                    "pricing_tiers": template.get("pricing_tiers", []) or [],
                    "seasonal_pricing": template.get("seasonal_pricing", []) or [],
                    "agency_id": agency_id or None,
                    "location": template.get("location", "Geneva"),
                    "is_active": True,
                    "created_at": datetime.utcnow(),
                }
                await db.vehicle_models.insert_one(new_model)
                model_id = new_model["id"]
                models_created += 1

            # Link all vehicles in this group to the model
            for v in group_vehicles:
                if v.get("model_id") != model_id:
                    await db.vehicles.update_one(
                        {"id": v["id"]},
                        {"$set": {"model_id": model_id}}
                    )
                    vehicles_linked += 1

        # Step 3: For existing reservations missing model_id, derive from vehicle_id
        reservations_updated = 0
        async for r in db.reservations.find({"model_id": {"$exists": False}}, {"_id": 0}):
            if r.get("vehicle_id"):
                vehicle = await db.vehicles.find_one({"id": r["vehicle_id"]}, {"_id": 0})
                if vehicle and vehicle.get("model_id"):
                    await db.reservations.update_one(
                        {"id": r["id"]},
                        {"$set": {"model_id": vehicle["model_id"]}}
                    )
                    reservations_updated += 1

        logger.info(
            f"Vehicle models migration: {models_created} models created, "
            f"{vehicles_linked} vehicles linked, {reservations_updated} reservations updated"
        )
    except Exception as e:
        logger.error(f"Vehicle models migration failed: {e}", exc_info=True)
