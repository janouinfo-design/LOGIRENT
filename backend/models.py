from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid


# ==================== AGENCY MODELS ====================

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


# ==================== AUTH MODELS ====================

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
    id_photo_back: Optional[str] = None
    license_photo: Optional[str] = None
    license_photo_back: Optional[str] = None
    id_verification: Optional[dict] = None
    license_verification: Optional[dict] = None
    profile_photo: Optional[str] = None
    client_rating: Optional[str] = None
    admin_notes: Optional[str] = None
    birth_place: Optional[str] = None
    date_of_birth: Optional[str] = None
    license_number: Optional[str] = None
    license_issue_date: Optional[str] = None
    license_expiry_date: Optional[str] = None
    nationality: Optional[str] = None
    role: str = "client"
    agency_id: Optional[str] = None
    agency_name: Optional[str] = None
    created_at: datetime


class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    birth_place: Optional[str] = None
    date_of_birth: Optional[str] = None
    license_number: Optional[str] = None
    license_issue_date: Optional[str] = None
    license_expiry_date: Optional[str] = None
    nationality: Optional[str] = None


class AdminUserUpdate(BaseModel):
    client_rating: Optional[str] = None
    admin_notes: Optional[str] = None
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    birth_place: Optional[str] = None
    date_of_birth: Optional[str] = None
    license_number: Optional[str] = None
    license_issue_date: Optional[str] = None
    license_expiry_date: Optional[str] = None
    nationality: Optional[str] = None


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfile


class Base64Upload(BaseModel):
    image_data: str


class Base64ImageUpload(BaseModel):
    image: str
    content_type: str = "image/jpeg"


class Base64UserPhoto(BaseModel):
    image: str
    content_type: str = "image/jpeg"


class AdminLogin(BaseModel):
    email: str
    password: str


# ==================== VEHICLE MODELS ====================

class VehicleOption(BaseModel):
    name: str
    price_per_day: float = 0


class Vehicle(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
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
    status: str = "available"
    location: str = "Geneva"
    plate_number: Optional[str] = None
    chassis_number: Optional[str] = None
    color: Optional[str] = None
    documents: List[dict] = []
    agency_id: Optional[str] = None
    pricing_tiers: List[dict] = []
    seasonal_pricing: List[dict] = []
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
    status: Optional[str] = None
    plate_number: Optional[str] = None
    chassis_number: Optional[str] = None
    color: Optional[str] = None
    documents: Optional[List[dict]] = None


# ==================== RESERVATION MODELS ====================

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
    selected_tier: Optional[dict] = None
    total_days: int
    base_price: float
    options_price: float
    total_price: float
    status: str = "pending"
    payment_method: str = "card"
    payment_session_id: Optional[str] = None
    payment_status: str = "unpaid"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ReservationCreate(BaseModel):
    vehicle_id: str
    start_date: datetime
    end_date: datetime
    options: List[str] = []
    payment_method: str = "card"
    selected_tier_id: Optional[str] = None


class ReservationUpdate(BaseModel):
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    options: Optional[List[str]] = None


# ==================== PAYMENT MODELS ====================

class PaymentTransaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    reservation_id: str
    session_id: str
    amount: float
    currency: str = "chf"
    status: str = "initiated"
    payment_status: str = "pending"
    metadata: Dict[str, Any] = {}
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class CheckoutRequest(BaseModel):
    reservation_id: str
    origin_url: str
    payment_method_type: str = "card"


# ==================== ADMIN MODELS ====================

class AdminStats(BaseModel):
    total_vehicles: int
    total_users: int
    total_reservations: int
    total_payments: int
    total_revenue: float
    reservations_by_status: Dict[str, int]
    top_vehicles: List[Dict[str, Any]]
    revenue_by_month: List[Dict[str, Any]]


class QuickClientCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    birth_place: Optional[str] = None
    date_of_birth: Optional[str] = None
    license_number: Optional[str] = None
    license_issue_date: Optional[str] = None
    license_expiry_date: Optional[str] = None
    nationality: Optional[str] = None


class AdminReservationCreate(BaseModel):
    client_id: str
    vehicle_id: str
    start_date: datetime
    end_date: datetime
    options: List[str] = []
    payment_method: str = "cash"


class SendPaymentLinkRequest(BaseModel):
    origin_url: str


# ==================== NAVIXY MODELS ====================

class NavixyConfig(BaseModel):
    navixy_api_url: Optional[str] = None
    navixy_hash: Optional[str] = None


# ==================== CONTRACT MODELS ====================

class ContractGenerate(BaseModel):
    reservation_id: str
    language: str = "fr"


class ContractSign(BaseModel):
    signature_data: str



# ==================== PRICING TIER MODELS ====================

class PricingTier(BaseModel):
    name: str
    kilometers: Optional[int] = None
    price: float
    period: Optional[str] = None  # jour, weekend, semaine, mois, custom
    order: int = 0
    active: bool = True

class PricingTiersUpdate(BaseModel):
    pricing_tiers: list[dict]


# ==================== SEASONAL PRICING MODELS ====================

class SeasonalPrice(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str  # e.g. "Ete 2026", "Noel", "Promo Printemps"
    start_date: str  # ISO date string YYYY-MM-DD
    end_date: str
    modifier_type: str = "percentage"  # "percentage" or "fixed_price"
    modifier_value: float = 0  # -20 for 20% discount, or 150 for fixed CHF 150/day
    active: bool = True

class SeasonalPricingUpdate(BaseModel):
    seasonal_pricing: list[dict]


# ==================== VEHICLE INSPECTION MODELS ====================

class InspectionItem(BaseModel):
    name: str
    checked: bool = False
    condition: str = "ok"  # ok, damaged, missing
    notes: Optional[str] = None
    photo: Optional[str] = None

class VehicleInspection(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    reservation_id: str
    vehicle_id: str
    agency_id: Optional[str] = None
    type: str  # "checkout" (depart) or "checkin" (retour)
    items: List[dict] = []
    photos: List[str] = []
    km_reading: Optional[int] = None
    fuel_level: Optional[str] = None  # full, 3/4, 1/2, 1/4, empty
    notes: Optional[str] = None
    signature_data: Optional[str] = None
    completed_by: Optional[str] = None
    completed_at: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class InspectionCreate(BaseModel):
    reservation_id: str
    vehicle_id: str
    type: str  # checkout or checkin
    items: List[dict] = []
    photos: List[str] = []
    km_reading: Optional[int] = None
    fuel_level: Optional[str] = None
    notes: Optional[str] = None
    signature_data: Optional[str] = None
