from fastapi import FastAPI, APIRouter
from starlette.middleware.cors import CORSMiddleware
import asyncio
import logging
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

# Create the main app
app = FastAPI(title="LogiRent API", version="1.0.0")

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

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_cron():
    asyncio.create_task(overdue_cron_loop())
    logger.info("Overdue cron job started (checks every hour)")
    try:
        from utils.storage import init_storage
        init_storage()
        logger.info("Object storage initialized")
    except Exception as e:
        logger.error(f"Object storage init failed: {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
