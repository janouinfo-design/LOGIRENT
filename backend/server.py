from fastapi import FastAPI, APIRouter
from starlette.middleware.cors import CORSMiddleware
import asyncio
import logging
import subprocess
import os
from datetime import datetime
import uuid

from database import db, client
from deps import hash_password

# Import all routers
from routes.auth import router as auth_router
from routes.vehicles import router as vehicles_router
from routes.reservations import router as reservations_router
from routes.notifications import router as notifications_router
from routes.payments import router as payments_router
from routes.admin import router as admin_router, overdue_cron_loop
from routes.agencies import router as agencies_router
from routes.navixy import router as navixy_router
from routes.contracts import router as contracts_router
from routes.inspections import router as inspections_router
from routes.invoices import router as invoices_router
from utils.notifications import create_notification

# Create the main app
app = FastAPI(title="LogiRent API", version="1.0.0")

# CORS middleware - must be added BEFORE routes
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[
        "https://www.logirent.ch",
        "https://logirent.ch",
        "https://app.logirent.ch",
        os.environ.get("APP_URL", ""),
        "http://localhost:3000",
        "http://localhost:8081",
        "http://localhost:19006",
    ],
    allow_origin_regex=r"https://.*\.(logirent\.ch|preview\.emergentagent\.com)",
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create router with /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Include all module routers into the /api router
api_router.include_router(auth_router)
api_router.include_router(vehicles_router)
api_router.include_router(reservations_router)
api_router.include_router(notifications_router)
api_router.include_router(payments_router)
api_router.include_router(admin_router)
api_router.include_router(agencies_router)
api_router.include_router(navixy_router)
api_router.include_router(contracts_router)
api_router.include_router(inspections_router)
api_router.include_router(invoices_router)


# ==================== VERSION ENDPOINT ====================

@api_router.get("/version")
async def get_version():
    """Retourne la version deployee pour verification de coherence."""
    git_hash = "unknown"
    git_date = "unknown"
    try:
        git_hash = subprocess.check_output(
            ["git", "rev-parse", "--short", "HEAD"],
            stderr=subprocess.DEVNULL, timeout=3
        ).decode().strip()
        git_date = subprocess.check_output(
            ["git", "log", "-1", "--format=%ci"],
            stderr=subprocess.DEVNULL, timeout=3
        ).decode().strip()
    except Exception:
        pass

    return {
        "app": "LogiRent",
        "api_version": "1.0.0",
        "git_commit": git_hash,
        "git_date": git_date,
        "environment": os.environ.get("LOGIRENT_ENV", "production"),
        "db_name": os.environ.get("DB_NAME", "?"),
        "server_time": datetime.utcnow().isoformat(),
    }


# ==================== SEED DATA ====================

