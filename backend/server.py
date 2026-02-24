from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, UploadFile, File, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
import jwt
import bcrypt
import base64

# Stripe integration
from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'rentdrive-secret-key-2024')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24 * 7  # 7 days

# Stripe Configuration
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', 'sk_test_emergent')

# Create the main app
app = FastAPI(title="RentDrive API", version="1.0.0")

# Create router with /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer(auto_error=False)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

# Auth Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserProfile(BaseModel):
    id: str
    email: str
    name: str
    phone: Optional[str] = None
    address: Optional[str] = None
    license_photo: Optional[str] = None
    created_at: datetime

class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfile

# Vehicle Models
class VehicleOption(BaseModel):
    name: str
    price_per_day: float = 0

class Vehicle(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    brand: str
    model: str
    year: int
    type: str  # citadine, utilitaire, SUV, berline, etc.
    price_per_day: float
    photos: List[str] = []  # base64 images
    description: Optional[str] = None
    seats: int = 5
    transmission: str = "automatic"  # automatic, manual
    fuel_type: str = "essence"  # essence, diesel, electric, hybrid
    options: List[VehicleOption] = []  # GPS, baby seat, etc.
    status: str = "available"  # available, rented, maintenance
    location: str = "Geneva"
    created_at: datetime = Field(default_factory=datetime.utcnow)

class VehicleCreate(BaseModel):
    brand: str
    model: str
    year: int
    type: str
    price_per_day: float
    photos: List[str] = []
    description: Optional[str] = None
    seats: int = 5
    transmission: str = "automatic"
    fuel_type: str = "essence"
    options: List[VehicleOption] = []
    location: str = "Geneva"

# Reservation Models
class ReservationOption(BaseModel):
    name: str
    price_per_day: float
    total_price: float

class Reservation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    vehicle_id: str
    start_date: datetime
    end_date: datetime
    options: List[ReservationOption] = []
    total_days: int
    base_price: float
    options_price: float
    total_price: float
    status: str = "pending"  # pending, confirmed, active, completed, cancelled
    payment_session_id: Optional[str] = None
    payment_status: str = "unpaid"  # unpaid, pending, paid, refunded
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ReservationCreate(BaseModel):
    vehicle_id: str
    start_date: datetime
    end_date: datetime
    options: List[str] = []  # option names

class ReservationUpdate(BaseModel):
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    options: Optional[List[str]] = None

# Payment Models
class PaymentTransaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    reservation_id: str
    session_id: str
    amount: float
    currency: str = "chf"
    status: str = "initiated"  # initiated, pending, paid, failed, refunded
    payment_status: str = "pending"
    metadata: Dict[str, Any] = {}
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class CheckoutRequest(BaseModel):
    reservation_id: str
    origin_url: str

# ==================== HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str) -> str:
    payload = {
        'user_id': user_id,
        'email': email,
        'exp': datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    payload = decode_token(credentials.credentials)
    user = await db.users.find_one({"id": payload['user_id']})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

async def get_optional_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        return None
    try:
        payload = decode_token(credentials.credentials)
        user = await db.users.find_one({"id": payload['user_id']})
        return user
    except:
        return None

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    # Check if email exists
    existing = await db.users.find_one({"email": user_data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user = {
        "id": str(uuid.uuid4()),
        "email": user_data.email.lower(),
        "password_hash": hash_password(user_data.password),
        "name": user_data.name,
        "phone": user_data.phone,
        "address": None,
        "license_photo": None,
        "created_at": datetime.utcnow()
    }
    
    await db.users.insert_one(user)
    
    token = create_token(user['id'], user['email'])
    
    return TokenResponse(
        access_token=token,
        user=UserProfile(
            id=user['id'],
            email=user['email'],
            name=user['name'],
            phone=user['phone'],
            address=user['address'],
            license_photo=user['license_photo'],
            created_at=user['created_at']
        )
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email.lower()})
    if not user or not verify_password(credentials.password, user['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_token(user['id'], user['email'])
    
    return TokenResponse(
        access_token=token,
        user=UserProfile(
            id=user['id'],
            email=user['email'],
            name=user['name'],
            phone=user.get('phone'),
            address=user.get('address'),
            license_photo=user.get('license_photo'),
            created_at=user['created_at']
        )
    )

@api_router.post("/auth/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    user = await db.users.find_one({"email": request.email.lower()})
    # Always return success to prevent email enumeration
    return {"message": "If the email exists, a password reset link will be sent"}

@api_router.get("/auth/profile", response_model=UserProfile)
async def get_profile(user: dict = Depends(get_current_user)):
    return UserProfile(
        id=user['id'],
        email=user['email'],
        name=user['name'],
        phone=user.get('phone'),
        address=user.get('address'),
        license_photo=user.get('license_photo'),
        created_at=user['created_at']
    )

@api_router.put("/auth/profile", response_model=UserProfile)
async def update_profile(update_data: UserUpdate, user: dict = Depends(get_current_user)):
    update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
    
    if update_dict:
        await db.users.update_one(
            {"id": user['id']},
            {"$set": update_dict}
        )
    
    updated_user = await db.users.find_one({"id": user['id']})
    
    return UserProfile(
        id=updated_user['id'],
        email=updated_user['email'],
        name=updated_user['name'],
        phone=updated_user.get('phone'),
        address=updated_user.get('address'),
        license_photo=updated_user.get('license_photo'),
        created_at=updated_user['created_at']
    )

@api_router.post("/auth/upload-license")
async def upload_license(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    # Read and convert to base64
    content = await file.read()
    base64_image = base64.b64encode(content).decode('utf-8')
    
    # Determine content type
    content_type = file.content_type or 'image/jpeg'
    data_uri = f"data:{content_type};base64,{base64_image}"
    
    # Update user
    await db.users.update_one(
        {"id": user['id']},
        {"$set": {"license_photo": data_uri}}
    )
    
    return {"message": "License uploaded successfully", "license_photo": data_uri}

# ==================== VEHICLE ROUTES ====================

@api_router.get("/vehicles", response_model=List[Vehicle])
async def get_vehicles(
    type: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    location: Optional[str] = None,
    transmission: Optional[str] = None,
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
    
    vehicles = await db.vehicles.find(query).to_list(100)
    
    # If dates provided, filter out vehicles with overlapping reservations
    if start_date and end_date:
        available_vehicles = []
        for vehicle in vehicles:
            # Check for overlapping reservations - include pending to prevent double booking
            overlap = await db.reservations.find_one({
                "vehicle_id": vehicle['id'],
                "status": {"$in": ["pending", "confirmed", "active"]},
                "$or": [
                    {"start_date": {"$lt": end_date}, "end_date": {"$gt": start_date}}
                ]
            })
            if not overlap:
                available_vehicles.append(vehicle)
        vehicles = available_vehicles
    
    return [Vehicle(**v) for v in vehicles]

@api_router.get("/vehicles/{vehicle_id}", response_model=Vehicle)
async def get_vehicle(vehicle_id: str):
    vehicle = await db.vehicles.find_one({"id": vehicle_id})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return Vehicle(**vehicle)

@api_router.get("/vehicles/{vehicle_id}/availability")
async def get_vehicle_availability(vehicle_id: str, month: int = None, year: int = None):
    """Get booked dates for a vehicle in a given month"""
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
        "status": {"$in": ["confirmed", "active"]},
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

# Admin routes for vehicles
@api_router.post("/admin/vehicles", response_model=Vehicle)
async def create_vehicle(vehicle_data: VehicleCreate, user: dict = Depends(get_current_user)):
    vehicle = Vehicle(**vehicle_data.dict())
    await db.vehicles.insert_one(vehicle.dict())
    return vehicle

@api_router.put("/admin/vehicles/{vehicle_id}", response_model=Vehicle)
async def update_vehicle(vehicle_id: str, vehicle_data: VehicleCreate, user: dict = Depends(get_current_user)):
    existing = await db.vehicles.find_one({"id": vehicle_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    
    update_dict = vehicle_data.dict()
    await db.vehicles.update_one({"id": vehicle_id}, {"$set": update_dict})
    
    updated = await db.vehicles.find_one({"id": vehicle_id})
    return Vehicle(**updated)

@api_router.delete("/admin/vehicles/{vehicle_id}")
async def delete_vehicle(vehicle_id: str, user: dict = Depends(get_current_user)):
    result = await db.vehicles.delete_one({"id": vehicle_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return {"message": "Vehicle deleted"}

# ==================== RESERVATION ROUTES ====================

@api_router.post("/reservations", response_model=Reservation)
async def create_reservation(
    reservation_data: ReservationCreate,
    user: dict = Depends(get_current_user)
):
    # Get vehicle
    vehicle = await db.vehicles.find_one({"id": reservation_data.vehicle_id})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    
    if vehicle['status'] == 'maintenance':
        raise HTTPException(status_code=400, detail="Vehicle is under maintenance")
    
    # Check availability - include pending reservations to prevent double booking during payment window
    overlap = await db.reservations.find_one({
        "vehicle_id": reservation_data.vehicle_id,
        "status": {"$in": ["pending", "confirmed", "active"]},
        "$or": [
            {"start_date": {"$lt": reservation_data.end_date}, "end_date": {"$gt": reservation_data.start_date}}
        ]
    })
    if overlap:
        raise HTTPException(status_code=400, detail="Vehicle not available for selected dates")
    
    # Calculate pricing
    total_days = (reservation_data.end_date - reservation_data.start_date).days
    if total_days <= 0:
        raise HTTPException(status_code=400, detail="End date must be after start date")
    
    base_price = vehicle['price_per_day'] * total_days
    
    # Calculate options
    vehicle_options = {opt['name']: opt for opt in vehicle.get('options', [])}
    selected_options = []
    options_price = 0
    
    for opt_name in reservation_data.options:
        if opt_name in vehicle_options:
            opt = vehicle_options[opt_name]
            opt_total = opt['price_per_day'] * total_days
            selected_options.append(ReservationOption(
                name=opt_name,
                price_per_day=opt['price_per_day'],
                total_price=opt_total
            ))
            options_price += opt_total
    
    total_price = base_price + options_price
    
    reservation = Reservation(
        user_id=user['id'],
        vehicle_id=reservation_data.vehicle_id,
        start_date=reservation_data.start_date,
        end_date=reservation_data.end_date,
        options=selected_options,
        total_days=total_days,
        base_price=base_price,
        options_price=options_price,
        total_price=total_price
    )
    
    await db.reservations.insert_one(reservation.dict())
    return reservation

@api_router.get("/reservations", response_model=List[Reservation])
async def get_reservations(user: dict = Depends(get_current_user)):
    reservations = await db.reservations.find(
        {"user_id": user['id']}
    ).sort("created_at", -1).to_list(100)
    
    return [Reservation(**r) for r in reservations]

@api_router.get("/reservations/{reservation_id}", response_model=Reservation)
async def get_reservation(reservation_id: str, user: dict = Depends(get_current_user)):
    reservation = await db.reservations.find_one({
        "id": reservation_id,
        "user_id": user['id']
    })
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    return Reservation(**reservation)

@api_router.put("/reservations/{reservation_id}", response_model=Reservation)
async def update_reservation(
    reservation_id: str,
    update_data: ReservationUpdate,
    user: dict = Depends(get_current_user)
):
    reservation = await db.reservations.find_one({
        "id": reservation_id,
        "user_id": user['id']
    })
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    
    if reservation['status'] in ['active', 'completed']:
        raise HTTPException(status_code=400, detail="Cannot modify active or completed reservations")
    
    # Recalculate if dates change
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
                "start_date": start,
                "end_date": end,
                "total_days": total_days,
                "base_price": base_price,
                "options_price": options_price,
                "total_price": total_price,
                "updated_at": datetime.utcnow()
            }}
        )
    
    updated = await db.reservations.find_one({"id": reservation_id})
    return Reservation(**updated)

@api_router.post("/reservations/{reservation_id}/cancel")
async def cancel_reservation(reservation_id: str, user: dict = Depends(get_current_user)):
    reservation = await db.reservations.find_one({
        "id": reservation_id,
        "user_id": user['id']
    })
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    
    if reservation['status'] in ['active', 'completed', 'cancelled']:
        raise HTTPException(status_code=400, detail="Cannot cancel this reservation")
    
    await db.reservations.update_one(
        {"id": reservation_id},
        {"$set": {"status": "cancelled", "updated_at": datetime.utcnow()}}
    )
    
    return {"message": "Reservation cancelled"}

# ==================== PAYMENT ROUTES ====================

@api_router.post("/payments/checkout")
async def create_checkout(request: Request, checkout_data: CheckoutRequest, user: dict = Depends(get_current_user)):
    # Get reservation
    reservation = await db.reservations.find_one({
        "id": checkout_data.reservation_id,
        "user_id": user['id']
    })
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    
    if reservation['payment_status'] == 'paid':
        raise HTTPException(status_code=400, detail="Reservation already paid")
    
    # Initialize Stripe
    host_url = checkout_data.origin_url.rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    # Create checkout session
    success_url = f"{host_url}/payment-success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{host_url}/payment-cancel?reservation_id={reservation['id']}"
    
    metadata = {
        "user_id": user['id'],
        "reservation_id": reservation['id'],
        "user_email": user['email']
    }
    
    checkout_request = CheckoutSessionRequest(
        amount=float(reservation['total_price']),
        currency="chf",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Create payment transaction record
    payment_transaction = PaymentTransaction(
        user_id=user['id'],
        reservation_id=reservation['id'],
        session_id=session.session_id,
        amount=float(reservation['total_price']),
        currency="chf",
        status="initiated",
        payment_status="pending",
        metadata=metadata
    )
    
    await db.payment_transactions.insert_one(payment_transaction.dict())
    
    # Update reservation with session ID
    await db.reservations.update_one(
        {"id": reservation['id']},
        {"$set": {"payment_session_id": session.session_id}}
    )
    
    return {"url": session.url, "session_id": session.session_id}

@api_router.get("/payments/status/{session_id}")
async def get_payment_status(session_id: str, user: dict = Depends(get_current_user)):
    # Get transaction
    transaction = await db.payment_transactions.find_one({
        "session_id": session_id,
        "user_id": user['id']
    })
    if not transaction:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    # Check with Stripe
    webhook_url = "https://placeholder.com/webhook"  # Not used for status check
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    try:
        checkout_status = await stripe_checkout.get_checkout_status(session_id)
        
        # Update transaction if status changed
        if checkout_status.payment_status == 'paid' and transaction['status'] != 'paid':
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {
                    "status": "paid",
                    "payment_status": "paid",
                    "updated_at": datetime.utcnow()
                }}
            )
            
            # Update reservation
            await db.reservations.update_one(
                {"id": transaction['reservation_id']},
                {"$set": {
                    "status": "confirmed",
                    "payment_status": "paid",
                    "updated_at": datetime.utcnow()
                }}
            )
        
        return {
            "status": checkout_status.status,
            "payment_status": checkout_status.payment_status,
            "amount": checkout_status.amount_total / 100,  # Convert from cents
            "currency": checkout_status.currency
        }
    except Exception as e:
        logger.error(f"Error checking payment status: {e}")
        return {
            "status": transaction['status'],
            "payment_status": transaction['payment_status'],
            "amount": transaction['amount'],
            "currency": transaction['currency']
        }

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events"""
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    # For now, just log the webhook
    logger.info(f"Received Stripe webhook")
    
    return {"received": True}

# ==================== SEED DATA ====================

@api_router.post("/seed")
async def seed_data():
    """Seed initial vehicle data for testing"""
    
    # Check if vehicles exist
    count = await db.vehicles.count_documents({})
    if count > 0:
        return {"message": f"Database already has {count} vehicles"}
    
    vehicles = [
        {
            "id": str(uuid.uuid4()),
            "brand": "BMW",
            "model": "Series 3",
            "year": 2024,
            "type": "berline",
            "price_per_day": 120.0,
            "photos": ["https://images.unsplash.com/photo-1598248649596-3fae8846c122?w=800"],
            "description": "Elegant BMW Series 3 with premium features. Perfect for business trips and comfortable journeys.",
            "seats": 5,
            "transmission": "automatic",
            "fuel_type": "hybrid",
            "options": [
                {"name": "GPS", "price_per_day": 10.0},
                {"name": "Baby Seat", "price_per_day": 15.0},
                {"name": "Additional Driver", "price_per_day": 20.0}
            ],
            "status": "available",
            "location": "Geneva",
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "brand": "Mercedes",
            "model": "C-Class",
            "year": 2024,
            "type": "berline",
            "price_per_day": 150.0,
            "photos": ["https://images.unsplash.com/photo-1583573736485-4add9bc7ac0a?w=800"],
            "description": "Luxurious Mercedes C-Class with leather interior and advanced technology.",
            "seats": 5,
            "transmission": "automatic",
            "fuel_type": "diesel",
            "options": [
                {"name": "GPS", "price_per_day": 10.0},
                {"name": "Baby Seat", "price_per_day": 15.0},
                {"name": "Premium Insurance", "price_per_day": 25.0}
            ],
            "status": "available",
            "location": "Zurich",
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "brand": "Volkswagen",
            "model": "Golf",
            "year": 2023,
            "type": "citadine",
            "price_per_day": 65.0,
            "photos": ["https://images.pexels.com/photos/164634/pexels-photo-164634.jpeg?w=800"],
            "description": "Compact and fuel-efficient Volkswagen Golf. Ideal for city driving.",
            "seats": 5,
            "transmission": "manual",
            "fuel_type": "essence",
            "options": [
                {"name": "GPS", "price_per_day": 10.0},
                {"name": "Baby Seat", "price_per_day": 15.0}
            ],
            "status": "available",
            "location": "Geneva",
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "brand": "Audi",
            "model": "Q5",
            "year": 2024,
            "type": "SUV",
            "price_per_day": 180.0,
            "photos": ["https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800"],
            "description": "Spacious Audi Q5 SUV with quattro all-wheel drive. Perfect for mountain trips.",
            "seats": 5,
            "transmission": "automatic",
            "fuel_type": "diesel",
            "options": [
                {"name": "GPS", "price_per_day": 10.0},
                {"name": "Baby Seat", "price_per_day": 15.0},
                {"name": "Ski Rack", "price_per_day": 20.0},
                {"name": "Winter Tires", "price_per_day": 15.0}
            ],
            "status": "available",
            "location": "Lausanne",
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "brand": "Renault",
            "model": "Kangoo",
            "year": 2023,
            "type": "utilitaire",
            "price_per_day": 85.0,
            "photos": ["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800"],
            "description": "Practical Renault Kangoo utility vehicle. Great for moving or transport needs.",
            "seats": 2,
            "transmission": "manual",
            "fuel_type": "diesel",
            "options": [
                {"name": "GPS", "price_per_day": 10.0},
                {"name": "Cargo Net", "price_per_day": 5.0}
            ],
            "status": "available",
            "location": "Geneva",
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "brand": "Tesla",
            "model": "Model 3",
            "year": 2024,
            "type": "berline",
            "price_per_day": 200.0,
            "photos": ["https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800"],
            "description": "All-electric Tesla Model 3 with autopilot. Zero emissions and cutting-edge technology.",
            "seats": 5,
            "transmission": "automatic",
            "fuel_type": "electric",
            "options": [
                {"name": "Full Self-Driving", "price_per_day": 30.0},
                {"name": "Baby Seat", "price_per_day": 15.0}
            ],
            "status": "available",
            "location": "Zurich",
            "created_at": datetime.utcnow()
        }
    ]
    
    await db.vehicles.insert_many(vehicles)
    
    return {"message": f"Seeded {len(vehicles)} vehicles"}

# Include router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
