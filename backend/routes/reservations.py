from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime, timedelta
import logging

from database import db
from models import Reservation, ReservationCreate, ReservationUpdate, ReservationOption
from deps import get_current_user
from utils.email import send_reservation_confirmation
from utils.notifications import create_notification, notify_admins_of_agency

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/reservations", response_model=Reservation)
async def create_reservation(reservation_data: ReservationCreate, user: dict = Depends(get_current_user)):
    vehicle = await db.vehicles.find_one({"id": reservation_data.vehicle_id})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    if vehicle['status'] == 'maintenance':
        raise HTTPException(status_code=400, detail="Vehicle is under maintenance")

    # Category-based booking: overlap check removed
    # The agency guarantees the booked vehicle OR an equivalent in the same category

    total_days = (reservation_data.end_date - reservation_data.start_date).days
    if total_days <= 0:
        raise HTTPException(status_code=400, detail="End date must be after start date")

    base_price = vehicle['price_per_day'] * total_days

    # Handle selected pricing tier
    selected_tier = None
    if reservation_data.selected_tier_id:
        pricing_tiers = vehicle.get('pricing_tiers', [])
        for tier in pricing_tiers:
            if tier.get('id') == reservation_data.selected_tier_id and tier.get('active', True):
                selected_tier = {
                    "id": tier['id'],
                    "name": tier.get('name', ''),
                    "kilometers": tier.get('kilometers'),
                    "price": float(tier.get('price', 0)),
                    "period": tier.get('period', ''),
                }
                base_price = float(tier['price'])
                break

    vehicle_options = {opt['name']: opt for opt in vehicle.get('options', [])}
    selected_options = []
    options_price = 0

    for opt_name in reservation_data.options:
        if opt_name in vehicle_options:
            opt = vehicle_options[opt_name]
            opt_total = opt['price_per_day'] * total_days
            selected_options.append(ReservationOption(name=opt_name, price_per_day=opt['price_per_day'], total_price=opt_total))
            options_price += opt_total

    total_price = base_price + options_price
    payment_method = reservation_data.payment_method
    if payment_method not in ["card", "cash"]:
        payment_method = "card"

    # Auto-confirmation: all reservations are confirmed immediately
    status = "confirmed"

    reservation = Reservation(
        user_id=user['id'],
        vehicle_id=reservation_data.vehicle_id,
        agency_id=vehicle.get('agency_id'),
        start_date=reservation_data.start_date,
        end_date=reservation_data.end_date,
        options=selected_options,
        selected_tier=selected_tier,
        total_days=total_days,
        base_price=base_price,
        options_price=options_price,
        total_price=total_price,
        status=status,
        payment_method=payment_method
    )

    await db.reservations.insert_one(reservation.dict())

    vname = f"{vehicle['brand']} {vehicle['model']}"
    category = vehicle.get('type', 'Standard')

    # Send confirmation email (card or cash)
    try:
        await send_reservation_confirmation(user, vehicle, reservation.dict())
    except Exception as email_error:
        logger.error(f"Failed to send confirmation email: {email_error}")

    # Notify client: reservation confirmed
    try:
        await create_notification(
            user['id'], 'reservation_confirmed',
            f"Votre reservation pour {vname} (categorie {category}) du {reservation.start_date.strftime('%d/%m/%Y')} au {reservation.end_date.strftime('%d/%m/%Y')} est confirmee. N'oubliez pas votre carte d'identite et votre permis de conduire.",
            reservation.id
        )
    except Exception as e:
        logger.error(f"Failed to create client notification: {e}")

    # Notify agency admins: new confirmed reservation
    if vehicle.get('agency_id'):
        try:
            await notify_admins_of_agency(
                vehicle['agency_id'], 'new_reservation',
                f"Nouvelle reservation confirmee de {user['name']} pour {vname} ({reservation.start_date.strftime('%d/%m/%Y')} - {reservation.end_date.strftime('%d/%m/%Y')}). Paiement: {'especes' if payment_method == 'cash' else 'carte'}.",
                reservation.id
            )
        except Exception as e:
            logger.error(f"Failed to notify agency admins: {e}")

    return reservation


@router.get("/reservations", response_model=List[Reservation])
async def get_reservations(user: dict = Depends(get_current_user)):
    reservations = await db.reservations.find({"user_id": user['id']}).sort("start_date", -1).to_list(100)
    return [Reservation(**r) for r in reservations]


@router.get("/reservations/{reservation_id}", response_model=Reservation)
async def get_reservation(reservation_id: str, user: dict = Depends(get_current_user)):
    reservation = await db.reservations.find_one({"id": reservation_id, "user_id": user['id']})
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    return Reservation(**reservation)


