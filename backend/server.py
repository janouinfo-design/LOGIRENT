from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, UploadFile, File, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
import jwt
import bcrypt
import base64
import resend

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

# Email Configuration
RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'contact@logitrak.ch')
resend.api_key = RESEND_API_KEY

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
    status: str = "pending"  # pending, pending_cash, confirmed, active, completed, cancelled
    payment_method: str = "card"  # card or cash
    payment_session_id: Optional[str] = None
    payment_status: str = "unpaid"  # unpaid, pending, paid, refunded
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ReservationCreate(BaseModel):
    vehicle_id: str
    start_date: datetime
    end_date: datetime
    options: List[str] = []  # option names
    payment_method: str = "card"  # card or cash

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
        "status": {"$in": ["pending", "pending_cash", "confirmed", "active"]},
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
    
    # Determine status based on payment method
    payment_method = reservation_data.payment_method
    if payment_method not in ["card", "cash"]:
        payment_method = "card"
    
    # If cash payment, set status to pending_cash
    status = "pending_cash" if payment_method == "cash" else "pending"
    
    reservation = Reservation(
        user_id=user['id'],
        vehicle_id=reservation_data.vehicle_id,
        start_date=reservation_data.start_date,
        end_date=reservation_data.end_date,
        options=selected_options,
        total_days=total_days,
        base_price=base_price,
        options_price=options_price,
        total_price=total_price,
        status=status,
        payment_method=payment_method
    )
    
    await db.reservations.insert_one(reservation.dict())
    
    # Send confirmation email for cash reservations
    if payment_method == "cash":
        try:
            await send_cash_reservation_email(user, vehicle, reservation.dict())
        except Exception as email_error:
            logger.error(f"Failed to send cash reservation email: {email_error}")
    
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
            
            # Send confirmation email
            try:
                reservation = await db.reservations.find_one({"id": transaction['reservation_id']})
                vehicle = await db.vehicles.find_one({"id": reservation['vehicle_id']})
                if reservation and vehicle:
                    await send_reservation_confirmation(user, vehicle, reservation)
            except Exception as email_error:
                logger.error(f"Failed to send confirmation email: {email_error}")
        
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

# ==================== EMAIL FUNCTIONS ====================

async def send_email(recipient: str, subject: str, html_content: str):
    """Send email using Resend"""
    if not RESEND_API_KEY or RESEND_API_KEY == 're_placeholder':
        logger.info(f"Email would be sent to {recipient}: {subject}")
        return None
    
    params = {
        "from": SENDER_EMAIL,
        "to": [recipient],
        "subject": subject,
        "html": html_content
    }
    
    try:
        email = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Email sent to {recipient}: {email.get('id')}")
        return email.get("id")
    except Exception as e:
        logger.error(f"Failed to send email to {recipient}: {str(e)}")
        return None

def generate_reservation_confirmation_email(user_name: str, vehicle: dict, reservation: dict) -> str:
    """Generate HTML email for reservation confirmation"""
    start_date = reservation['start_date']
    end_date = reservation['end_date']
    if isinstance(start_date, str):
        start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
    if isinstance(end_date, str):
        end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
    
    return f'''
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #1E293B; margin: 0; padding: 0; background-color: #F8FAFC;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #1E3A8A; padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
                <h1 style="color: #FFFFFF; margin: 0; font-size: 28px;">🚗 RentDrive</h1>
                <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0 0;">Reservation Confirmed</p>
            </div>
            
            <div style="background-color: #FFFFFF; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <h2 style="color: #1E3A8A; margin-top: 0;">Hello {user_name}!</h2>
                <p>Your reservation has been confirmed. Here are the details:</p>
                
                <div style="background-color: #F8FAFC; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #1E3A8A;">{vehicle['brand']} {vehicle['model']} ({vehicle['year']})</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; color: #64748B;">Pick-up Date:</td>
                            <td style="padding: 8px 0; font-weight: bold;">{start_date.strftime('%B %d, %Y')}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #64748B;">Return Date:</td>
                            <td style="padding: 8px 0; font-weight: bold;">{end_date.strftime('%B %d, %Y')}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #64748B;">Duration:</td>
                            <td style="padding: 8px 0; font-weight: bold;">{reservation['total_days']} days</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #64748B;">Location:</td>
                            <td style="padding: 8px 0; font-weight: bold;">{vehicle['location']}</td>
                        </tr>
                    </table>
                </div>
                
                <div style="background-color: #1E3A8A; color: #FFFFFF; padding: 15px 20px; border-radius: 8px; text-align: center;">
                    <span style="font-size: 14px;">Total Amount:</span>
                    <span style="font-size: 24px; font-weight: bold; margin-left: 10px;">CHF {reservation['total_price']:.2f}</span>
                </div>
                
                <p style="margin-top: 20px; color: #64748B; font-size: 14px;">
                    Please bring your valid driving license when picking up the vehicle.
                    For any questions, contact us at {SENDER_EMAIL}.
                </p>
                
                <p style="margin-top: 30px;">
                    Safe travels!<br>
                    <strong>The RentDrive Team</strong>
                </p>
            </div>
            
            <div style="text-align: center; padding: 20px; color: #64748B; font-size: 12px;">
                <p>© 2024 RentDrive. All rights reserved.</p>
                <p>LogiTrak Switzerland</p>
            </div>
        </div>
    </body>
    </html>
    '''

