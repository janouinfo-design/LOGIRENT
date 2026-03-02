from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
import uuid
import asyncio
import httpx
import logging

from database import db
from models import NavixyConfig
from deps import get_current_user, get_admin_user

logger = logging.getLogger(__name__)
router = APIRouter()


async def get_agency_navixy_config(user: dict) -> tuple:
    agency_id = user.get('agency_id')
    if agency_id:
        agency = await db.agencies.find_one({"id": agency_id}, {"_id": 0})
        if agency and agency.get('navixy_api_url') and agency.get('navixy_hash'):
            return agency['navixy_api_url'], agency['navixy_hash']
    return None, None


@router.get("/admin/my-agency/navixy")
async def get_my_navixy_config(user: dict = Depends(get_admin_user)):
    agency_id = user.get('agency_id')
    if not agency_id:
        raise HTTPException(status_code=400, detail="Aucune agence associée")
    agency = await db.agencies.find_one({"id": agency_id}, {"_id": 0, "navixy_api_url": 1, "navixy_hash": 1})
    return {
        "navixy_api_url": agency.get("navixy_api_url", "") if agency else "",
        "navixy_hash": agency.get("navixy_hash", "") if agency else "",
        "configured": bool(agency and agency.get("navixy_api_url") and agency.get("navixy_hash"))
    }


@router.put("/admin/my-agency/navixy")
async def update_my_navixy_config(data: NavixyConfig, user: dict = Depends(get_admin_user)):
    agency_id = user.get('agency_id')
    if not agency_id:
        raise HTTPException(status_code=400, detail="Aucune agence associée")
    update = {}
    if data.navixy_api_url is not None:
        update["navixy_api_url"] = data.navixy_api_url.strip()
    if data.navixy_hash is not None:
        update["navixy_hash"] = data.navixy_hash.strip()
    if update:
        await db.agencies.update_one({"id": agency_id}, {"$set": update})
    return {"message": "Configuration Navixy mise à jour"}


@router.get("/navixy/trackers")
async def get_navixy_trackers(user: dict = Depends(get_current_user)):
    if user.get('role') not in ['admin', 'super_admin']:
        raise HTTPException(status_code=403, detail="Admin access required")
    api_url, api_hash = await get_agency_navixy_config(user)
    if not api_url or not api_hash:
        raise HTTPException(status_code=500, detail="Navixy non configuré pour cette agence")

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(f"{api_url}/tracker/list", json={"hash": api_hash})
        data = resp.json()

    if not data.get("success"):
        raise HTTPException(status_code=502, detail="Navixy API error")

    trackers = []
    for t in data.get("list", []):
        trackers.append({
            "id": t["id"], "label": t.get("label", ""),
            "model": t.get("source", {}).get("model", ""),
            "status": t.get("status", {}).get("listing", ""),
        })
    return trackers


@router.get("/navixy/tracker/{tracker_id}/state")
async def get_navixy_tracker_state(tracker_id: int, user: dict = Depends(get_current_user)):
    if user.get('role') not in ['admin', 'super_admin']:
        raise HTTPException(status_code=403, detail="Admin access required")
    api_url, api_hash = await get_agency_navixy_config(user)
    if not api_url or not api_hash:
        raise HTTPException(status_code=500, detail="Navixy non configuré pour cette agence")

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(f"{api_url}/tracker/get_state", json={"hash": api_hash, "tracker_id": tracker_id})
        data = resp.json()

    if not data.get("state"):
        raise HTTPException(status_code=404, detail="Tracker not found")

    state = data["state"]
    gps = state.get("gps", {})
    loc = gps.get("location", {})
    return {
        "tracker_id": tracker_id, "lat": loc.get("lat"), "lng": loc.get("lng"),
        "speed": gps.get("speed", 0), "heading": gps.get("heading", 0),
        "altitude": gps.get("alt", 0), "gps_updated": gps.get("updated"),
        "connection_status": state.get("connection_status"),
        "movement_status": state.get("movement_status"),
        "ignition": state.get("ignition"),
        "last_update": state.get("last_update"),
    }