@router.put("/reservations/{reservation_id}", response_model=Reservation)
async def update_reservation(reservation_id: str, update_data: ReservationUpdate, user: dict = Depends(get_current_user)):
    reservation = await db.reservations.find_one({"id": reservation_id, "user_id": user['id']})
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")

    if reservation['status'] in ['active', 'completed']:
        raise HTTPException(status_code=400, detail="Cannot modify active or completed reservations")

    if update_data.start_date or update_data.end_date:
        vehicle = await db.vehicles.find_one({"id": reservation['vehicle_id']})
        start = update_data.start_date or reservation['start_date']
        end = update_data.end_date or reservation['end_date']

        total_days = (end - start).days
        if total_days <= 0:
            raise HTTPException(status_code=400, detail="End date must be after start date")

        base_price = vehicle['price_per_day'] * total_days
        options_price = sum(opt['price_per_day'] * total_days for opt in reservation['options'])
        total_price = base_price + options_price

        await db.reservations.update_one(
            {"id": reservation_id},
            {"$set": {
                "start_date": start, "end_date": end,
                "total_days": total_days, "base_price": base_price,
                "options_price": options_price, "total_price": total_price,
                "updated_at": datetime.utcnow()
            }}
        )

    updated = await db.reservations.find_one({"id": reservation_id})
    return Reservation(**updated)


@router.post("/reservations/{reservation_id}/cancel")
async def cancel_reservation(reservation_id: str, user: dict = Depends(get_current_user)):
    reservation = await db.reservations.find_one({"id": reservation_id, "user_id": user['id']})
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")

    if reservation['status'] in ['active', 'completed', 'cancelled']:
        raise HTTPException(status_code=400, detail="Cannot cancel this reservation")

    await db.reservations.update_one(
        {"id": reservation_id},
        {"$set": {"status": "cancelled", "updated_at": datetime.utcnow()}}
    )

    # Notify agency admins about client cancellation
    vehicle = await db.vehicles.find_one({"id": reservation['vehicle_id']})
    vname = f"{vehicle['brand']} {vehicle['model']}" if vehicle else "Véhicule"
    if reservation.get('agency_id'):
        try:
            await notify_admins_of_agency(
                reservation['agency_id'], 'client_cancelled',
                f"{user['name']} a annulé sa réservation pour {vname} ({reservation.get('start_date', datetime.utcnow()).strftime('%d/%m/%Y')}).",
                reservation_id
            )
        except Exception as e:
            logger.error(f"Failed to notify agency of cancellation: {e}")

    # Notify client: cancellation confirmed
    try:
        await create_notification(
            user['id'], 'reservation_cancelled',
            f"Votre réservation pour {vname} a été annulée.",
            reservation_id
        )
    except Exception as e:
        logger.error(f"Failed to create cancellation notification: {e}")

    return {"message": "Reservation cancelled"}


@router.get("/client/reservations")
async def get_client_reservations_detailed(user: dict = Depends(get_current_user)):
    """Get client reservations with vehicle names and contract info"""
    reservations = await db.reservations.find(
        {"user_id": user['id']}
    ).sort("start_date", -1).to_list(100)

    vehicle_ids = list(set(r.get('vehicle_id') for r in reservations if r.get('vehicle_id')))
    reservation_ids = [r.get('id') for r in reservations if r.get('id')]

    vehicles_list = await db.vehicles.find(
        {"id": {"$in": vehicle_ids}},
        {"_id": 0, "id": 1, "brand": 1, "model": 1, "photos": 1}
    ).to_list(len(vehicle_ids)) if vehicle_ids else []
    vehicles_map = {v['id']: v for v in vehicles_list}

    contracts_list = await db.contracts.find(
        {"reservation_id": {"$in": reservation_ids}},
        {"_id": 0, "id": 1, "reservation_id": 1, "status": 1}
    ).to_list(len(reservation_ids)) if reservation_ids else []
    contracts_map = {c['reservation_id']: c for c in contracts_list}

    result = []
    for r in reservations:
        r['_id'] = str(r['_id'])
        v = vehicles_map.get(r.get('vehicle_id'))
        c = contracts_map.get(r.get('id'))
        r['vehicle_name'] = f"{v['brand']} {v['model']}" if v else 'Vehicule'
        r['vehicle_photo'] = v.get('photos', [None])[0] if v and v.get('photos') else None
        r['contract_id'] = c['id'] if c else None
        r['contract_status'] = c['status'] if c else None
        result.append(r)

    return {"reservations": result, "total": len(result)}