@api_router.post("/seed")
async def seed_data():
    """Seed initial vehicle data for testing"""
    count = await db.vehicles.count_documents({})
    if count > 0:
        return {"message": f"Database already has {count} vehicles"}

    vehicles = [
        {
            "id": str(uuid.uuid4()),
            "brand": "BMW", "model": "Series 3", "year": 2024, "type": "berline",
            "price_per_day": 120.0,
            "photos": ["https://images.unsplash.com/photo-1598248649596-3fae8846c122?w=800"],
            "description": "Elegant BMW Series 3 with premium features.",
            "seats": 5, "transmission": "automatic", "fuel_type": "hybrid",
            "options": [
                {"name": "GPS", "price_per_day": 10.0},
                {"name": "Baby Seat", "price_per_day": 15.0},
                {"name": "Additional Driver", "price_per_day": 20.0}
            ],
            "status": "available", "location": "Geneva", "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "brand": "Mercedes", "model": "C-Class", "year": 2024, "type": "berline",
            "price_per_day": 150.0,
            "photos": ["https://images.unsplash.com/photo-1583573736485-4add9bc7ac0a?w=800"],
            "description": "Luxurious Mercedes C-Class with leather interior.",
            "seats": 5, "transmission": "automatic", "fuel_type": "diesel",
            "options": [
                {"name": "GPS", "price_per_day": 10.0},
                {"name": "Baby Seat", "price_per_day": 15.0},
                {"name": "Premium Insurance", "price_per_day": 25.0}
            ],
            "status": "available", "location": "Zurich", "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "brand": "Volkswagen", "model": "Golf", "year": 2023, "type": "citadine",
            "price_per_day": 65.0,
            "photos": ["https://images.pexels.com/photos/164634/pexels-photo-164634.jpeg?w=800"],
            "description": "Compact and fuel-efficient Volkswagen Golf.",
            "seats": 5, "transmission": "manual", "fuel_type": "essence",
            "options": [
                {"name": "GPS", "price_per_day": 10.0},
                {"name": "Baby Seat", "price_per_day": 15.0}
            ],
            "status": "available", "location": "Geneva", "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "brand": "Audi", "model": "Q5", "year": 2024, "type": "SUV",
            "price_per_day": 180.0,
            "photos": ["https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800"],
            "description": "Spacious Audi Q5 SUV with quattro all-wheel drive.",
            "seats": 5, "transmission": "automatic", "fuel_type": "diesel",
            "options": [
                {"name": "GPS", "price_per_day": 10.0},
                {"name": "Baby Seat", "price_per_day": 15.0},
                {"name": "Ski Rack", "price_per_day": 20.0},
                {"name": "Winter Tires", "price_per_day": 15.0}
            ],
            "status": "available", "location": "Lausanne", "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "brand": "Renault", "model": "Kangoo", "year": 2023, "type": "utilitaire",
            "price_per_day": 85.0,
            "photos": ["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800"],
            "description": "Practical Renault Kangoo utility vehicle.",
            "seats": 2, "transmission": "manual", "fuel_type": "diesel",
            "options": [
                {"name": "GPS", "price_per_day": 10.0},
                {"name": "Cargo Net", "price_per_day": 5.0}
            ],
            "status": "available", "location": "Geneva", "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "brand": "Tesla", "model": "Model 3", "year": 2024, "type": "berline",
            "price_per_day": 200.0,
            "photos": ["https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800"],
            "description": "All-electric Tesla Model 3 with autopilot.",
            "seats": 5, "transmission": "automatic", "fuel_type": "electric",
            "options": [
                {"name": "Full Self-Driving", "price_per_day": 30.0},
                {"name": "Baby Seat", "price_per_day": 15.0}
            ],
            "status": "available", "location": "Zurich", "created_at": datetime.utcnow()
        }
    ]

    await db.vehicles.insert_many(vehicles)
    return {"message": f"Seeded {len(vehicles)} vehicles"}


# Include the api router in the app
app.include_router(api_router)


async def _check_reminders_task():
    """Send reminder notifications AND emails for reservations starting tomorrow"""
    from datetime import timedelta
    from utils.email import send_reminder_24h
    now = datetime.utcnow()
    tomorrow_start = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow_end = tomorrow_start + timedelta(days=1)

    upcoming = await db.reservations.find({
        "status": {"$in": ["confirmed"]},
        "start_date": {"$gte": tomorrow_start, "$lt": tomorrow_end}
    }).to_list(100)

    created = 0
    for res in upcoming:
        existing = await db.notifications.find_one({
            "reservation_id": res['id'],
            "type": "reservation_reminder"
        })
        if existing:
            continue

        vehicle = await db.vehicles.find_one({"id": res['vehicle_id']})
        vname = f"{vehicle['brand']} {vehicle['model']}" if vehicle else "Vehicule"
        user = await db.users.find_one({"id": res['user_id']})

        await create_notification(
            res['user_id'], 'reservation_reminder',
            f"Rappel : Votre location de {vname} commence demain le {res['start_date'].strftime('%d/%m/%Y')}. N'oubliez pas votre carte d'identite et votre permis de conduire.",
            res['id']
        )

        # Send reminder email
        if user and vehicle:
            try:
                await send_reminder_24h(user, vehicle, res)
            except Exception as e:
                logger.error(f"Failed to send reminder email: {e}")

        created += 1
    return created


async def reminder_cron_loop():
    while True:
        try:
            created = await _check_reminders_task()
            if created > 0:
                logger.info(f"Reminder cron: sent {created} reminder notifications")
        except Exception as e:
            logger.error(f"Reminder cron error: {e}")
        await asyncio.sleep(3600)


@app.on_event("startup")
async def startup_cron():
    asyncio.create_task(overdue_cron_loop())
    asyncio.create_task(reminder_cron_loop())
    logger.info("Overdue cron job started (checks every hour)")
    logger.info("Reminder cron job started (checks every hour)")
    try:
        from utils.storage import init_storage
        init_storage()
        logger.info("Object storage initialized")
    except Exception as e:
        logger.error(f"Object storage init failed: {e}")

    # Run vehicle_models migration (idempotent)
    try:
        from utils.migrate_models import migrate_vehicle_models
        await migrate_vehicle_models(db)
    except Exception as e:
        logger.error(f"Vehicle models migration failed at startup: {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
