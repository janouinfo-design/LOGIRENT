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

import re

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

# Navixy Configuration
NAVIXY_API_URL = os.environ.get('NAVIXY_API_URL')
NAVIXY_HASH = os.environ.get('NAVIXY_HASH')

# AI Document Verification
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

import httpx
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

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

# Agency Model
class Agency(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    slug: str = ""
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    logo: Optional[str] = None
    navixy_api_url: Optional[str] = None
    navixy_hash: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class AgencyCreate(BaseModel):
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    admin_name: Optional[str] = None
    admin_email: Optional[str] = None
    admin_password: Optional[str] = None
    navixy_api_url: Optional[str] = None
    navixy_hash: Optional[str] = None

# Auth Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: Optional[str] = None
    agency_id: Optional[str] = None

class AdminRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: Optional[str] = None
    agency_name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserProfile(BaseModel):
    id: str
    email: str
    name: str
    phone: Optional[str] = None
    address: Optional[str] = None
    id_photo: Optional[str] = None
    license_photo: Optional[str] = None
    profile_photo: Optional[str] = None
    client_rating: Optional[str] = None
    admin_notes: Optional[str] = None
    role: str = "client"  # client, admin, super_admin
    agency_id: Optional[str] = None
    agency_name: Optional[str] = None
    created_at: datetime

class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

class AdminUserUpdate(BaseModel):
    client_rating: Optional[str] = None
    admin_notes: Optional[str] = None
    name: Optional[str] = None
    email: Optional[str] = None
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
    agency_id: Optional[str] = None
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
    agency_id: Optional[str] = None
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
    payment_method_type: str = "card"  # card, twint

# ==================== HELPERS ====================

def generate_slug(name: str) -> str:
    """Generate a URL-friendly slug from agency name"""
    slug = name.lower().strip()
    slug = re.sub(r'[àáâãäå]', 'a', slug)
    slug = re.sub(r'[èéêë]', 'e', slug)
    slug = re.sub(r'[ìíîï]', 'i', slug)
    slug = re.sub(r'[òóôõö]', 'o', slug)
    slug = re.sub(r'[ùúûü]', 'u', slug)
    slug = re.sub(r'[ç]', 'c', slug)
    slug = re.sub(r'[^a-z0-9]+', '-', slug)
    slug = slug.strip('-')
    return slug

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str, role: str = 'client') -> str:
    payload = {
        'user_id': user_id,
        'email': email,
        'role': role,
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

async def build_user_profile(user: dict) -> UserProfile:
    """Build UserProfile from user dict, resolving agency name if needed"""
    agency_name = None
    agency_id = user.get('agency_id')
    if agency_id:
        agency = await db.agencies.find_one({"id": agency_id})
        if agency:
            agency_name = agency.get('name')
    return UserProfile(
        id=user['id'],
        email=user['email'],
        name=user['name'],
        phone=user.get('phone'),
        address=user.get('address'),
        id_photo=user.get('id_photo'),
        license_photo=user.get('license_photo'),
        profile_photo=user.get('profile_photo'),
        client_rating=user.get('client_rating'),
        admin_notes=user.get('admin_notes'),
        role=user.get('role', 'client'),
        agency_id=agency_id,
        agency_name=agency_name,
        created_at=user['created_at']
    )

async def get_agency_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Check if user is an agency admin and return user with agency_id"""
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(credentials.credentials)
    user = await db.users.find_one({"id": payload['user_id']})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    role = user.get('role', 'client')
    if role not in ('admin', 'super_admin'):
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    return user

async def get_super_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Check if user is a super admin"""
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(credentials.credentials)
    user = await db.users.find_one({"id": payload['user_id']})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if user.get('role') != 'super_admin':
        raise HTTPException(status_code=403, detail="Accès réservé au super administrateur")
    return user

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Validate agency_id if provided
    agency_id = user_data.agency_id
    if agency_id:
        agency = await db.agencies.find_one({"id": agency_id})
        if not agency:
            raise HTTPException(status_code=400, detail="Agency not found")
    
    user = {
        "id": str(uuid.uuid4()),
        "email": user_data.email.lower(),
        "password_hash": hash_password(user_data.password),
        "name": user_data.name,
        "phone": user_data.phone,
        "address": None,
        "id_photo": None,
        "license_photo": None,
        "role": "client",
        "agency_id": agency_id,
        "created_at": datetime.utcnow()
    }
    
    await db.users.insert_one(user)
    token = create_token(user['id'], user['email'], 'client')
    profile = await build_user_profile(user)
    
    return TokenResponse(access_token=token, user=profile)

@api_router.post("/auth/register-admin", response_model=TokenResponse)
async def register_admin(data: AdminRegister):
    """Register a new agency admin with a new agency"""
    existing = await db.users.find_one({"email": data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create agency
    agency = Agency(name=data.agency_name)
    await db.agencies.insert_one(agency.dict())
    
    # Create admin user
    user = {
        "id": str(uuid.uuid4()),
        "email": data.email.lower(),
        "password_hash": hash_password(data.password),
        "name": data.name,
        "phone": data.phone,
        "address": None,
        "id_photo": None,
        "license_photo": None,
        "role": "admin",
        "agency_id": agency.id,
        "created_at": datetime.utcnow()
    }
    
    await db.users.insert_one(user)
    token = create_token(user['id'], user['email'], 'admin')
    profile = await build_user_profile(user)
    
    return TokenResponse(access_token=token, user=profile)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email.lower()})
    if not user or not verify_password(credentials.password, user['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    role = user.get('role', 'client')
    token = create_token(user['id'], user['email'], role)
    profile = await build_user_profile(user)
    
    return TokenResponse(access_token=token, user=profile)

@api_router.post("/auth/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    user = await db.users.find_one({"email": request.email.lower()})
    # Always return success to prevent email enumeration
    return {"message": "If the email exists, a password reset link will be sent"}

@api_router.get("/auth/profile", response_model=UserProfile)
async def get_profile(user: dict = Depends(get_current_user)):
    return await build_user_profile(user)

@api_router.put("/auth/profile", response_model=UserProfile)
async def update_profile(update_data: UserUpdate, user: dict = Depends(get_current_user)):
    update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
    
    if update_dict:
        await db.users.update_one(
            {"id": user['id']},
            {"$set": update_dict}
        )
    
    updated_user = await db.users.find_one({"id": user['id']})
    return await build_user_profile(updated_user)

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

class Base64Upload(BaseModel):
    image_data: str  # base64 data URI like "data:image/jpeg;base64,..."

async def verify_document_with_ai(image_base64: str, doc_type: str) -> dict:
    """Use GPT-5.2 Vision to verify if an uploaded image is a valid document"""
    if not EMERGENT_LLM_KEY:
        return {"is_valid": True, "confidence": 0, "reason": "Vérification IA non configurée", "details": {}}
    
    try:
        # Strip data URI prefix to get raw base64
        raw_b64 = image_base64
        if ";base64," in raw_b64:
            raw_b64 = raw_b64.split(";base64,")[1]
        
        doc_name = "carte d'identité" if doc_type == "id" else "permis de conduire"
        
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"doc-verify-{uuid.uuid4()}",
            system_message="Tu es un expert en vérification de documents d'identité. Tu dois analyser les images soumises et déterminer si elles représentent de vrais documents officiels. Réponds UNIQUEMENT en JSON valide."
        ).with_model("openai", "gpt-5.2")
        
        image_content = ImageContent(image_base64=raw_b64)
        
        prompt = f"""Analyse cette image et détermine si c'est un(e) {doc_name} valide.

Critères de vérification:
1. L'image montre-t-elle un document officiel (pas une photo d'écran, pas un dessin) ?
2. Le document est-il lisible (pas trop flou, pas coupé) ?
3. Le document ressemble-t-il à un vrai {doc_name} (format, éléments de sécurité visibles) ?
4. L'image n'est-elle pas une photo d'un autre objet (voiture, animal, paysage, etc.) ?

Réponds UNIQUEMENT avec ce JSON (sans markdown, sans backticks):
{{"is_valid": true/false, "confidence": 0-100, "reason": "explication courte en français", "document_type_detected": "type détecté", "name_detected": "nom si lisible ou null", "warnings": ["liste d'avertissements si applicable"]}}"""
        
        user_message = UserMessage(text=prompt, file_contents=[image_content])
        response = await chat.send_message(user_message)
        
        # Parse JSON response
        import json as json_module
        response_text = response.strip()
        if response_text.startswith("```"):
            response_text = response_text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        
        result = json_module.loads(response_text)
        return result
    except Exception as e:
        logger.error(f"AI document verification failed: {e}")
        return {"is_valid": True, "confidence": 0, "reason": f"Vérification IA échouée: {str(e)[:100]}", "details": {}}

@api_router.post("/auth/upload-license-b64")
async def upload_license_b64(
    body: Base64Upload,
    user: dict = Depends(get_current_user)
):
    # Verify document with AI
    verification = await verify_document_with_ai(body.image_data, "license")
    
    if not verification.get("is_valid", True) and verification.get("confidence", 0) > 70:
        raise HTTPException(status_code=400, detail=f"Document rejeté: {verification.get('reason', 'Document invalide')}")
    
    await db.users.update_one(
        {"id": user['id']},
        {"$set": {
            "license_photo": body.image_data,
            "license_verification": {
                "is_valid": verification.get("is_valid", True),
                "confidence": verification.get("confidence", 0),
                "reason": verification.get("reason", ""),
                "verified_at": datetime.utcnow().isoformat(),
            }
        }}
    )
    return {
        "message": "License uploaded successfully",
        "license_photo": body.image_data,
        "verification": verification
    }

@api_router.post("/auth/upload-id-b64")
async def upload_id_b64(
    body: Base64Upload,
    user: dict = Depends(get_current_user)
):
    # Verify document with AI
    verification = await verify_document_with_ai(body.image_data, "id")
    
    if not verification.get("is_valid", True) and verification.get("confidence", 0) > 70:
        raise HTTPException(status_code=400, detail=f"Document rejeté: {verification.get('reason', 'Document invalide')}")
    
    await db.users.update_one(
        {"id": user['id']},
        {"$set": {
            "id_photo": body.image_data,
            "id_verification": {
                "is_valid": verification.get("is_valid", True),
                "confidence": verification.get("confidence", 0),
                "reason": verification.get("reason", ""),
                "verified_at": datetime.utcnow().isoformat(),
            }
        }}
    )
    return {
        "message": "ID uploaded successfully",
        "id_photo": body.image_data,
        "verification": verification
    }

@api_router.post("/auth/upload-id")
async def upload_id(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    """Upload ID card photo"""
    # Read and convert to base64
    content = await file.read()
    base64_image = base64.b64encode(content).decode('utf-8')
    
    # Determine content type
    content_type = file.content_type or 'image/jpeg'
    data_uri = f"data:{content_type};base64,{base64_image}"
    
    # Update user
    await db.users.update_one(
        {"id": user['id']},
        {"$set": {"id_photo": data_uri}}
    )
    
    return {"message": "ID uploaded successfully", "id_photo": data_uri}

# ==================== VEHICLE ROUTES ====================

@api_router.get("/vehicles", response_model=List[Vehicle])
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

# Admin routes for vehicles
@api_router.post("/admin/vehicles", response_model=Vehicle)
async def create_vehicle(vehicle_data: VehicleCreate, user: dict = Depends(get_agency_admin)):
    vehicle = Vehicle(**vehicle_data.dict())
    vehicle.agency_id = user.get('agency_id')
    await db.vehicles.insert_one(vehicle.dict())
    return vehicle

@api_router.post("/admin/vehicles/{vehicle_id}/photos")
async def upload_vehicle_photo(
    vehicle_id: str,
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    """Upload a photo for a vehicle"""
    vehicle = await db.vehicles.find_one({"id": vehicle_id})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    
    # Read and convert to base64
    content = await file.read()
    base64_image = base64.b64encode(content).decode('utf-8')
    
    # Determine content type
    content_type = file.content_type or 'image/jpeg'
    data_uri = f"data:{content_type};base64,{base64_image}"
    
    # Add photo to vehicle's photos array
    photos = vehicle.get('photos', [])
    photos.append(data_uri)
    
    await db.vehicles.update_one(
        {"id": vehicle_id},
        {"$set": {"photos": photos}}
    )
    
    return {"message": "Photo uploaded successfully", "photo": data_uri, "total_photos": len(photos)}

class Base64ImageUpload(BaseModel):
    image: str
    content_type: str = "image/jpeg"

@api_router.post("/admin/vehicles/{vehicle_id}/photos/base64")
async def upload_vehicle_photo_base64(
    vehicle_id: str,
    data: Base64ImageUpload,
    user: dict = Depends(get_current_user)
):
    """Upload a photo for a vehicle using base64 (for web compatibility)"""
    vehicle = await db.vehicles.find_one({"id": vehicle_id})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    
    # Create data URI
    data_uri = f"data:{data.content_type};base64,{data.image}"
    
    # Add photo to vehicle's photos array
    photos = vehicle.get('photos', [])
    photos.append(data_uri)
    
    await db.vehicles.update_one(
        {"id": vehicle_id},
        {"$set": {"photos": photos}}
    )
    
    return {"message": "Photo uploaded successfully", "photo": data_uri, "total_photos": len(photos)}

@api_router.delete("/admin/vehicles/{vehicle_id}/photos/{photo_index}")
async def delete_vehicle_photo(
    vehicle_id: str,
    photo_index: int,
    user: dict = Depends(get_current_user)
):
    """Delete a photo from a vehicle"""
    vehicle = await db.vehicles.find_one({"id": vehicle_id})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    
    photos = vehicle.get('photos', [])
    if photo_index < 0 or photo_index >= len(photos):
        raise HTTPException(status_code=400, detail="Invalid photo index")
    
    photos.pop(photo_index)
    
    await db.vehicles.update_one(
        {"id": vehicle_id},
        {"$set": {"photos": photos}}
    )
    
    return {"message": "Photo deleted successfully"}

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
        raise HTTPException(status_code=400, detail="Ce véhicule n'est pas disponible pour les dates sélectionnées. Veuillez consulter le calendrier de disponibilité et choisir d'autres dates.")
    
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
        agency_id=vehicle.get('agency_id'),
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

# ==================== NOTIFICATIONS ====================

NOTIFICATION_TYPES = {
    'reservation_confirmed': {'title_fr': 'Réservation confirmée', 'icon': 'checkmark-circle'},
    'reservation_cancelled': {'title_fr': 'Réservation annulée', 'icon': 'close-circle'},
    'reservation_active': {'title_fr': 'Réservation active', 'icon': 'car'},
    'reservation_completed': {'title_fr': 'Réservation terminée', 'icon': 'flag'},
    'payment_received': {'title_fr': 'Paiement reçu', 'icon': 'cash'},
    'new_reservation': {'title_fr': 'Nouvelle réservation', 'icon': 'calendar'},
    'payment_link_sent': {'title_fr': 'Lien de paiement envoyé', 'icon': 'link'},
}

async def create_notification(user_id: str, notif_type: str, message: str, reservation_id: str = None):
    """Create an in-app notification for a user"""
    meta = NOTIFICATION_TYPES.get(notif_type, {'title_fr': 'Notification', 'icon': 'notifications'})
    notif = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "reservation_id": reservation_id,
        "type": notif_type,
        "title": meta['title_fr'],
        "message": message,
        "icon": meta.get('icon', 'notifications'),
        "read": False,
        "created_at": datetime.utcnow(),
    }
    await db.notifications.insert_one(notif)
    return notif

async def notify_admins_of_agency(agency_id: str, notif_type: str, message: str, reservation_id: str = None):
    """Notify all admins of a specific agency"""
    admins = await db.users.find({"agency_id": agency_id, "role": "admin"}).to_list(50)
    for admin in admins:
        await create_notification(admin['id'], notif_type, message, reservation_id)

@api_router.get("/notifications")
async def get_notifications(limit: int = 50, user: dict = Depends(get_current_user)):
    """Get notifications for the current user"""
    notifs = await db.notifications.find(
        {"user_id": user['id']}, {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    return {"notifications": notifs}

@api_router.get("/notifications/unread-count")
async def get_unread_count(user: dict = Depends(get_current_user)):
    """Get unread notification count"""
    count = await db.notifications.count_documents({"user_id": user['id'], "read": False})
    return {"count": count}

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, user: dict = Depends(get_current_user)):
    """Mark a single notification as read"""
    await db.notifications.update_one(
        {"id": notification_id, "user_id": user['id']},
        {"$set": {"read": True}}
    )
    return {"message": "Notification marquée comme lue"}

@api_router.put("/notifications/read-all")
async def mark_all_notifications_read(user: dict = Depends(get_current_user)):
    """Mark all notifications as read"""
    await db.notifications.update_many(
        {"user_id": user['id'], "read": False},
        {"$set": {"read": True}}
    )
    return {"message": "Toutes les notifications marquées comme lues"}

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
    
    # Determine payment methods based on type
    payment_methods = ['card']
    if checkout_data.payment_method_type == 'twint':
        payment_methods = ['twint']
    
    checkout_request = CheckoutSessionRequest(
        amount=float(reservation['total_price']),
        currency="chf",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata,
        payment_methods=payment_methods
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

def generate_cash_reservation_email(user_name: str, vehicle: dict, reservation: dict) -> str:
    """Generate HTML email for cash payment reservation"""
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
            <div style="background-color: #F59E0B; padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
                <h1 style="color: #FFFFFF; margin: 0; font-size: 28px;">🚗 RentDrive</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Réservation en attente - Paiement en espèces</p>
            </div>
            
            <div style="background-color: #FFFFFF; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <h2 style="color: #F59E0B; margin-top: 0;">Bonjour {user_name}!</h2>
                <p>Votre réservation a été enregistrée avec paiement en espèces. Voici les détails:</p>
                
                <div style="background-color: #FEF3C7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #F59E0B;">
                    <p style="margin: 0; color: #92400E;"><strong>⚠️ Important:</strong> Le paiement sera effectué lors de la prise du véhicule. Veuillez prévoir le montant exact en espèces.</p>
                </div>
                
                <div style="background-color: #F8FAFC; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #1E3A8A;">{vehicle['brand']} {vehicle['model']} ({vehicle['year']})</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; color: #64748B;">Date de prise:</td>
                            <td style="padding: 8px 0; font-weight: bold;">{start_date.strftime('%d %B %Y')}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #64748B;">Date de retour:</td>
                            <td style="padding: 8px 0; font-weight: bold;">{end_date.strftime('%d %B %Y')}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #64748B;">Durée:</td>
                            <td style="padding: 8px 0; font-weight: bold;">{reservation['total_days']} jours</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #64748B;">Lieu:</td>
                            <td style="padding: 8px 0; font-weight: bold;">{vehicle['location']}</td>
                        </tr>
                    </table>
                </div>
                
                <div style="background-color: #F59E0B; color: #FFFFFF; padding: 15px 20px; border-radius: 8px; text-align: center;">
                    <span style="font-size: 14px;">Montant à payer en espèces:</span>
                    <span style="font-size: 24px; font-weight: bold; margin-left: 10px;">CHF {reservation['total_price']:.2f}</span>
                </div>
                
                <p style="margin-top: 20px; color: #64748B; font-size: 14px;">
                    N'oubliez pas d'apporter votre permis de conduire valide lors de la prise du véhicule.
                    Pour toute question, contactez-nous à {SENDER_EMAIL}.
                </p>
                
                <p style="margin-top: 30px;">
                    Bonne route!<br>
                    <strong>L'équipe RentDrive</strong>
                </p>
            </div>
            
            <div style="text-align: center; padding: 20px; color: #64748B; font-size: 12px;">
                <p>© 2024 RentDrive. Tous droits réservés.</p>
                <p>LogiTrak Suisse</p>
            </div>
        </div>
    </body>
    </html>
    '''

def generate_status_change_email(user_name: str, vehicle_name: str, status: str, reservation: dict) -> str:
    """Generate HTML email for reservation status change"""
    start_date = reservation.get('start_date', '')
    end_date = reservation.get('end_date', '')
    if isinstance(start_date, datetime):
        start_date = start_date.strftime('%d/%m/%Y')
    elif isinstance(start_date, str):
        try:
            start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00')).strftime('%d/%m/%Y')
        except Exception:
            pass
    if isinstance(end_date, datetime):
        end_date = end_date.strftime('%d/%m/%Y')
    elif isinstance(end_date, str):
        try:
            end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00')).strftime('%d/%m/%Y')
        except Exception:
            pass

    status_info = {
        'confirmed': {'title': 'Réservation Confirmée', 'color': '#10B981', 'icon': 'checkmark', 'msg': f'Votre réservation pour <strong>{vehicle_name}</strong> a été confirmée.'},
        'active': {'title': 'Location En Cours', 'color': '#7C3AED', 'icon': 'car', 'msg': f'Votre location de <strong>{vehicle_name}</strong> est maintenant active. Bon trajet !'},
        'completed': {'title': 'Location Terminée', 'color': '#6B7280', 'icon': 'flag', 'msg': f'Votre location de <strong>{vehicle_name}</strong> est terminée. Merci de votre confiance !'},
        'cancelled': {'title': 'Réservation Annulée', 'color': '#EF4444', 'icon': 'close', 'msg': f'Votre réservation pour <strong>{vehicle_name}</strong> a été annulée.'},
    }
    info = status_info.get(status, {'title': 'Mise à jour', 'color': '#6B7280', 'icon': 'info', 'msg': f'Le statut de votre réservation a été mis à jour.'})

    return f'''<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:Arial,sans-serif;line-height:1.6;color:#1E293B;margin:0;padding:0;background-color:#F8FAFC;">
<div style="max-width:600px;margin:0 auto;padding:20px;">
  <div style="background-color:#1A1A2E;padding:30px;text-align:center;border-radius:12px 12px 0 0;">
    <h1 style="color:#FFFFFF;margin:0;font-size:24px;">LogiRent</h1>
    <p style="color:rgba(255,255,255,0.7);margin:8px 0 0;">Mise à jour de votre réservation</p>
  </div>
  <div style="background-color:#FFFFFF;padding:30px;border-radius:0 0 12px 12px;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
    <div style="text-align:center;padding:16px;background-color:{info["color"]}15;border-radius:8px;margin-bottom:20px;">
      <h2 style="color:{info["color"]};margin:0;font-size:20px;">{info["title"]}</h2>
    </div>
    <p>Bonjour <strong>{user_name}</strong>,</p>
    <p>{info["msg"]}</p>
    <div style="background-color:#F8FAFC;padding:16px;border-radius:8px;margin:20px 0;">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:6px 0;color:#64748B;">Véhicule:</td><td style="padding:6px 0;font-weight:bold;">{vehicle_name}</td></tr>
        <tr><td style="padding:6px 0;color:#64748B;">Du:</td><td style="padding:6px 0;font-weight:bold;">{start_date}</td></tr>
        <tr><td style="padding:6px 0;color:#64748B;">Au:</td><td style="padding:6px 0;font-weight:bold;">{end_date}</td></tr>
        <tr><td style="padding:6px 0;color:#64748B;">Montant:</td><td style="padding:6px 0;font-weight:bold;">CHF {reservation.get("total_price", 0):.2f}</td></tr>
      </table>
    </div>
    <p style="color:#64748B;font-size:13px;">Pour toute question, contactez-nous à {SENDER_EMAIL}.</p>
    <p style="margin-top:24px;">Cordialement,<br><strong>L'équipe LogiRent</strong></p>
  </div>
  <div style="text-align:center;padding:16px;color:#64748B;font-size:11px;">LogiRent - Location de véhicules</div>
</div></body></html>'''

async def send_cash_reservation_email(user: dict, vehicle: dict, reservation: dict):
    """Send cash reservation email"""
    html = generate_cash_reservation_email(user['name'], vehicle, reservation)
    await send_email(
        user['email'],
        f"Réservation en attente - {vehicle['brand']} {vehicle['model']} (Paiement espèces)",
        html
    )

# ==================== ADMIN ROUTES ====================

class AdminStats(BaseModel):
    total_vehicles: int
    total_users: int
    total_reservations: int
    total_payments: int
    total_revenue: float
    reservations_by_status: Dict[str, int]
    top_vehicles: List[Dict[str, Any]]
    revenue_by_month: List[Dict[str, Any]]

# Admin user check - redirect to role-based check
async def get_admin_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Check if user is admin (agency admin or super admin)"""
    return await get_agency_admin(credentials)

@api_router.get("/admin/stats", response_model=AdminStats)
async def get_admin_stats(user: dict = Depends(get_admin_user)):
    """Get dashboard statistics - scoped by agency for admins"""
    agency_id = user.get('agency_id')
    is_super = user.get('role') == 'super_admin'
    
    vf = {} if is_super else {"agency_id": agency_id}
    rf = {} if is_super else {"agency_id": agency_id}
    
    total_vehicles = await db.vehicles.count_documents(vf)
    total_reservations = await db.reservations.count_documents(rf)
    
    if is_super:
        total_users = await db.users.count_documents({})
        total_payments = await db.payment_transactions.count_documents({"payment_status": "paid"})
    else:
        user_ids = await db.reservations.distinct("user_id", rf)
        total_users = len(user_ids)
        total_payments = await db.reservations.count_documents({**rf, "payment_status": "paid"})
    
    revenue_match = {"payment_status": "paid"}
    if not is_super:
        revenue_match["agency_id"] = agency_id
    pipeline = [{"$match": revenue_match}, {"$group": {"_id": None, "total": {"$sum": "$total_price"}}}]
    revenue_result = await db.reservations.aggregate(pipeline).to_list(1)
    total_revenue = revenue_result[0]["total"] if revenue_result else 0
    
    status_pipeline = [{"$match": rf}, {"$group": {"_id": "$status", "count": {"$sum": 1}}}]
    status_result = await db.reservations.aggregate(status_pipeline).to_list(10)
    reservations_by_status = {item["_id"]: item["count"] for item in status_result}
    
    top_pipeline = [{"$match": rf}, {"$group": {"_id": "$vehicle_id", "rental_count": {"$sum": 1}}}, {"$sort": {"rental_count": -1}}, {"$limit": 5}]
    top_result = await db.reservations.aggregate(top_pipeline).to_list(5)
    top_vehicles = []
    for item in top_result:
        vehicle = await db.vehicles.find_one({"id": item["_id"]})
        if vehicle:
            top_vehicles.append({"id": vehicle["id"], "name": f"{vehicle['brand']} {vehicle['model']}", "rental_count": item["rental_count"]})
    
    six_months_ago = datetime.utcnow() - timedelta(days=180)
    monthly_match = {"payment_status": "paid", "created_at": {"$gte": six_months_ago}}
    if not is_super:
        monthly_match["agency_id"] = agency_id
    monthly_pipeline = [{"$match": monthly_match}, {"$group": {"_id": {"year": {"$year": "$created_at"}, "month": {"$month": "$created_at"}}, "revenue": {"$sum": "$total_price"}, "count": {"$sum": 1}}}, {"$sort": {"_id.year": 1, "_id.month": 1}}]
    monthly_result = await db.reservations.aggregate(monthly_pipeline).to_list(12)
    revenue_by_month = [{"month": datetime(item["_id"]["year"], item["_id"]["month"], 1).strftime("%b %Y"), "revenue": item["revenue"], "reservations": item["count"]} for item in monthly_result]
    
    return AdminStats(
        total_vehicles=total_vehicles,
        total_users=total_users,
        total_reservations=total_reservations,
        total_payments=total_payments,
        total_revenue=total_revenue,
        reservations_by_status=reservations_by_status,
        top_vehicles=top_vehicles,
        revenue_by_month=revenue_by_month
    )

@api_router.get("/admin/stats/advanced")
async def get_advanced_stats(user: dict = Depends(get_admin_user)):
    """Get advanced dashboard statistics"""
    agency_id = user.get('agency_id')
    is_super = user.get('role') == 'super_admin'
    rf = {} if is_super else {"agency_id": agency_id}
    vf = {} if is_super else {"agency_id": agency_id}

    now = datetime.utcnow()
    thirty_days_ago = now - timedelta(days=30)
    sixty_days_ago = now - timedelta(days=60)

    # Revenue this month vs last month
    this_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    last_month_start = (this_month_start - timedelta(days=1)).replace(day=1)

    rev_this_month_pipe = [{"$match": {**rf, "payment_status": "paid", "created_at": {"$gte": this_month_start}}}, {"$group": {"_id": None, "total": {"$sum": "$total_price"}, "count": {"$sum": 1}}}]
    rev_last_month_pipe = [{"$match": {**rf, "payment_status": "paid", "created_at": {"$gte": last_month_start, "$lt": this_month_start}}}, {"$group": {"_id": None, "total": {"$sum": "$total_price"}, "count": {"$sum": 1}}}]

    rev_this = await db.reservations.aggregate(rev_this_month_pipe).to_list(1)
    rev_last = await db.reservations.aggregate(rev_last_month_pipe).to_list(1)
    revenue_this_month = rev_this[0]["total"] if rev_this else 0
    revenue_last_month = rev_last[0]["total"] if rev_last else 0
    reservations_this_month = rev_this[0]["count"] if rev_this else 0
    reservations_last_month = rev_last[0]["count"] if rev_last else 0

    # Average booking duration
    avg_dur_pipe = [{"$match": {**rf, "status": {"$in": ["confirmed", "active", "completed"]}}}, {"$group": {"_id": None, "avg_days": {"$avg": "$total_days"}}}]
    avg_dur_res = await db.reservations.aggregate(avg_dur_pipe).to_list(1)
    avg_booking_duration = round(avg_dur_res[0]["avg_days"], 1) if avg_dur_res else 0

    # Average revenue per reservation
    avg_rev_pipe = [{"$match": {**rf, "payment_status": "paid"}}, {"$group": {"_id": None, "avg_rev": {"$avg": "$total_price"}}}]
    avg_rev_res = await db.reservations.aggregate(avg_rev_pipe).to_list(1)
    avg_revenue_per_reservation = round(avg_rev_res[0]["avg_rev"], 2) if avg_rev_res else 0

    # Vehicle utilization: for each vehicle, count active/confirmed/completed days in last 30 days
    vehicles = await db.vehicles.find(vf, {"_id": 0, "id": 1, "brand": 1, "model": 1}).to_list(200)
    vehicle_utilization = []
    for v in vehicles[:20]:
        res_list = await db.reservations.find({
            "vehicle_id": v["id"],
            "status": {"$in": ["confirmed", "active", "completed"]},
            "start_date": {"$lte": now},
            "end_date": {"$gte": thirty_days_ago}
        }, {"_id": 0, "start_date": 1, "end_date": 1}).to_list(100)
        booked_days = 0
        for r in res_list:
            s = max(r["start_date"], thirty_days_ago) if isinstance(r["start_date"], datetime) else thirty_days_ago
            e = min(r["end_date"], now) if isinstance(r["end_date"], datetime) else now
            booked_days += max(0, (e - s).days)
        rate = min(100, round((booked_days / 30) * 100))
        vehicle_utilization.append({"id": v["id"], "name": f"{v['brand']} {v['model']}", "utilization": rate, "booked_days": booked_days})
    vehicle_utilization.sort(key=lambda x: x["utilization"], reverse=True)

    # Revenue per vehicle (top 10)
    rev_per_vehicle_pipe = [{"$match": {**rf, "payment_status": "paid"}}, {"$group": {"_id": "$vehicle_id", "revenue": {"$sum": "$total_price"}, "count": {"$sum": 1}}}, {"$sort": {"revenue": -1}}, {"$limit": 10}]
    rev_per_vehicle_result = await db.reservations.aggregate(rev_per_vehicle_pipe).to_list(10)
    revenue_per_vehicle = []
    for item in rev_per_vehicle_result:
        veh = await db.vehicles.find_one({"id": item["_id"]})
        if veh:
            revenue_per_vehicle.append({"id": veh["id"], "name": f"{veh['brand']} {veh['model']}", "revenue": item["revenue"], "bookings": item["count"]})

    # Daily revenue for last 30 days
    daily_pipe = [
        {"$match": {**rf, "payment_status": "paid", "created_at": {"$gte": thirty_days_ago}}},
        {"$group": {"_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}}, "revenue": {"$sum": "$total_price"}, "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}}
    ]
    daily_result = await db.reservations.aggregate(daily_pipe).to_list(31)
    daily_revenue = [{"date": item["_id"], "revenue": item["revenue"], "bookings": item["count"]} for item in daily_result]

    # New clients last 30 days
    new_clients_30d = await db.users.count_documents({"role": "client", "created_at": {"$gte": thirty_days_ago}}) if is_super else 0
    if not is_super:
        new_user_ids = await db.reservations.distinct("user_id", {**rf, "created_at": {"$gte": thirty_days_ago}})
        new_clients_30d = len(new_user_ids)

    # Payment method breakdown
    payment_method_pipe = [{"$match": {**rf, "payment_status": "paid"}}, {"$group": {"_id": {"$ifNull": ["$payment_method", "card"]}, "count": {"$sum": 1}, "total": {"$sum": "$total_price"}}}]
    pm_result = await db.reservations.aggregate(payment_method_pipe).to_list(10)
    payment_methods = [{"method": item["_id"] or "card", "count": item["count"], "total": item["total"]} for item in pm_result]

    # Cancellation rate
    total_res = await db.reservations.count_documents(rf) or 1
    cancelled_res = await db.reservations.count_documents({**rf, "status": "cancelled"})
    cancellation_rate = round((cancelled_res / total_res) * 100, 1)

    # Weekly trend (last 8 weeks)
    eight_weeks_ago = now - timedelta(weeks=8)
    weekly_pipe = [
        {"$match": {**rf, "created_at": {"$gte": eight_weeks_ago}}},
        {"$group": {"_id": {"$isoWeek": "$created_at"}, "count": {"$sum": 1}, "revenue": {"$sum": {"$cond": [{"$eq": ["$payment_status", "paid"]}, "$total_price", 0]}}}},
        {"$sort": {"_id": 1}}
    ]
    weekly_result = await db.reservations.aggregate(weekly_pipe).to_list(8)
    weekly_trends = [{"week": item["_id"], "bookings": item["count"], "revenue": item["revenue"]} for item in weekly_result]

    return {
        "revenue_this_month": revenue_this_month,
        "revenue_last_month": revenue_last_month,
        "revenue_change_pct": round(((revenue_this_month - revenue_last_month) / revenue_last_month * 100) if revenue_last_month > 0 else 0, 1),
        "reservations_this_month": reservations_this_month,
        "reservations_last_month": reservations_last_month,
        "avg_booking_duration": avg_booking_duration,
        "avg_revenue_per_reservation": avg_revenue_per_reservation,
        "vehicle_utilization": vehicle_utilization,
        "revenue_per_vehicle": revenue_per_vehicle,
        "daily_revenue": daily_revenue,
        "new_clients_30d": new_clients_30d,
        "payment_methods": payment_methods,
        "cancellation_rate": cancellation_rate,
        "weekly_trends": weekly_trends,
    }

@api_router.get("/admin/users")
async def get_admin_users(
    skip: int = 0,
    limit: int = 20,
    user: dict = Depends(get_admin_user)
):
    """Get users - for agency admin, only users who have reservations with their agency"""
    agency_id = user.get('agency_id')
    is_super = user.get('role') == 'super_admin'
    
    if is_super:
        users = await db.users.find({}, {"password_hash": 0}).skip(skip).limit(limit).to_list(limit)
        total = await db.users.count_documents({})
    else:
        # Get users: those with reservations at this agency OR those directly assigned to this agency
        user_ids_from_reservations = await db.reservations.distinct("user_id", {"agency_id": agency_id})
        query = {"$or": [
            {"id": {"$in": user_ids_from_reservations}},
            {"agency_id": agency_id, "role": "client"}
        ]}
        users = await db.users.find(query, {"password_hash": 0}).skip(skip).limit(limit).to_list(limit)
        total = await db.users.count_documents(query)
    
    for u in users:
        u['reservation_count'] = await db.reservations.count_documents(
            {"user_id": u['id']} if is_super else {"user_id": u['id'], "agency_id": agency_id}
        )
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

@api_router.put("/admin/users/{user_id}")
async def update_user_admin(
    user_id: str,
    update_data: AdminUserUpdate,
    user: dict = Depends(get_admin_user)
):
    """Update user details from admin"""
    target_user = await db.users.find_one({"id": user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
    
    if update_dict:
        await db.users.update_one(
            {"id": user_id},
            {"$set": update_dict}
        )
    
    updated_user = await db.users.find_one({"id": user_id}, {"password_hash": 0})
    updated_user['_id'] = str(updated_user['_id'])
    return {"message": "User updated successfully", "user": updated_user}

@api_router.put("/admin/users/{user_id}/rating")
async def update_user_rating(
    user_id: str,
    rating: str,
    user: dict = Depends(get_admin_user)
):
    """Update user client rating"""
    valid_ratings = ["good", "bad", "neutral", "vip", "blocked"]
    if rating not in valid_ratings:
        raise HTTPException(status_code=400, detail=f"Invalid rating. Must be one of: {valid_ratings}")
    
    target_user = await db.users.find_one({"id": user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"client_rating": rating}}
    )
    
    return {"message": f"User rating updated to {rating}"}

class Base64UserPhoto(BaseModel):
    image: str
    content_type: str = "image/jpeg"

@api_router.post("/admin/users/{user_id}/photo")
async def upload_user_photo_admin(
    user_id: str,
    data: Base64UserPhoto,
    user: dict = Depends(get_admin_user)
):
    """Upload a profile photo for a user from admin"""
    target_user = await db.users.find_one({"id": user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Create data URI
    data_uri = f"data:{data.content_type};base64,{data.image}"
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"profile_photo": data_uri}}
    )
    
    return {"message": "Photo uploaded successfully", "photo": data_uri}

@api_router.post("/admin/users/{user_id}/id-photo")
async def upload_user_id_photo_admin(
    user_id: str,
    data: Base64UserPhoto,
    user: dict = Depends(get_admin_user)
):
    """Upload ID photo for a user from admin"""
    target_user = await db.users.find_one({"id": user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    data_uri = f"data:{data.content_type};base64,{data.image}"
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"id_photo": data_uri}}
    )
    
    return {"message": "ID photo uploaded successfully", "photo": data_uri}

@api_router.post("/admin/users/{user_id}/license-photo")
async def upload_user_license_photo_admin(
    user_id: str,
    data: Base64UserPhoto,
    user: dict = Depends(get_admin_user)
):
    """Upload license photo for a user from admin"""
    target_user = await db.users.find_one({"id": user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    data_uri = f"data:{data.content_type};base64,{data.image}"
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"license_photo": data_uri}}
    )
    
    return {"message": "License photo uploaded successfully", "photo": data_uri}

@api_router.get("/admin/users/{user_id}")
async def get_user_details_admin(
    user_id: str,
    user: dict = Depends(get_admin_user)
):
    """Get detailed user info for admin"""
    target_user = await db.users.find_one({"id": user_id}, {"password_hash": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get user's reservations
    reservations = await db.reservations.find({"user_id": user_id}).to_list(100)
    
    # Calculate stats
    total_spent = sum(r.get('total_price', 0) for r in reservations if r.get('payment_status') == 'paid')
    total_reservations = len(reservations)
    
    target_user['_id'] = str(target_user['_id'])
    target_user['total_spent'] = total_spent
    target_user['total_reservations'] = total_reservations
    target_user['reservations'] = reservations
    
    return target_user


@api_router.post("/admin/import-users")
async def import_users_from_excel(
    file: UploadFile = File(...),
    user: dict = Depends(get_admin_user)
):
    """Import clients from an Excel (.xlsx), CSV, or ZIP (Excel + photos) file"""
    import io
    import zipfile
    
    filename = file.filename or ""
    content = await file.read()
    
    photos_map = {}  # filename -> base64 data URI
    excel_content = None
    excel_filename = ""
    
    # Handle ZIP files containing Excel + photos
    if filename.endswith(".zip"):
        try:
            zf = zipfile.ZipFile(io.BytesIO(content))
        except zipfile.BadZipFile:
            raise HTTPException(status_code=400, detail="Fichier ZIP invalide")
        
        for name in zf.namelist():
            if name.startswith("__MACOSX") or name.startswith("."):
                continue
            lower = name.lower()
            basename = name.split("/")[-1]
            if not basename:
                continue
            if lower.endswith((".xlsx", ".xls", ".csv")):
                excel_content = zf.read(name)
                excel_filename = basename
            elif lower.endswith((".jpg", ".jpeg", ".png", ".webp")):
                photo_data = zf.read(name)
                ext = lower.rsplit(".", 1)[-1]
                mime = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp"}[ext]
                b64 = base64.b64encode(photo_data).decode("utf-8")
                data_uri = f"data:{mime};base64,{b64}"
                # Store by filename without extension and full basename for matching
                photos_map[basename.lower()] = data_uri
                photos_map[basename.rsplit(".", 1)[0].lower()] = data_uri
        
        if not excel_content:
            raise HTTPException(status_code=400, detail="Aucun fichier Excel/CSV trouvé dans le ZIP")
        content = excel_content
        filename = excel_filename
    
    rows = []
    if filename.endswith(".csv"):
        import csv
        text = content.decode("utf-8-sig")
        reader = csv.DictReader(io.StringIO(text), delimiter=";")
        first_row = next(csv.DictReader(io.StringIO(text), delimiter=";"), None)
        if first_row and len(first_row) <= 1:
            reader = csv.DictReader(io.StringIO(text), delimiter=",")
        else:
            reader = csv.DictReader(io.StringIO(text), delimiter=";")
        for row in reader:
            rows.append(row)
    elif filename.endswith(".xlsx") or filename.endswith(".xls"):
        import openpyxl
        wb = openpyxl.load_workbook(io.BytesIO(content))
        ws = wb.active
        headers = [str(cell.value or "").strip().lower() for cell in ws[1]]
        for row in ws.iter_rows(min_row=2, values_only=True):
            row_dict = {}
            for i, val in enumerate(row):
                if i < len(headers):
                    row_dict[headers[i]] = str(val).strip() if val is not None else ""
            rows.append(row_dict)
    else:
        raise HTTPException(status_code=400, detail="Format non supporté. Utilisez .xlsx, .csv ou .zip")
    
    if not rows:
        raise HTTPException(status_code=400, detail="Le fichier est vide")
    
    def find_col(row, candidates):
        for c in candidates:
            for key in row.keys():
                if c in key.lower():
                    return row[key]
        return ""
    
    agency_id = user.get("agency_id")
    default_password = hash_password("LogiRent2024")
    
    created = 0
    skipped = 0
    photos_matched = 0
    errors = []
    
    for i, row in enumerate(rows):
        name = find_col(row, ["nom", "name", "prenom", "prénom", "client"])
        email = find_col(row, ["email", "mail", "e-mail", "courriel"])
        phone = find_col(row, ["tel", "téléphone", "telephone", "phone", "mobile", "portable"])
        address = find_col(row, ["adresse", "address", "ville", "city"])
        photo_ref = find_col(row, ["photo", "image", "avatar", "picture", "profil"])
        
        prenom = find_col(row, ["prenom", "prénom", "firstname", "first_name"])
        nom = find_col(row, ["nom", "lastname", "last_name", "family"])
        if prenom and nom and not name:
            name = f"{prenom} {nom}"
        elif nom and not name:
            name = nom
        
        if not email:
            errors.append(f"Ligne {i+2}: email manquant")
            continue
        
        email = email.lower().strip()
        
        existing = await db.users.find_one({"email": email})
        if existing:
            skipped += 1
            continue
        
        # Match photo from ZIP
        profile_photo = None
        if photo_ref and photos_map:
            ref_lower = photo_ref.lower().strip()
            profile_photo = photos_map.get(ref_lower) or photos_map.get(ref_lower.rsplit(".", 1)[0])
        if not profile_photo and photos_map:
            # Try matching by name or email
            name_key = (name or "").lower().replace(" ", "_").replace(" ", "")
            email_key = email.split("@")[0].lower()
            for key in [name_key, email_key]:
                if key and key in photos_map:
                    profile_photo = photos_map[key]
                    break
        if profile_photo:
            photos_matched += 1
        
        new_user = {
            "id": str(uuid.uuid4()),
            "email": email,
            "password_hash": default_password,
            "name": name or email.split("@")[0],
            "phone": phone or None,
            "address": address or None,
            "id_photo": None,
            "license_photo": None,
            "profile_photo": profile_photo,
            "role": "client",
            "agency_id": agency_id,
            "created_at": datetime.utcnow(),
        }
        await db.users.insert_one(new_user)
        created += 1
    
    return {
        "message": f"Import terminé: {created} créés, {skipped} existants, {photos_matched} photos, {len(errors)} erreurs",
        "created": created,
        "skipped": skipped,
        "photos_matched": photos_matched,
        "errors": errors[:20],
    }


@api_router.get("/admin/reservations")
async def get_admin_reservations(
    skip: int = 0,
    limit: int = 20,
    status: Optional[str] = None,
    user: dict = Depends(get_admin_user)
):
    """Get reservations - scoped by agency"""
    agency_id = user.get('agency_id')
    is_super = user.get('role') == 'super_admin'
    
    query = {} if is_super else {"agency_id": agency_id}
    if status:
        query["status"] = status
    
    reservations = await db.reservations.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.reservations.count_documents(query)
    
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
    valid_statuses = ["pending", "pending_cash", "confirmed", "active", "completed", "cancelled"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    result = await db.reservations.update_one(
        {"id": reservation_id},
        {"$set": {"status": status, "updated_at": datetime.utcnow()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Reservation not found")
    
    # Create notifications
    reservation = await db.reservations.find_one({"id": reservation_id})
    if reservation:
        client = await db.users.find_one({"id": reservation.get('user_id')})
        vehicle = await db.vehicles.find_one({"id": reservation.get('vehicle_id')})
        vname = f"{vehicle['brand']} {vehicle['model']}" if vehicle else "Véhicule"
        cname = client.get('name', 'Client') if client else 'Client'
        
        status_msgs = {
            'confirmed': f"Votre réservation pour {vname} a été confirmée.",
            'active': f"Votre réservation pour {vname} est maintenant active. Bon trajet !",
            'completed': f"Votre location de {vname} est terminée. Merci !",
            'cancelled': f"Votre réservation pour {vname} a été annulée.",
        }
        notif_types = {
            'confirmed': 'reservation_confirmed',
            'active': 'reservation_active',
            'completed': 'reservation_completed',
            'cancelled': 'reservation_cancelled',
        }
        if status in status_msgs and client:
            await create_notification(client['id'], notif_types[status], status_msgs[status], reservation_id)
            # Send email notification for status change
            try:
                email_html = generate_status_change_email(
                    cname, vname, status, reservation
                )
                email_subjects = {
                    'confirmed': f"Réservation confirmée - {vname}",
                    'active': f"Location en cours - {vname}",
                    'completed': f"Location terminée - {vname}",
                    'cancelled': f"Réservation annulée - {vname}",
                }
                await send_email(client['email'], email_subjects.get(status, f"Mise à jour réservation - {vname}"), email_html)
            except Exception as e:
                logger.error(f"Failed to send status change email: {e}")
    
    return {"message": f"Reservation status updated to {status}"}

@api_router.put("/admin/reservations/{reservation_id}/payment-status")
async def update_payment_status(
    reservation_id: str,
    payment_status: str,
    user: dict = Depends(get_admin_user)
):
    """Update payment status - useful for cash payments"""
    valid_statuses = ["unpaid", "pending", "paid", "refunded"]
    if payment_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid payment status. Must be one of: {valid_statuses}")
    
    reservation = await db.reservations.find_one({"id": reservation_id})
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    
    update_data = {
        "payment_status": payment_status,
        "updated_at": datetime.utcnow()
    }
    
    # If marking as paid, also update reservation status to confirmed if it was pending_cash
    if payment_status == "paid" and reservation.get('status') in ['pending_cash', 'pending']:
        update_data["status"] = "confirmed"
    
    await db.reservations.update_one(
        {"id": reservation_id},
        {"$set": update_data}
    )
    
    # Create or update payment transaction when status changes to paid
    if payment_status == "paid":
        # Check if transaction exists
        existing_tx = await db.payment_transactions.find_one({"reservation_id": reservation_id})
        
        if existing_tx:
            # Update existing transaction
            await db.payment_transactions.update_one(
                {"reservation_id": reservation_id},
                {"$set": {
                    "status": "paid",
                    "payment_status": "paid",
                    "updated_at": datetime.utcnow()
                }}
            )
        else:
            # Create new transaction for cash payment
            new_transaction = PaymentTransaction(
                user_id=reservation['user_id'],
                reservation_id=reservation_id,
                session_id=f"cash_{reservation_id}",
                amount=float(reservation['total_price']),
                currency="chf",
                status="paid",
                payment_status="paid",
                metadata={"payment_method": reservation.get('payment_method', 'cash'), "admin_confirmed": True}
            )
            await db.payment_transactions.insert_one(new_transaction.dict())
        
        # Send confirmation email
        try:
            res_user = await db.users.find_one({"id": reservation['user_id']})
            vehicle = await db.vehicles.find_one({"id": reservation['vehicle_id']})
            if res_user and vehicle:
                await send_reservation_confirmation(res_user, vehicle, reservation)
        except Exception as email_error:
            logger.error(f"Failed to send confirmation email: {email_error}")
    
    return {"message": f"Payment status updated to {payment_status}"}

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

@api_router.get("/admin/calendar")
async def get_admin_calendar(
    month: int = None,
    year: int = None,
    user: dict = Depends(get_admin_user)
):
    """Get reservations for calendar - scoped by agency"""
    agency_id = user.get('agency_id')
    is_super = user.get('role') == 'super_admin'
    
    now = datetime.utcnow()
    if month is None:
        month = now.month
    if year is None:
        year = now.year
    
    start_of_month = datetime(year, month, 1)
    if month == 12:
        end_of_month = datetime(year + 1, 1, 1)
    else:
        end_of_month = datetime(year, month + 1, 1)
    
    cal_query = {
        "status": {"$in": ["pending", "pending_cash", "confirmed", "active", "completed"]},
        "start_date": {"$lt": end_of_month},
        "end_date": {"$gt": start_of_month}
    }
    if not is_super:
        cal_query["agency_id"] = agency_id
    
    reservations = await db.reservations.find(cal_query).to_list(500)
    
    events = []
    for res in reservations:
        res_user = await db.users.find_one({"id": res['user_id']})
        vehicle = await db.vehicles.find_one({"id": res['vehicle_id']})
        
        user_name = res_user['name'] if res_user else 'Inconnu'
        vehicle_name = f"{vehicle['brand']} {vehicle['model']}" if vehicle else 'Inconnu'
        
        start_date = res['start_date']
        end_date = res['end_date']
        
        # Check if overdue
        is_overdue = res['status'] == 'active' and end_date < now
        
        events.append({
            "id": res['id'],
            "user_name": user_name,
            "user_email": res_user['email'] if res_user else '',
            "user_phone": res_user.get('phone', '') if res_user else '',
            "vehicle_name": vehicle_name,
            "vehicle_id": res.get('vehicle_id', ''),
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "total_days": res.get('total_days', 0),
            "total_price": res.get('total_price', 0),
            "status": res['status'],
            "payment_status": res.get('payment_status', 'unpaid'),
            "payment_method": res.get('payment_method', 'card'),
            "is_overdue": is_overdue,
            "days_overdue": (now - end_date).days if is_overdue else 0
        })
    
    return {"events": events, "month": month, "year": year}

@api_router.get("/admin/overdue")
async def get_overdue_reservations(user: dict = Depends(get_admin_user)):
    """Get all overdue reservations (active but past end_date)"""
    now = datetime.utcnow()
    
    overdue_reservations = await db.reservations.find({
        "status": "active",
        "end_date": {"$lt": now}
    }).sort("end_date", 1).to_list(100)
    
    results = []
    for res in overdue_reservations:
        res_user = await db.users.find_one({"id": res['user_id']})
        vehicle = await db.vehicles.find_one({"id": res['vehicle_id']})
        
        days_overdue = (now - res['end_date']).days
        
        results.append({
            "id": res['id'],
            "user_name": res_user['name'] if res_user else 'Inconnu',
            "user_email": res_user['email'] if res_user else '',
            "user_phone": res_user.get('phone', '') if res_user else '',
            "vehicle_name": f"{vehicle['brand']} {vehicle['model']}" if vehicle else 'Inconnu',
            "start_date": res['start_date'].isoformat(),
            "end_date": res['end_date'].isoformat(),
            "total_days": res.get('total_days', 0),
            "total_price": res.get('total_price', 0),
            "days_overdue": days_overdue,
            "status": res['status'],
            "payment_status": res.get('payment_status', 'unpaid'),
        })
    
    return {"overdue": results, "total": len(results)}

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

# ==================== NOTIFICATIONS (duplicate removed, primary at line ~1008) ====================

# ==================== BACKGROUND CRON: OVERDUE CHECK ====================

async def _check_overdue_task():
    """Internal function to check overdue reservations and notify users"""
    now = datetime.utcnow()
    overdue_reservations = await db.reservations.find({
        "status": "active",
        "end_date": {"$lt": now}
    }).to_list(100)
    
    created = 0
    for res in overdue_reservations:
        existing = await db.notifications.find_one({
            "reservation_id": res['id'],
            "type": "late_return"
        })
        if existing:
            continue
        
        vehicle = await db.vehicles.find_one({"id": res['vehicle_id']})
        vehicle_name = f"{vehicle['brand']} {vehicle['model']}" if vehicle else 'Véhicule'
        days_overdue = (now - res['end_date']).days
        
        notification = {
            "id": str(uuid.uuid4()),
            "user_id": res['user_id'],
            "reservation_id": res['id'],
            "type": "late_return",
            "title": "Retour en retard",
            "message": f"Votre location de {vehicle_name} est en retard de {days_overdue} jour(s). Veuillez retourner le véhicule dès que possible.",
            "read": False,
            "created_at": datetime.utcnow()
        }
        await db.notifications.insert_one(notification)
        created += 1
        
        try:
            res_user = await db.users.find_one({"id": res['user_id']})
            if res_user:
                html = f"""
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
                    <div style="background:#EF4444;padding:20px;border-radius:12px 12px 0 0;text-align:center;">
                        <h2 style="color:#fff;margin:0;">Retour en retard</h2>
                    </div>
                    <div style="background:#fff;padding:20px;border-radius:0 0 12px 12px;border:1px solid #E5E7EB;">
                        <p>Bonjour {res_user['name']},</p>
                        <p>Votre location de <strong>{vehicle_name}</strong> devait être retournée le <strong>{res['end_date'].strftime('%d/%m/%Y')}</strong>.</p>
                        <p style="color:#EF4444;font-weight:bold;">Vous avez {days_overdue} jour(s) de retard.</p>
                        <p>Veuillez retourner le véhicule dès que possible pour éviter des frais supplémentaires.</p>
                        <p>L'équipe LogiRent</p>
                    </div>
                </div>
                """
                await send_email(res_user['email'], f"Retour en retard - {vehicle_name}", html)
        except Exception as e:
            logger.error(f"Failed to send overdue email: {e}")
    
    return created

async def overdue_cron_loop():
    """Background task that checks for overdue reservations every hour"""
    while True:
        try:
            created = await _check_overdue_task()
            if created > 0:
                logger.info(f"Overdue cron: created {created} late return notifications")
        except Exception as e:
            logger.error(f"Overdue cron error: {e}")
        await asyncio.sleep(3600)  # Check every hour

@app.on_event("startup")
async def startup_cron():
    asyncio.create_task(overdue_cron_loop())
    logger.info("Overdue cron job started (checks every hour)")

@api_router.post("/admin/check-overdue")
async def check_overdue_and_notify(user: dict = Depends(get_admin_user)):
    """Manually trigger overdue check"""
    created = await _check_overdue_task()
    return {"message": f"Checked overdue reservations. Created {created} new notifications."}

# ==================== AGENCY ROUTES (Super Admin) ====================

@api_router.get("/agencies")
async def list_agencies(user: dict = Depends(get_agency_admin)):
    """List agencies - super admin sees all, admin sees own"""
    is_super = user.get('role') == 'super_admin'
    if is_super:
        agencies = await db.agencies.find({}, {"_id": 0}).to_list(100)
    else:
        agencies = await db.agencies.find({"id": user.get('agency_id')}, {"_id": 0}).to_list(1)
    
    # Enrich with stats
    for agency in agencies:
        agency['vehicle_count'] = await db.vehicles.count_documents({"agency_id": agency['id']})
        agency['reservation_count'] = await db.reservations.count_documents({"agency_id": agency['id']})
        agency['admin_count'] = await db.users.count_documents({"agency_id": agency['id'], "role": {"$in": ["admin", "super_admin"]}})
        # Get admin email for the agency
        admin_user = await db.users.find_one({"agency_id": agency['id'], "role": "admin"}, {"email": 1, "name": 1, "_id": 0})
        agency['admin_email'] = admin_user['email'] if admin_user else None
        agency['admin_name'] = admin_user.get('name') if admin_user else None
        agency['admin_password_display'] = agency.get('admin_password_plain', 'N/A')
    return agencies

@api_router.post("/agencies")
async def create_agency(data: AgencyCreate, user: dict = Depends(get_super_admin)):
    """Create a new agency with its admin account (super admin only)"""
    # Validate admin fields
    if not data.admin_email or not data.admin_password or not data.admin_name:
        raise HTTPException(status_code=400, detail="Les champs admin (nom, email, mot de passe) sont requis")
    
    # Check if admin email already exists
    existing = await db.users.find_one({"email": data.admin_email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail=f"L'email {data.admin_email} est déjà utilisé")
    
    # Create agency
    slug = generate_slug(data.name)
    # Ensure slug uniqueness
    existing_slug = await db.agencies.find_one({"slug": slug})
    if existing_slug:
        slug = f"{slug}-{str(uuid.uuid4())[:4]}"
    agency = Agency(name=data.name, slug=slug, address=data.address, phone=data.phone, email=data.email, navixy_api_url=data.navixy_api_url, navixy_hash=data.navixy_hash)
    await db.agencies.insert_one(agency.dict())
    
    # Store initial admin password on the agency for super admin reference
    await db.agencies.update_one({"id": agency.id}, {"$set": {"admin_password_plain": data.admin_password}})
    
    # Create admin user for this agency
    admin_user = {
        "id": str(uuid.uuid4()),
        "email": data.admin_email.lower(),
        "password_hash": hash_password(data.admin_password),
        "name": data.admin_name,
        "phone": None,
        "address": None,
        "id_photo": None,
        "license_photo": None,
        "role": "admin",
        "agency_id": agency.id,
        "created_at": datetime.utcnow()
    }
    await db.users.insert_one(admin_user)
    
    return {
        "id": agency.id,
        "name": agency.name,
        "admin_email": data.admin_email.lower(),
        "admin_name": data.admin_name,
        "message": f"Agence '{agency.name}' créée avec le compte admin {data.admin_email}"
    }

@api_router.put("/agencies/{agency_id}")
async def update_agency(agency_id: str, data: AgencyCreate, user: dict = Depends(get_super_admin)):
    """Update agency (super admin only)"""
    update_fields = {"name": data.name}
    if data.address is not None:
        update_fields["address"] = data.address
    if data.phone is not None:
        update_fields["phone"] = data.phone
    if data.email is not None:
        update_fields["email"] = data.email
    if data.navixy_api_url is not None:
        update_fields["navixy_api_url"] = data.navixy_api_url
    if data.navixy_hash is not None:
        update_fields["navixy_hash"] = data.navixy_hash
    result = await db.agencies.update_one({"id": agency_id}, {"$set": update_fields})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Agence non trouvée")
    return {"message": "Agence mise à jour"}

@api_router.delete("/agencies/{agency_id}")
async def delete_agency(agency_id: str, user: dict = Depends(get_super_admin)):
    """Delete agency (super admin only)"""
    result = await db.agencies.delete_one({"id": agency_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Agence non trouvée")
    return {"message": "Agence supprimée"}

@api_router.post("/agencies/{agency_id}/admins")
async def add_admin_to_agency(agency_id: str, user_email: str, user: dict = Depends(get_super_admin)):
    """Assign an existing user as admin to an agency"""
    target = await db.users.find_one({"email": user_email.lower()})
    if not target:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    agency = await db.agencies.find_one({"id": agency_id})
    if not agency:
        raise HTTPException(status_code=404, detail="Agence non trouvée")
    await db.users.update_one({"id": target['id']}, {"$set": {"role": "admin", "agency_id": agency_id}})
    return {"message": f"{target['name']} est maintenant admin de {agency['name']}"}

# ==================== PUBLIC AGENCY ENDPOINT ====================

@api_router.get("/public/agency/{slug}")
async def get_agency_by_slug(slug: str):
    """Public endpoint to get agency info by slug"""
    agency = await db.agencies.find_one({"slug": slug}, {"_id": 0})
    if not agency:
        raise HTTPException(status_code=404, detail="Agence non trouvée")
    agency['vehicle_count'] = await db.vehicles.count_documents({"agency_id": agency['id']})
    return agency

@api_router.post("/migrate-agency-slugs")
async def migrate_agency_slugs():
    """One-time migration to add slugs to existing agencies"""
    agencies = await db.agencies.find({}, {"_id": 0}).to_list(100)
    updated = 0
    for agency in agencies:
        if not agency.get('slug'):
            slug = generate_slug(agency['name'])
            existing = await db.agencies.find_one({"slug": slug, "id": {"$ne": agency['id']}})
            if existing:
                slug = f"{slug}-{str(uuid.uuid4())[:4]}"
            await db.agencies.update_one({"id": agency['id']}, {"$set": {"slug": slug}})
            updated += 1
    return {"message": f"Updated {updated} agencies with slugs"}

# ==================== AGENCY ADMIN MOBILE APP ====================

class QuickClientCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[EmailStr] = None

@api_router.post("/admin/quick-client")
async def create_quick_client(data: QuickClientCreate, user: dict = Depends(get_agency_admin)):
    """Quick create a client from admin mobile app (phone booking)"""
    agency_id = user.get('agency_id')
    
    if data.email:
        existing = await db.users.find_one({"email": data.email.lower()})
        if existing:
            existing['_id'] = str(existing['_id'])
            return {"message": "Client existant trouvé", "client": existing, "is_new": False}
    
    client = {
        "id": str(uuid.uuid4()),
        "email": data.email.lower() if data.email else f"tel_{data.phone or uuid.uuid4().hex[:8]}@logirent.local",
        "password_hash": hash_password("LogiRent2024"),
        "name": data.name,
        "phone": data.phone,
        "address": None,
        "id_photo": None,
        "license_photo": None,
        "role": "client",
        "agency_id": agency_id,
        "created_at": datetime.utcnow()
    }
    await db.users.insert_one(client)
    client.pop('password_hash', None)
    client.pop('_id', None)
    return {"message": "Client créé", "client": client, "is_new": True}

class AdminReservationCreate(BaseModel):
    client_id: str
    vehicle_id: str
    start_date: datetime
    end_date: datetime
    options: List[str] = []
    payment_method: str = "cash"  # cash or send_link

@api_router.post("/admin/create-reservation-for-client")
async def create_reservation_for_client(data: AdminReservationCreate, user: dict = Depends(get_agency_admin)):
    """Admin creates a reservation on behalf of a client (phone booking)"""
    agency_id = user.get('agency_id')
    
    client = await db.users.find_one({"id": data.client_id})
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    vehicle = await db.vehicles.find_one({"id": data.vehicle_id})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Véhicule non trouvé")
    
    if vehicle.get('status') == 'maintenance':
        raise HTTPException(status_code=400, detail="Véhicule en maintenance")
    
    overlap = await db.reservations.find_one({
        "vehicle_id": data.vehicle_id,
        "status": {"$in": ["pending", "pending_cash", "confirmed", "active"]},
        "$or": [{"start_date": {"$lt": data.end_date}, "end_date": {"$gt": data.start_date}}]
    })
    if overlap:
        raise HTTPException(status_code=400, detail="Véhicule non disponible pour ces dates")
    
    total_days = (data.end_date - data.start_date).days
    if total_days <= 0:
        raise HTTPException(status_code=400, detail="Date de fin doit être après la date de début")
    
    base_price = vehicle['price_per_day'] * total_days
    vehicle_options = {opt['name']: opt for opt in vehicle.get('options', [])}
    selected_options = []
    options_price = 0
    for opt_name in data.options:
        if opt_name in vehicle_options:
            opt = vehicle_options[opt_name]
            opt_total = opt['price_per_day'] * total_days
            selected_options.append({"name": opt_name, "price_per_day": opt['price_per_day'], "total_price": opt_total})
            options_price += opt_total
    
    total_price = base_price + options_price
    status = "pending_cash" if data.payment_method == "cash" else "pending"
    
    reservation = {
        "id": str(uuid.uuid4()),
        "user_id": data.client_id,
        "vehicle_id": data.vehicle_id,
        "agency_id": agency_id,
        "start_date": data.start_date,
        "end_date": data.end_date,
        "options": selected_options,
        "total_days": total_days,
        "base_price": base_price,
        "options_price": options_price,
        "total_price": total_price,
        "status": status,
        "payment_method": data.payment_method,
        "payment_status": "unpaid",
        "created_by_admin": user['id'],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    await db.reservations.insert_one(reservation)
    reservation.pop('_id', None)
    
    # Notify client
    await create_notification(
        data.client_id, 'new_reservation',
        f"Une réservation a été créée pour vous : {vehicle['brand']} {vehicle['model']} du {data.start_date.strftime('%d/%m/%Y')} au {data.end_date.strftime('%d/%m/%Y')}.",
        reservation['id']
    )
    
    # Send email based on payment method
    if data.payment_method == "cash":
        try:
            await send_cash_reservation_email(client, vehicle, reservation)
        except Exception as e:
            logger.error(f"Failed to send cash email: {e}")
    
    return {"message": "Réservation créée", "reservation": reservation}

class SendPaymentLinkRequest(BaseModel):
    origin_url: str

@api_router.post("/admin/reservations/{reservation_id}/send-payment-link")
async def send_payment_link_to_client(
    reservation_id: str,
    body: SendPaymentLinkRequest,
    user: dict = Depends(get_agency_admin)
):
    """Generate a Stripe payment link and send it to the client by email"""
    reservation = await db.reservations.find_one({"id": reservation_id})
    if not reservation:
        raise HTTPException(status_code=404, detail="Réservation non trouvée")
    
    if reservation.get('payment_status') == 'paid':
        raise HTTPException(status_code=400, detail="Déjà payé")
    
    client = await db.users.find_one({"id": reservation['user_id']})
    vehicle = await db.vehicles.find_one({"id": reservation['vehicle_id']})
    if not client or not vehicle:
        raise HTTPException(status_code=404, detail="Client ou véhicule non trouvé")
    
    # Create Stripe checkout
    host_url = body.origin_url.rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    success_url = f"{host_url}/payment-success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{host_url}/payment-cancel?reservation_id={reservation['id']}"
    
    metadata = {"user_id": client['id'], "reservation_id": reservation['id'], "user_email": client['email']}
    
    checkout_request = CheckoutSessionRequest(
        amount=float(reservation['total_price']),
        currency="chf",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata,
        payment_methods=['card']
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Save payment transaction
    payment_transaction = PaymentTransaction(
        user_id=client['id'],
        reservation_id=reservation['id'],
        session_id=session.session_id,
        amount=float(reservation['total_price']),
        currency="chf",
        status="initiated",
        payment_status="pending",
        metadata=metadata
    )
    await db.payment_transactions.insert_one(payment_transaction.dict())
    
    await db.reservations.update_one(
        {"id": reservation['id']},
        {"$set": {"payment_session_id": session.session_id, "payment_method": "card"}}
    )
    
    # Send email with payment link
    start_date = reservation['start_date']
    end_date = reservation['end_date']
    if isinstance(start_date, str):
        start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
    if isinstance(end_date, str):
        end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
    
    html = f'''
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <div style="background:#6C2BD9;padding:25px;border-radius:12px 12px 0 0;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:24px;">LogiRent</h1>
            <p style="color:rgba(255,255,255,0.8);margin:8px 0 0 0;">Lien de paiement</p>
        </div>
        <div style="background:#fff;padding:25px;border-radius:0 0 12px 12px;border:1px solid #E5E7EB;">
            <p>Bonjour {client['name']},</p>
            <p>Une réservation a été créée pour vous :</p>
            <div style="background:#F8FAFC;padding:15px;border-radius:8px;margin:15px 0;">
                <p style="margin:4px 0;"><strong>{vehicle['brand']} {vehicle['model']}</strong></p>
                <p style="margin:4px 0;">Du {start_date.strftime('%d/%m/%Y')} au {end_date.strftime('%d/%m/%Y')} ({reservation['total_days']} jours)</p>
                <p style="margin:4px 0;font-size:20px;font-weight:bold;color:#6C2BD9;">CHF {reservation['total_price']:.2f}</p>
            </div>
            <a href="{session.url}" style="display:block;background:#6C2BD9;color:#fff;text-align:center;padding:14px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;margin:20px 0;">
                Payer maintenant
            </a>
            <p style="color:#64748B;font-size:13px;">Ce lien est valable pendant 24 heures.</p>
            <p style="margin-top:20px;">L'équipe LogiRent</p>
        </div>
    </div>
    '''
    
    try:
        await send_email(client['email'], f"Lien de paiement - {vehicle['brand']} {vehicle['model']}", html)
    except Exception as e:
        logger.error(f"Failed to send payment link email: {e}")
    
    return {"message": "Lien de paiement envoyé", "payment_url": session.url}

@api_router.get("/admin/search-clients")
async def search_clients(q: str = "", user: dict = Depends(get_agency_admin)):
    """Search clients by name, email or phone"""
    if not q or len(q) < 2:
        return {"clients": []}
    
    query = {
        "role": "client",
        "$or": [
            {"name": {"$regex": q, "$options": "i"}},
            {"email": {"$regex": q, "$options": "i"}},
            {"phone": {"$regex": q, "$options": "i"}},
        ]
    }
    
    clients = await db.users.find(query, {"password_hash": 0, "_id": 0, "id_photo": 0, "license_photo": 0}).limit(10).to_list(10)
    return {"clients": clients}

@api_router.get("/admin/available-vehicles")
async def get_available_vehicles_for_dates(
    start_date: datetime,
    end_date: datetime,
    user: dict = Depends(get_agency_admin)
):
    """Get vehicles available for specific dates, scoped by agency"""
    agency_id = user.get('agency_id')
    is_super = user.get('role') == 'super_admin'
    
    vf = {"status": {"$ne": "maintenance"}}
    if not is_super and agency_id:
        vf["agency_id"] = agency_id
    
    vehicles = await db.vehicles.find(vf, {"_id": 0}).to_list(200)
    
    available = []
    for v in vehicles:
        overlap = await db.reservations.find_one({
            "vehicle_id": v['id'],
            "status": {"$in": ["pending", "pending_cash", "confirmed", "active"]},
            "$or": [{"start_date": {"$lt": end_date}, "end_date": {"$gt": start_date}}]
        })
        if not overlap:
            available.append(v)
    
    return {"vehicles": available}

# ==================== ADMIN LOGIN (legacy support) ====================

class AdminLogin(BaseModel):
    email: str
    password: str

@api_router.post("/admin/login")
async def admin_login(credentials: AdminLogin):
    """Admin login - checks role"""
    user = await db.users.find_one({"email": credentials.email.lower()})
    if not user or not verify_password(credentials.password, user['password_hash']):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    
    role = user.get('role', 'client')
    if role not in ('admin', 'super_admin'):
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs. Contactez le super-admin pour obtenir les droits.")
    
    token = create_token(user['id'], user['email'], role)
    profile = await build_user_profile(user)
    
    return TokenResponse(access_token=token, user=profile)

# ==================== SETUP / MIGRATION ====================

@api_router.post("/setup/init")
async def setup_init():
    """Initialize the platform: create default agency, set test user as super_admin"""
    # Check if already initialized
    existing_agency = await db.agencies.find_one({})
    if existing_agency:
        return {"message": "Plateforme déjà initialisée", "agency_id": existing_agency['id']}
    
    # Create default agency
    agency = Agency(name="LogiRent Geneva", address="Geneva, Switzerland", phone="+41 22 000 0000", email="admin@logirent.ch")
    await db.agencies.insert_one(agency.dict())
    
    # Set the test user as super_admin
    await db.users.update_one(
        {"email": "test@example.com"},
        {"$set": {"role": "super_admin", "agency_id": agency.id}}
    )
    
    # Assign all existing vehicles to this agency
    await db.vehicles.update_many(
        {"agency_id": None},
        {"$set": {"agency_id": agency.id}}
    )
    await db.vehicles.update_many(
        {"agency_id": {"$exists": False}},
        {"$set": {"agency_id": agency.id}}
    )
    
    # Assign all existing reservations to this agency
    await db.reservations.update_many(
        {"agency_id": None},
        {"$set": {"agency_id": agency.id}}
    )
    await db.reservations.update_many(
        {"agency_id": {"$exists": False}},
        {"$set": {"agency_id": agency.id}}
    )
    
    # Set all users without a role to 'client'
    await db.users.update_many(
        {"role": {"$exists": False}},
        {"$set": {"role": "client", "agency_id": None}}
    )
    
    return {"message": "Plateforme initialisée", "agency_id": agency.id, "agency_name": agency.name}


# ==================== AGENCY ADMIN: OWN NAVIXY CONFIG ====================

class NavixyConfig(BaseModel):
    navixy_api_url: Optional[str] = None
    navixy_hash: Optional[str] = None

@api_router.get("/admin/my-agency/navixy")
async def get_my_navixy_config(user: dict = Depends(get_admin_user)):
    """Get the Navixy config for the current admin's agency"""
    agency_id = user.get('agency_id')
    if not agency_id:
        raise HTTPException(status_code=400, detail="Aucune agence associée")
    agency = await db.agencies.find_one({"id": agency_id}, {"_id": 0, "navixy_api_url": 1, "navixy_hash": 1})
    return {
        "navixy_api_url": agency.get("navixy_api_url", "") if agency else "",
        "navixy_hash": agency.get("navixy_hash", "") if agency else "",
        "configured": bool(agency and agency.get("navixy_api_url") and agency.get("navixy_hash"))
    }

@api_router.put("/admin/my-agency/navixy")
async def update_my_navixy_config(data: NavixyConfig, user: dict = Depends(get_admin_user)):
    """Agency admin updates their own Navixy API config"""
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

# ==================== NAVIXY GPS TRACKING ====================

async def get_agency_navixy_config(user: dict) -> tuple:
    """Get Navixy API URL and hash for the admin's agency. No global fallback - each agency must configure its own."""
    agency_id = user.get('agency_id')
    if agency_id:
        agency = await db.agencies.find_one({"id": agency_id}, {"_id": 0})
        if agency and agency.get('navixy_api_url') and agency.get('navixy_hash'):
            return agency['navixy_api_url'], agency['navixy_hash']
    return None, None

@api_router.get("/navixy/trackers")
async def get_navixy_trackers(user: dict = Depends(get_current_user)):
    """Get all trackers from Navixy with their GPS state"""
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
            "id": t["id"],
            "label": t.get("label", ""),
            "model": t.get("source", {}).get("model", ""),
            "status": t.get("status", {}).get("listing", ""),
        })
    return trackers

@api_router.get("/navixy/tracker/{tracker_id}/state")
async def get_navixy_tracker_state(tracker_id: int, user: dict = Depends(get_current_user)):
    """Get GPS position of a single tracker"""
    if user.get('role') not in ['admin', 'super_admin']:
        raise HTTPException(status_code=403, detail="Admin access required")
    api_url, api_hash = await get_agency_navixy_config(user)
    if not api_url or not api_hash:
        raise HTTPException(status_code=500, detail="Navixy non configuré pour cette agence")
    
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(f"{api_url}/tracker/get_state",
            json={"hash": api_hash, "tracker_id": tracker_id})
        data = resp.json()
    
    if not data.get("state"):
        raise HTTPException(status_code=404, detail="Tracker not found")
    
    state = data["state"]
    gps = state.get("gps", {})
    loc = gps.get("location", {})
    return {
        "tracker_id": tracker_id,
        "lat": loc.get("lat"),
        "lng": loc.get("lng"),
        "speed": gps.get("speed", 0),
        "heading": gps.get("heading", 0),
        "altitude": gps.get("alt", 0),
        "gps_updated": gps.get("updated"),
        "connection_status": state.get("connection_status"),
        "movement_status": state.get("movement_status"),
        "ignition": state.get("ignition"),
        "last_update": state.get("last_update"),
    }

@api_router.get("/navixy/positions")
async def get_navixy_all_positions(user: dict = Depends(get_current_user)):
    """Get GPS positions of ALL trackers in one call"""
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
        tasks = []
        for tid in tracker_ids:
            tasks.append(client.post(f"{api_url}/tracker/get_state",
                json={"hash": api_hash, "tracker_id": tid}))
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
                "tracker_id": tid,
                "label": tracker.get("label", ""),
                "lat": loc.get("lat"),
                "lng": loc.get("lng"),
                "speed": gps.get("speed", 0),
                "heading": gps.get("heading", 0),
                "connection_status": state.get("connection_status"),
                "movement_status": state.get("movement_status"),
                "ignition": state.get("ignition"),
                "last_update": state.get("last_update"),
            })
        except Exception:
            continue
    
    return positions

@api_router.post("/navixy/sync-vehicles")
async def sync_navixy_vehicles(user: dict = Depends(get_current_user)):
    """Sync Navixy trackers into LogiRent vehicles database"""
    if user.get('role') not in ['admin', 'super_admin']:
        raise HTTPException(status_code=403, detail="Admin access required")
    api_url, api_hash = await get_agency_navixy_config(user)
    if not api_url or not api_hash:
        raise HTTPException(status_code=500, detail="Navixy non configuré pour cette agence")
    
    # Get user's agency
    agency_id = user.get('agency_id')
    if not agency_id:
        raise HTTPException(status_code=400, detail="No agency assigned")
    
    # Fetch trackers from Navixy
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
        
        # Check if vehicle with this navixy_tracker_id already exists
        existing = await db.vehicles.find_one({"navixy_tracker_id": navixy_id}, {"_id": 0})
        
        if existing:
            # Update the label if changed
            await db.vehicles.update_one(
                {"navixy_tracker_id": navixy_id},
                {"$set": {"navixy_label": label}}
            )
            updated += 1
        else:
            # Create a new vehicle entry
            vehicle = {
                "id": str(uuid.uuid4()),
                "brand": label.split("-")[1].strip().split(" ")[0] if "-" in label else "Véhicule",
                "model": " ".join(label.split("-")[1].strip().split(" ")[1:]) if "-" in label else label,
                "year": 2024,
                "price_per_day": 0,
                "description": f"Synchronisé depuis Navixy (Tracker: {label})",
                "photos": [],
                "available": True,
                "category": "berline",
                "fuel_type": "essence",
                "transmission": "automatique",
                "seats": 5,
                "agency_id": agency_id,
                "navixy_tracker_id": navixy_id,
                "navixy_label": label,
                "created_at": datetime.utcnow().isoformat(),
            }
            await db.vehicles.insert_one(vehicle)
            created += 1
    
    return {"message": f"Synchronisation terminée: {created} créés, {updated} mis à jour", "created": created, "updated": updated}



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