async def send_reservation_confirmation(user: dict, vehicle: dict, reservation: dict):
    """Send reservation confirmation email"""
    html = generate_reservation_confirmation_email(user['name'], vehicle, reservation)
    await send_email(
        user['email'],
        f"Reservation Confirmed - {vehicle['brand']} {vehicle['model']}",
        html
    )

# ==================== ADMIN ROUTES ====================

class AdminLogin(BaseModel):
    email: EmailStr
    password: str

class AdminStats(BaseModel):
    total_vehicles: int
    total_users: int
    total_reservations: int
    total_revenue: float
    reservations_by_status: Dict[str, int]
    top_vehicles: List[Dict[str, Any]]
    revenue_by_month: List[Dict[str, Any]]

# Admin user check
async def get_admin_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Check if user is admin (for simplicity, first registered user is admin)"""
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    payload = decode_token(credentials.credentials)
    user = await db.users.find_one({"id": payload['user_id']})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    # Check if user is admin (you could add an is_admin field)
    # For MVP, allow all authenticated users to access admin
    return user

@api_router.get("/admin/stats", response_model=AdminStats)
async def get_admin_stats(user: dict = Depends(get_admin_user)):
    """Get dashboard statistics"""
    
    # Total counts
    total_vehicles = await db.vehicles.count_documents({})
    total_users = await db.users.count_documents({})
    total_reservations = await db.reservations.count_documents({})
    
    # Total revenue (from paid reservations)
    pipeline = [
        {"$match": {"payment_status": "paid"}},
        {"$group": {"_id": None, "total": {"$sum": "$total_price"}}}
    ]
    revenue_result = await db.reservations.aggregate(pipeline).to_list(1)
    total_revenue = revenue_result[0]["total"] if revenue_result else 0
    
    # Reservations by status
    status_pipeline = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    status_result = await db.reservations.aggregate(status_pipeline).to_list(10)
    reservations_by_status = {item["_id"]: item["count"] for item in status_result}
    
    # Top rented vehicles
    top_pipeline = [
        {"$group": {"_id": "$vehicle_id", "rental_count": {"$sum": 1}}},
        {"$sort": {"rental_count": -1}},
        {"$limit": 5}
    ]
    top_result = await db.reservations.aggregate(top_pipeline).to_list(5)
    
    top_vehicles = []
    for item in top_result:
        vehicle = await db.vehicles.find_one({"id": item["_id"]})
        if vehicle:
            top_vehicles.append({
                "id": vehicle["id"],
                "name": f"{vehicle['brand']} {vehicle['model']}",
                "rental_count": item["rental_count"]
            })
    
    # Revenue by month (last 6 months)
    six_months_ago = datetime.utcnow() - timedelta(days=180)
    monthly_pipeline = [
        {"$match": {"payment_status": "paid", "created_at": {"$gte": six_months_ago}}},
        {"$group": {
            "_id": {"year": {"$year": "$created_at"}, "month": {"$month": "$created_at"}},
            "revenue": {"$sum": "$total_price"},
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id.year": 1, "_id.month": 1}}
    ]
    monthly_result = await db.reservations.aggregate(monthly_pipeline).to_list(12)
    
    revenue_by_month = []
    for item in monthly_result:
        month_name = datetime(item["_id"]["year"], item["_id"]["month"], 1).strftime("%b %Y")
        revenue_by_month.append({
            "month": month_name,
            "revenue": item["revenue"],
            "reservations": item["count"]
        })
    
    return AdminStats(
        total_vehicles=total_vehicles,
        total_users=total_users,
        total_reservations=total_reservations,
        total_revenue=total_revenue,
        reservations_by_status=reservations_by_status,
        top_vehicles=top_vehicles,
        revenue_by_month=revenue_by_month
    )

@api_router.get("/admin/users")
async def get_admin_users(
    skip: int = 0,
    limit: int = 20,
    user: dict = Depends(get_admin_user)
):
    """Get all users for admin"""
    users = await db.users.find({}, {"password_hash": 0}).skip(skip).limit(limit).to_list(limit)
    total = await db.users.count_documents({})
    
    # Get reservation count for each user
    for u in users:
        u['reservation_count'] = await db.reservations.count_documents({"user_id": u['id']})
        u['_id'] = str(u['_id'])
    
    return {"users": users, "total": total}

@api_router.put("/admin/users/{user_id}/block")
async def block_user(user_id: str, user: dict = Depends(get_admin_user)):
    """Block/unblock a user"""
    target_user = await db.users.find_one({"id": user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    new_status = not target_user.get('blocked', False)
    await db.users.update_one({"id": user_id}, {"$set": {"blocked": new_status}})
    
    return {"message": f"User {'blocked' if new_status else 'unblocked'}"}

@api_router.get("/admin/reservations")
async def get_admin_reservations(
    skip: int = 0,
    limit: int = 20,
    status: Optional[str] = None,
    user: dict = Depends(get_admin_user)
):
    """Get all reservations for admin"""
    query = {}
    if status:
        query["status"] = status
    
    reservations = await db.reservations.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.reservations.count_documents(query)
    
    # Enrich with user and vehicle info
    for res in reservations:
        res['_id'] = str(res['_id'])
        res_user = await db.users.find_one({"id": res['user_id']})
        vehicle = await db.vehicles.find_one({"id": res['vehicle_id']})
        res['user_name'] = res_user['name'] if res_user else 'Unknown'
        res['user_email'] = res_user['email'] if res_user else 'Unknown'
        res['vehicle_name'] = f"{vehicle['brand']} {vehicle['model']}" if vehicle else 'Unknown'
    
    return {"reservations": reservations, "total": total}

@api_router.put("/admin/reservations/{reservation_id}/status")
async def update_reservation_status(
    reservation_id: str,
    status: str,
    user: dict = Depends(get_admin_user)
):
    """Update reservation status"""
    valid_statuses = ["pending", "confirmed", "active", "completed", "cancelled"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    result = await db.reservations.update_one(
        {"id": reservation_id},
        {"$set": {"status": status, "updated_at": datetime.utcnow()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Reservation not found")
    
    return {"message": f"Reservation status updated to {status}"}

@api_router.get("/admin/payments")
async def get_admin_payments(
    skip: int = 0,
    limit: int = 20,
    user: dict = Depends(get_admin_user)
):
    """Get all payment transactions"""
    transactions = await db.payment_transactions.find({}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.payment_transactions.count_documents({})
    
    for tx in transactions:
        tx['_id'] = str(tx['_id'])
        tx_user = await db.users.find_one({"id": tx['user_id']})
        tx['user_email'] = tx_user['email'] if tx_user else 'Unknown'
    
    return {"transactions": transactions, "total": total}

@api_router.put("/admin/vehicles/{vehicle_id}/status")
async def update_vehicle_status(
    vehicle_id: str,
    status: str,
    user: dict = Depends(get_admin_user)
):
    """Update vehicle status"""
    valid_statuses = ["available", "rented", "maintenance"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    result = await db.vehicles.update_one(
        {"id": vehicle_id},
        {"$set": {"status": status}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    
    return {"message": f"Vehicle status updated to {status}"}

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