@router.get("/navixy/positions")
async def get_navixy_all_positions(user: dict = Depends(get_current_user)):
    if user.get('role') not in ['admin', 'super_admin']:
        raise HTTPException(status_code=403, detail="Admin access required")
    api_url, api_hash = await get_agency_navixy_config(user)
    if not api_url or not api_hash:
        raise HTTPException(status_code=500, detail="Navixy non configuré pour cette agence")

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(f"{api_url}/tracker/list", json={"hash": api_hash})
        data = resp.json()

    if not data.get("success"):
        raise HTTPException(status_code=502, detail="Navixy API error")

    tracker_ids = [t["id"] for t in data.get("list", [])]
    positions = []

    async with httpx.AsyncClient(timeout=30) as client:
        tasks = [client.post(f"{api_url}/tracker/get_state", json={"hash": api_hash, "tracker_id": tid}) for tid in tracker_ids]
        responses = await asyncio.gather(*tasks, return_exceptions=True)

    tracker_map = {t["id"]: t for t in data.get("list", [])}
    for tid, resp in zip(tracker_ids, responses):
        if isinstance(resp, Exception):
            continue
        try:
            state_data = resp.json()
            state = state_data.get("state", {})
            gps = state.get("gps", {})
            loc = gps.get("location", {})
            tracker = tracker_map.get(tid, {})
            positions.append({
                "tracker_id": tid, "label": tracker.get("label", ""),
                "lat": loc.get("lat"), "lng": loc.get("lng"),
                "speed": gps.get("speed", 0), "heading": gps.get("heading", 0),
                "connection_status": state.get("connection_status"),
                "movement_status": state.get("movement_status"),
                "ignition": state.get("ignition"),
                "last_update": state.get("last_update"),
            })
        except Exception:
            continue

    return positions


@router.post("/navixy/sync-vehicles")
async def sync_navixy_vehicles(user: dict = Depends(get_current_user)):
    if user.get('role') not in ['admin', 'super_admin']:
        raise HTTPException(status_code=403, detail="Admin access required")
    api_url, api_hash = await get_agency_navixy_config(user)
    if not api_url or not api_hash:
        raise HTTPException(status_code=500, detail="Navixy non configuré pour cette agence")

    agency_id = user.get('agency_id')
    if not agency_id:
        raise HTTPException(status_code=400, detail="No agency assigned")

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(f"{api_url}/tracker/list", json={"hash": api_hash})
        data = resp.json()

    if not data.get("success"):
        raise HTTPException(status_code=502, detail="Navixy API error")

    created = 0
    updated = 0
    for tracker in data.get("list", []):
        label = tracker.get("label", "")
        navixy_id = tracker["id"]

        existing = await db.vehicles.find_one({"navixy_tracker_id": navixy_id}, {"_id": 0})
        if existing:
            await db.vehicles.update_one({"navixy_tracker_id": navixy_id}, {"$set": {"navixy_label": label}})
            updated += 1
        else:
            vehicle = {
                "id": str(uuid.uuid4()),
                "brand": label.split("-")[1].strip().split(" ")[0] if "-" in label else "Véhicule",
                "model": " ".join(label.split("-")[1].strip().split(" ")[1:]) if "-" in label else label,
                "year": 2024, "price_per_day": 0,
                "description": f"Synchronisé depuis Navixy (Tracker: {label})",
                "photos": [], "available": True, "category": "berline",
                "fuel_type": "essence", "transmission": "automatique", "seats": 5,
                "agency_id": agency_id, "navixy_tracker_id": navixy_id,
                "navixy_label": label, "created_at": datetime.utcnow().isoformat(),
            }
            await db.vehicles.insert_one(vehicle)
            created += 1

    return {"message": f"Synchronisation terminée: {created} créés, {updated} mis à jour", "created": created, "updated": updated}
