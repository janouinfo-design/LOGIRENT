from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime, timedelta
import bcrypt
import jwt
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from openpyxl import Workbook
from bson import ObjectId
import math

def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculate distance in meters between two GPS coordinates."""
    R = 6371000  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'test_database')]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'timesheet_secret_key_2025_secure')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

# Create the main app
app = FastAPI(title="TimeSheet SaaS API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ===================== ENUMS =====================

class UserRole:
    EMPLOYEE = "employee"
    MANAGER = "manager"
    ADMIN = "admin"

class TimesheetStatus:
    DRAFT = "draft"
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class LeaveType:
    VACATION = "vacation"
    SICK = "sick"
    ACCIDENT = "accident"
    TRAINING = "training"

class LeaveStatus:
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class InvoiceStatus:
    DRAFT = "draft"
    SENT = "sent"
    PAID = "paid"
    OVERDUE = "overdue"

# ===================== PYDANTIC MODELS =====================

# Company Models
class CompanyCreate(BaseModel):
    name: str
    address: Optional[str] = ""
    country: Optional[str] = "Suisse"
    vat_number: Optional[str] = ""

class CompanyResponse(BaseModel):
    id: str
    name: str
    address: str
    country: str
    vat_number: str
    created_at: datetime

# Department Models
class DepartmentCreate(BaseModel):
    name: str
    description: Optional[str] = ""

class DepartmentResponse(BaseModel):
    id: str
    name: str
    description: str
    company_id: Optional[str] = None

# User Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    role: str = UserRole.EMPLOYEE
    contract_hours: float = 42.0
    department_id: Optional[str] = None
    phone: Optional[str] = ""

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    first_name: str
    last_name: str
    role: str
    contract_hours: float
    department_id: Optional[str] = None
    department_name: Optional[str] = None
    phone: Optional[str] = None
    created_at: datetime

class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    contract_hours: Optional[float] = None
    department_id: Optional[str] = None
    phone: Optional[str] = None

# Client Models
class ClientCreate(BaseModel):
    name: str
    email: Optional[str] = ""
    phone: Optional[str] = ""
    company: Optional[str] = ""
    address: Optional[str] = ""

class ClientResponse(BaseModel):
    id: str
    name: str
    email: str
    phone: str
    company: str
    address: str
    created_at: datetime

# Activity Models
class ActivityCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    billable: bool = True

class ActivityResponse(BaseModel):
    id: str
    name: str
    description: str
    billable: bool

# Project Models
class ProjectCreate(BaseModel):
    name: str
    client_id: Optional[str] = None
    description: Optional[str] = ""
    location: Optional[str] = ""
    budget: Optional[float] = 0.0
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    hourly_rate: Optional[float] = 0.0
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    geofence_radius: Optional[int] = 100  # meters

class ProjectResponse(BaseModel):
    id: str
    name: str
    client_id: Optional[str] = None
    client_name: Optional[str] = None
    description: str
    location: str
    budget: float
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    hourly_rate: float
    status: str
    created_at: datetime
    is_active: bool
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    geofence_radius: Optional[int] = 100

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    client_id: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    budget: Optional[float] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    hourly_rate: Optional[float] = None
    status: Optional[str] = None
    is_active: Optional[bool] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    geofence_radius: Optional[int] = None

# Timesheet Models
class TimesheetCreate(BaseModel):
    project_id: Optional[str] = None
    activity_id: Optional[str] = None
    comment: Optional[str] = ""
    billable: bool = True
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class TimesheetResponse(BaseModel):
    id: str
    user_id: str
    user_name: Optional[str] = None
    project_id: Optional[str] = None
    project_name: Optional[str] = None
    activity_id: Optional[str] = None
    activity_name: Optional[str] = None
    date: str
    clock_in: Optional[datetime] = None
    clock_out: Optional[datetime] = None
    break_start: Optional[datetime] = None
    break_end: Optional[datetime] = None
    duration: float
    break_duration: float
    billable: bool
    status: str
    comment: str
    overtime_hours: float

class TimesheetUpdate(BaseModel):
    clock_in: Optional[datetime] = None
    clock_out: Optional[datetime] = None
    break_start: Optional[datetime] = None
    break_end: Optional[datetime] = None
    project_id: Optional[str] = None
    activity_id: Optional[str] = None
    comment: Optional[str] = None
    billable: Optional[bool] = None
    status: Optional[str] = None

# Timer Models
class TimerEntry(BaseModel):
    id: str
    user_id: str
    project_id: Optional[str] = None
    activity_id: Optional[str] = None
    start_time: datetime
    end_time: Optional[datetime] = None
    duration: float
    description: Optional[str] = ""
    billable: bool = True
    is_running: bool = False

# Leave/Absence Models
class LeaveCreate(BaseModel):
    type: str
    start_date: str
    end_date: str
    reason: Optional[str] = ""

class LeaveResponse(BaseModel):
    id: str
    user_id: str
    user_name: Optional[str] = None
    type: str
    start_date: str
    end_date: str
    reason: str
    status: str
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    created_at: datetime

# Invoice Models
class InvoiceCreate(BaseModel):
    client_id: str
    project_id: Optional[str] = None
    timesheet_ids: List[str] = []
    due_date: Optional[str] = None
    notes: Optional[str] = ""

class InvoiceResponse(BaseModel):
    id: str
    invoice_number: str
    client_id: str
    client_name: Optional[str] = None
    project_id: Optional[str] = None
    project_name: Optional[str] = None
    amount: float
    hours: float
    status: str
    date: datetime
    due_date: Optional[str] = None
    notes: str
    items: List[dict] = []

# Notification Models
class NotificationResponse(BaseModel):
    id: str
    user_id: str
    title: str
    message: str
    type: str
    read: bool
    created_at: datetime

# Audit Log Models
class AuditLogResponse(BaseModel):
    id: str
    user_id: str
    user_name: Optional[str] = None
    action: str
    entity: str
    entity_id: Optional[str] = None
    details: Optional[str] = None
    timestamp: datetime
    ip_address: Optional[str] = None

# ===================== HELPER FUNCTIONS =====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, role: str) -> str:
    payload = {
        'user_id': user_id,
        'role': role,
        'exp': datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expiré")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalide")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = decode_token(token)
    user = await db.users.find_one({'_id': ObjectId(payload['user_id'])})
    if not user:
        raise HTTPException(status_code=401, detail="Utilisateur non trouvé")
    return user

async def get_manager_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    user = await get_current_user(credentials)
    if user['role'] not in [UserRole.MANAGER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Accès refusé - rôle manager requis")
    return user

async def get_admin_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    user = await get_current_user(credentials)
    if user['role'] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Accès refusé - rôle admin requis")
    return user

def calculate_duration(clock_in: datetime, clock_out: datetime, break_start: datetime = None, break_end: datetime = None) -> tuple:
    if not clock_in or not clock_out:
        return 0.0, 0.0
    
    total_seconds = (clock_out - clock_in).total_seconds()
    break_seconds = 0.0
    
    if break_start and break_end:
        break_seconds = (break_end - break_start).total_seconds()
    
    work_seconds = total_seconds - break_seconds
    work_hours = max(0, work_seconds / 3600)
    break_hours = break_seconds / 3600
    
    return round(work_hours, 2), round(break_hours, 2)

async def create_notification(user_id: str, title: str, message: str, notif_type: str = "info"):
    await db.notifications.insert_one({
        'user_id': user_id,
        'title': title,
        'message': message,
        'type': notif_type,
        'read': False,
        'created_at': datetime.utcnow()
    })

async def create_audit_log(user_id: str, action: str, entity: str, entity_id: str = None, details: str = None, ip_address: str = None):
    await db.audit_logs.insert_one({
        'user_id': user_id,
        'action': action,
        'entity': entity,
        'entity_id': entity_id,
        'details': details,
        'ip_address': ip_address,
        'timestamp': datetime.utcnow()
    })

# ===================== AUTH ENDPOINTS =====================

@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    existing = await db.users.find_one({'email': user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    
    user_doc = {
        'email': user_data.email,
        'password_hash': hash_password(user_data.password),
        'first_name': user_data.first_name,
        'last_name': user_data.last_name,
        'role': user_data.role,
        'contract_hours': user_data.contract_hours,
        'department_id': user_data.department_id,
        'phone': user_data.phone or "",
        'created_at': datetime.utcnow()
    }
    
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    
    await create_audit_log(user_id, "CREATE", "user", user_id, f"Nouveau compte créé: {user_data.email}")
    
    return {
        'token': create_token(user_id, user_data.role),
        'user': {
            'id': user_id,
            'email': user_data.email,
            'first_name': user_data.first_name,
            'last_name': user_data.last_name,
            'role': user_data.role,
            'contract_hours': user_data.contract_hours
        }
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({'email': credentials.email})
    if not user or not verify_password(credentials.password, user['password_hash']):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    
    user_id = str(user['_id'])
    await create_audit_log(user_id, "LOGIN", "user", user_id)
    
    return {
        'token': create_token(user_id, user['role']),
        'user': {
            'id': user_id,
            'email': user['email'],
            'first_name': user['first_name'],
            'last_name': user['last_name'],
            'role': user['role'],
            'contract_hours': user['contract_hours']
        }
    }

@api_router.get("/auth/me")
async def get_me(user=Depends(get_current_user)):
    dept_name = None
    if user.get('department_id'):
        dept = await db.departments.find_one({'_id': ObjectId(user['department_id'])})
        dept_name = dept['name'] if dept else None
    
    return {
        'id': str(user['_id']),
        'email': user['email'],
        'first_name': user['first_name'],
        'last_name': user['last_name'],
        'role': user['role'],
        'contract_hours': user['contract_hours'],
        'department_id': user.get('department_id'),
        'department_name': dept_name,
        'phone': user.get('phone', '')
    }

# ===================== COMPANY ENDPOINTS =====================

@api_router.post("/companies", response_model=CompanyResponse)
async def create_company(data: CompanyCreate, user=Depends(get_admin_user)):
    company_doc = {
        'name': data.name,
        'address': data.address or "",
        'country': data.country or "Suisse",
        'vat_number': data.vat_number or "",
        'created_at': datetime.utcnow()
    }
    result = await db.companies.insert_one(company_doc)
    await create_audit_log(str(user['_id']), "CREATE", "company", str(result.inserted_id))
    return CompanyResponse(id=str(result.inserted_id), **company_doc)

@api_router.get("/companies", response_model=List[CompanyResponse])
async def get_companies(user=Depends(get_current_user)):
    companies = await db.companies.find().to_list(100)
    return [CompanyResponse(id=str(c['_id']), **{k: v for k, v in c.items() if k != '_id'}) for c in companies]

# ===================== DEPARTMENT ENDPOINTS =====================

@api_router.post("/departments", response_model=DepartmentResponse)
async def create_department(data: DepartmentCreate, user=Depends(get_admin_user)):
    dept_doc = {
        'name': data.name,
        'description': data.description or "",
        'company_id': None
    }
    result = await db.departments.insert_one(dept_doc)
    await create_audit_log(str(user['_id']), "CREATE", "department", str(result.inserted_id))
    return DepartmentResponse(id=str(result.inserted_id), **dept_doc)

@api_router.get("/departments", response_model=List[DepartmentResponse])
async def get_departments(user=Depends(get_current_user)):
    depts = await db.departments.find().to_list(100)
    return [DepartmentResponse(id=str(d['_id']), name=d['name'], description=d.get('description', ''), company_id=d.get('company_id')) for d in depts]

@api_router.delete("/departments/{dept_id}")
async def delete_department(dept_id: str, user=Depends(get_admin_user)):
    await db.departments.delete_one({'_id': ObjectId(dept_id)})
    await create_audit_log(str(user['_id']), "DELETE", "department", dept_id)
    return {"message": "Département supprimé"}

# ===================== USER ENDPOINTS =====================

@api_router.get("/users", response_model=List[UserResponse])
async def get_users(user=Depends(get_manager_user)):
    users = await db.users.find().to_list(1000)
    result = []
    for u in users:
        dept_name = None
        if u.get('department_id'):
            dept = await db.departments.find_one({'_id': ObjectId(u['department_id'])})
            dept_name = dept['name'] if dept else None
        result.append(UserResponse(
            id=str(u['_id']),
            email=u['email'],
            first_name=u['first_name'],
            last_name=u['last_name'],
            role=u['role'],
            contract_hours=u['contract_hours'],
            department_id=u.get('department_id'),
            department_name=dept_name,
            phone=u.get('phone'),
            created_at=u['created_at']
        ))
    return result

@api_router.put("/users/{user_id}")
async def update_user(user_id: str, update_data: UserUpdate, user=Depends(get_current_user)):
    if str(user['_id']) != user_id and user['role'] not in [UserRole.MANAGER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Accès refusé")
    
    update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
    if update_dict:
        await db.users.update_one({'_id': ObjectId(user_id)}, {'$set': update_dict})
        await create_audit_log(str(user['_id']), "UPDATE", "user", user_id)
    
    updated_user = await db.users.find_one({'_id': ObjectId(user_id)})
    return {
        'id': str(updated_user['_id']),
        'email': updated_user['email'],
        'first_name': updated_user['first_name'],
        'last_name': updated_user['last_name'],
        'role': updated_user['role'],
        'contract_hours': updated_user['contract_hours']
    }

# ===================== CLIENT ENDPOINTS =====================

@api_router.post("/clients", response_model=ClientResponse)
async def create_client(data: ClientCreate, user=Depends(get_manager_user)):
    client_doc = {
        'name': data.name,
        'email': data.email or "",
        'phone': data.phone or "",
        'company': data.company or "",
        'address': data.address or "",
        'created_at': datetime.utcnow()
    }
    result = await db.clients.insert_one(client_doc)
    await create_audit_log(str(user['_id']), "CREATE", "client", str(result.inserted_id))
    return ClientResponse(id=str(result.inserted_id), **client_doc)

@api_router.get("/clients", response_model=List[ClientResponse])
async def get_clients(user=Depends(get_current_user)):
    clients = await db.clients.find().to_list(1000)
    return [ClientResponse(id=str(c['_id']), name=c['name'], email=c.get('email', ''), phone=c.get('phone', ''), company=c.get('company', ''), address=c.get('address', ''), created_at=c['created_at']) for c in clients]

@api_router.put("/clients/{client_id}")
async def update_client(client_id: str, data: ClientCreate, user=Depends(get_manager_user)):
    update_dict = {k: v for k, v in data.dict().items() if v is not None}
    await db.clients.update_one({'_id': ObjectId(client_id)}, {'$set': update_dict})
    await create_audit_log(str(user['_id']), "UPDATE", "client", client_id)
    return {"message": "Client mis à jour"}

@api_router.delete("/clients/{client_id}")
async def delete_client(client_id: str, user=Depends(get_manager_user)):
    await db.clients.delete_one({'_id': ObjectId(client_id)})
    await create_audit_log(str(user['_id']), "DELETE", "client", client_id)
    return {"message": "Client supprimé"}

# ===================== ACTIVITY ENDPOINTS =====================

@api_router.post("/activities", response_model=ActivityResponse)
async def create_activity(data: ActivityCreate, user=Depends(get_manager_user)):
    activity_doc = {
        'name': data.name,
        'description': data.description or "",
        'billable': data.billable
    }
    result = await db.activities.insert_one(activity_doc)
    return ActivityResponse(id=str(result.inserted_id), **activity_doc)

@api_router.get("/activities", response_model=List[ActivityResponse])
async def get_activities(user=Depends(get_current_user)):
    activities = await db.activities.find().to_list(100)
    return [ActivityResponse(id=str(a['_id']), name=a['name'], description=a.get('description', ''), billable=a.get('billable', True)) for a in activities]

@api_router.delete("/activities/{activity_id}")
async def delete_activity(activity_id: str, user=Depends(get_manager_user)):
    await db.activities.delete_one({'_id': ObjectId(activity_id)})
    return {"message": "Activité supprimée"}

# ===================== PROJECT ENDPOINTS =====================

@api_router.post("/projects", response_model=ProjectResponse)
async def create_project(data: ProjectCreate, user=Depends(get_manager_user)):
    project_doc = {
        'name': data.name,
        'client_id': data.client_id,
        'description': data.description or "",
        'location': data.location or "",
        'budget': data.budget or 0.0,
        'start_date': data.start_date,
        'end_date': data.end_date,
        'hourly_rate': data.hourly_rate or 0.0,
        'latitude': data.latitude,
        'longitude': data.longitude,
        'geofence_radius': data.geofence_radius or 100,
        'status': 'active',
        'is_active': True,
        'created_at': datetime.utcnow()
    }
    result = await db.projects.insert_one(project_doc)
    await create_audit_log(str(user['_id']), "CREATE", "project", str(result.inserted_id))
    
    client_name = None
    if data.client_id:
        client = await db.clients.find_one({'_id': ObjectId(data.client_id)})
        client_name = client['name'] if client else None
    
    return ProjectResponse(id=str(result.inserted_id), client_name=client_name, **project_doc)

@api_router.get("/projects", response_model=List[ProjectResponse])
async def get_projects(active_only: bool = True, user=Depends(get_current_user)):
    query = {'is_active': True} if active_only else {}
    projects = await db.projects.find(query).to_list(1000)
    
    result = []
    for p in projects:
        client_name = None
        if p.get('client_id'):
            try:
                client = await db.clients.find_one({'_id': ObjectId(p['client_id'])})
                client_name = client['name'] if client else None
            except:
                pass
        
        result.append(ProjectResponse(
            id=str(p['_id']),
            name=p['name'],
            client_id=p.get('client_id'),
            client_name=client_name,
            description=p.get('description', ''),
            location=p.get('location', ''),
            budget=p.get('budget', 0.0),
            start_date=p.get('start_date'),
            end_date=p.get('end_date'),
            hourly_rate=p.get('hourly_rate', 0.0),
            status=p.get('status', 'active'),
            created_at=p.get('created_at', datetime.utcnow()),
            is_active=p.get('is_active', True),
            latitude=p.get('latitude'),
            longitude=p.get('longitude'),
            geofence_radius=p.get('geofence_radius', 100)
        ))
    return result

@api_router.put("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: str, data: ProjectUpdate, user=Depends(get_manager_user)):
    update_dict = {k: v for k, v in data.dict().items() if v is not None}
    if update_dict:
        await db.projects.update_one({'_id': ObjectId(project_id)}, {'$set': update_dict})
        await create_audit_log(str(user['_id']), "UPDATE", "project", project_id)
    
    project = await db.projects.find_one({'_id': ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Projet non trouvé")
    
    client_name = None
    if project.get('client_id'):
        client = await db.clients.find_one({'_id': ObjectId(project['client_id'])})
        client_name = client['name'] if client else None
    
    return ProjectResponse(
        id=str(project['_id']),
        name=project['name'],
        client_id=project.get('client_id'),
        client_name=client_name,
        description=project.get('description', ''),
        location=project.get('location', ''),
        budget=project.get('budget', 0.0),
        start_date=project.get('start_date'),
        end_date=project.get('end_date'),
        hourly_rate=project.get('hourly_rate', 0.0),
        status=project.get('status', 'active'),
        created_at=project.get('created_at', datetime.utcnow()),
        is_active=project.get('is_active', True)
    )

@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str, user=Depends(get_manager_user)):
    await db.projects.update_one({'_id': ObjectId(project_id)}, {'$set': {'is_active': False}})
    await create_audit_log(str(user['_id']), "DELETE", "project", project_id)
    return {"message": "Projet désactivé"}

@api_router.get("/projects/{project_id}/stats")
async def get_project_stats(project_id: str, user=Depends(get_current_user)):
    entries = await db.timeentries.find({'project_id': project_id}).to_list(10000)
    
    total_hours = 0
    billable_hours = 0
    
    for e in entries:
        duration, _ = calculate_duration(
            e.get('clock_in'),
            e.get('clock_out'),
            e.get('break_start'),
            e.get('break_end')
        )
        total_hours += duration
        if e.get('billable', True):
            billable_hours += duration
    
    project = await db.projects.find_one({'_id': ObjectId(project_id)})
    hourly_rate = project.get('hourly_rate', 0) if project else 0
    budget = project.get('budget', 0) if project else 0
    
    return {
        'total_hours': round(total_hours, 2),
        'billable_hours': round(billable_hours, 2),
        'billable_amount': round(billable_hours * hourly_rate, 2),
        'budget': budget,
        'budget_remaining': round(budget - (billable_hours * hourly_rate), 2),
        'entries_count': len(entries)
    }

# ===================== TIMESHEET/TIME ENTRY ENDPOINTS =====================

@api_router.post("/timeentries/clock-in")
async def clock_in(data: TimesheetCreate, user=Depends(get_current_user)):
    today = datetime.utcnow().date().isoformat()
    user_id = str(user['_id'])
    
    # Auto-close any stale open entries (from previous days or abandoned sessions)
    stale = await db.timeentries.find_one({
        'user_id': user_id,
        'clock_out': None
    })
    if stale:
        close_time = stale.get('clock_in', datetime.utcnow())
        if stale.get('date') == today:
            close_time = datetime.utcnow()
        else:
            close_time = stale['clock_in'] + timedelta(hours=8)
        await db.timeentries.update_one(
            {'_id': stale['_id']},
            {'$set': {'clock_out': close_time, 'status': TimesheetStatus.PENDING}}
        )
    
    # GPS geofence validation
    if data.project_id:
        project = await db.projects.find_one({'_id': ObjectId(data.project_id)})
        if project and project.get('latitude') and project.get('longitude'):
            if not data.latitude or not data.longitude:
                raise HTTPException(status_code=400, detail="Position GPS requise pour ce projet")
            
            distance = haversine_distance(
                data.latitude, data.longitude,
                project['latitude'], project['longitude']
            )
            radius = project.get('geofence_radius', 100)
            if distance > radius:
                raise HTTPException(
                    status_code=400,
                    detail=f"Vous êtes à {int(distance)}m du projet. Vous devez être à moins de {radius}m pour pointer."
                )
    
    entry_doc = {
        'user_id': user_id,
        'date': today,
        'clock_in': datetime.utcnow(),
        'clock_out': None,
        'break_start': None,
        'break_end': None,
        'project_id': data.project_id,
        'activity_id': data.activity_id,
        'comment': data.comment or "",
        'billable': data.billable,
        'status': TimesheetStatus.PENDING
    }
    
    result = await db.timeentries.insert_one(entry_doc)
    await create_audit_log(user_id, "CLOCK_IN", "timeentry", str(result.inserted_id))
    
    return {
        'id': str(result.inserted_id),
        'message': 'Pointage début enregistré',
        'clock_in': entry_doc['clock_in']
    }

@api_router.post("/timeentries/clock-out")
async def clock_out(data: TimesheetCreate, user=Depends(get_current_user)):
    today = datetime.utcnow().date().isoformat()
    user_id = str(user['_id'])
    
    entry = await db.timeentries.find_one({
        'user_id': user_id,
        'date': today,
        'clock_out': None
    })
    
    if not entry:
        raise HTTPException(status_code=400, detail="Pas de pointage en cours")
    
    if entry.get('break_start') and not entry.get('break_end'):
        await db.timeentries.update_one(
            {'_id': entry['_id']},
            {'$set': {'break_end': datetime.utcnow()}}
        )
        entry['break_end'] = datetime.utcnow()
    
    clock_out_time = datetime.utcnow()
    
    update_data = {
        'clock_out': clock_out_time,
        'project_id': data.project_id or entry.get('project_id'),
        'activity_id': data.activity_id or entry.get('activity_id'),
        'comment': data.comment if data.comment else entry.get('comment', ''),
        'billable': data.billable
    }
    
    await db.timeentries.update_one({'_id': entry['_id']}, {'$set': update_data})
    await create_audit_log(user_id, "CLOCK_OUT", "timeentry", str(entry['_id']))
    
    work_hours, break_hours = calculate_duration(
        entry['clock_in'], 
        clock_out_time,
        entry.get('break_start'),
        entry.get('break_end')
    )
    
    return {
        'id': str(entry['_id']),
        'message': 'Pointage fin enregistré',
        'clock_out': clock_out_time,
        'total_hours': work_hours,
        'break_hours': break_hours
    }

@api_router.post("/timeentries/break-start")
async def start_break(user=Depends(get_current_user)):
    today = datetime.utcnow().date().isoformat()
    user_id = str(user['_id'])
    
    entry = await db.timeentries.find_one({
        'user_id': user_id,
        'date': today,
        'clock_out': None
    })
    
    if not entry:
        raise HTTPException(status_code=400, detail="Pas de pointage en cours")
    
    if entry.get('break_start') and not entry.get('break_end'):
        raise HTTPException(status_code=400, detail="Pause déjà en cours")
    
    await db.timeentries.update_one(
        {'_id': entry['_id']},
        {'$set': {'break_start': datetime.utcnow(), 'break_end': None}}
    )
    
    return {'message': 'Pause commencée', 'break_start': datetime.utcnow()}

@api_router.post("/timeentries/break-end")
async def end_break(user=Depends(get_current_user)):
    today = datetime.utcnow().date().isoformat()
    user_id = str(user['_id'])
    
    entry = await db.timeentries.find_one({
        'user_id': user_id,
        'date': today,
        'clock_out': None,
        'break_start': {'$ne': None},
        'break_end': None
    })
    
    if not entry:
        raise HTTPException(status_code=400, detail="Pas de pause en cours")
    
    await db.timeentries.update_one(
        {'_id': entry['_id']},
        {'$set': {'break_end': datetime.utcnow()}}
    )
    
    return {'message': 'Pause terminée', 'break_end': datetime.utcnow()}

@api_router.get("/timeentries/current")
async def get_current_entry(user=Depends(get_current_user)):
    today = datetime.utcnow().date().isoformat()
    user_id = str(user['_id'])
    
    # First look for an active entry (clock_out is None)
    entry = await db.timeentries.find_one({
        'user_id': user_id,
        'date': today,
        'clock_out': None
    })
    
    # If no active entry, get the most recent completed one
    if not entry:
        cursor = db.timeentries.find(
            {'user_id': user_id, 'date': today}
        ).sort('clock_in', -1).limit(1)
        entries = await cursor.to_list(1)
        entry = entries[0] if entries else None
    
    if not entry:
        return {'active': False, 'entry': None}
    
    project_name = None
    if entry.get('project_id'):
        project = await db.projects.find_one({'_id': ObjectId(entry['project_id'])})
        project_name = project['name'] if project else None
    
    activity_name = None
    if entry.get('activity_id'):
        activity = await db.activities.find_one({'_id': ObjectId(entry['activity_id'])})
        activity_name = activity['name'] if activity else None
    
    work_hours, break_hours = calculate_duration(
        entry['clock_in'],
        entry.get('clock_out') or datetime.utcnow(),
        entry.get('break_start'),
        entry.get('break_end') or (datetime.utcnow() if entry.get('break_start') and not entry.get('break_end') else None)
    )
    
    return {
        'active': entry.get('clock_out') is None,
        'on_break': entry.get('break_start') is not None and entry.get('break_end') is None,
        'entry': {
            'id': str(entry['_id']),
            'clock_in': entry['clock_in'],
            'clock_out': entry.get('clock_out'),
            'break_start': entry.get('break_start'),
            'break_end': entry.get('break_end'),
            'project_id': entry.get('project_id'),
            'project_name': project_name,
            'activity_id': entry.get('activity_id'),
            'activity_name': activity_name,
            'comment': entry.get('comment', ''),
            'billable': entry.get('billable', True),
            'status': entry.get('status', TimesheetStatus.PENDING),
            'total_hours': work_hours,
            'break_hours': break_hours
        }
    }

@api_router.get("/timeentries")
async def get_time_entries(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user_id: Optional[str] = None,
    project_id: Optional[str] = None,
    status: Optional[str] = None,
    billable: Optional[bool] = None,
    user=Depends(get_current_user)
):
    query = {}
    
    if user['role'] not in [UserRole.MANAGER, UserRole.ADMIN]:
        query['user_id'] = str(user['_id'])
    elif user_id:
        query['user_id'] = user_id
    
    if start_date:
        query['date'] = {'$gte': start_date}
    if end_date:
        query.setdefault('date', {})['$lte'] = end_date
    if project_id:
        query['project_id'] = project_id
    if status:
        query['status'] = status
    if billable is not None:
        query['billable'] = billable
    
    entries = await db.timeentries.find(query).sort('date', -1).to_list(1000)
    
    result = []
    for e in entries:
        project_name = None
        if e.get('project_id'):
            try:
                project = await db.projects.find_one({'_id': ObjectId(e['project_id'])})
                project_name = project['name'] if project else None
            except:
                pass
        
        activity_name = None
        if e.get('activity_id'):
            try:
                activity = await db.activities.find_one({'_id': ObjectId(e['activity_id'])})
                activity_name = activity['name'] if activity else None
            except:
                pass
        
        user_doc = await db.users.find_one({'_id': ObjectId(e['user_id'])})
        user_name = f"{user_doc['first_name']} {user_doc['last_name']}" if user_doc else "Inconnu"
        
        work_hours, break_hours = calculate_duration(
            e.get('clock_in'),
            e.get('clock_out'),
            e.get('break_start'),
            e.get('break_end')
        )
        
        daily_hours = user_doc.get('contract_hours', 42) / 5 if user_doc else 8.4
        overtime = max(0, work_hours - daily_hours)
        
        result.append(TimesheetResponse(
            id=str(e['_id']),
            user_id=e['user_id'],
            user_name=user_name,
            project_id=e.get('project_id'),
            project_name=project_name,
            activity_id=e.get('activity_id'),
            activity_name=activity_name,
            date=e['date'],
            clock_in=e.get('clock_in'),
            clock_out=e.get('clock_out'),
            break_start=e.get('break_start'),
            break_end=e.get('break_end'),
            duration=work_hours,
            break_duration=break_hours,
            billable=e.get('billable', True),
            status=e.get('status', TimesheetStatus.PENDING),
            comment=e.get('comment', ''),
            overtime_hours=overtime
        ))
    
    return result

@api_router.put("/timeentries/{entry_id}")
async def update_time_entry(entry_id: str, update_data: TimesheetUpdate, user=Depends(get_current_user)):
    entry = await db.timeentries.find_one({'_id': ObjectId(entry_id)})
    if not entry:
        raise HTTPException(status_code=404, detail="Entrée non trouvée")
    
    if entry['user_id'] != str(user['_id']) and user['role'] not in [UserRole.MANAGER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Accès refusé")
    
    if update_data.status and user['role'] not in [UserRole.MANAGER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Seuls les managers peuvent changer le statut")
    
    update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
    if update_dict:
        await db.timeentries.update_one({'_id': ObjectId(entry_id)}, {'$set': update_dict})
        await create_audit_log(str(user['_id']), "UPDATE", "timeentry", entry_id)
    
    return {"message": "Entrée mise à jour"}

@api_router.post("/timeentries/{entry_id}/approve")
async def approve_entry(entry_id: str, user=Depends(get_manager_user)):
    await db.timeentries.update_one(
        {'_id': ObjectId(entry_id)},
        {'$set': {'status': TimesheetStatus.APPROVED, 'approved_by': str(user['_id']), 'approved_at': datetime.utcnow()}}
    )
    
    entry = await db.timeentries.find_one({'_id': ObjectId(entry_id)})
    if entry:
        await create_notification(entry['user_id'], "Pointage approuvé", f"Votre pointage du {entry['date']} a été approuvé", "success")
    
    await create_audit_log(str(user['_id']), "APPROVE", "timeentry", entry_id)
    return {"message": "Entrée approuvée"}

@api_router.post("/timeentries/{entry_id}/reject")
async def reject_entry(entry_id: str, user=Depends(get_manager_user)):
    await db.timeentries.update_one(
        {'_id': ObjectId(entry_id)},
        {'$set': {'status': TimesheetStatus.REJECTED, 'approved_by': str(user['_id']), 'approved_at': datetime.utcnow()}}
    )
    
    entry = await db.timeentries.find_one({'_id': ObjectId(entry_id)})
    if entry:
        await create_notification(entry['user_id'], "Pointage refusé", f"Votre pointage du {entry['date']} a été refusé", "error")
    
    await create_audit_log(str(user['_id']), "REJECT", "timeentry", entry_id)
    return {"message": "Entrée refusée"}

@api_router.post("/timeentries/approve-all")
async def approve_all_entries(user=Depends(get_manager_user)):
    result = await db.timeentries.update_many(
        {'status': TimesheetStatus.PENDING},
        {'$set': {'status': TimesheetStatus.APPROVED, 'approved_by': str(user['_id']), 'approved_at': datetime.utcnow()}}
    )
    await create_audit_log(str(user['_id']), "APPROVE_ALL", "timeentry", None, f"{result.modified_count} entrées approuvées")
    return {"message": f"{result.modified_count} entrées approuvées"}

# ===================== TIMER ENDPOINTS =====================

@api_router.post("/timer/start")
async def start_timer(data: TimesheetCreate, user=Depends(get_current_user)):
    user_id = str(user['_id'])
    
    # Check for running timer
    running = await db.timer_entries.find_one({
        'user_id': user_id,
        'is_running': True
    })
    
    if running:
        raise HTTPException(status_code=400, detail="Un timer est déjà en cours")
    
    timer_doc = {
        'user_id': user_id,
        'project_id': data.project_id,
        'activity_id': data.activity_id,
        'start_time': datetime.utcnow(),
        'end_time': None,
        'duration': 0,
        'description': data.comment or "",
        'billable': data.billable,
        'is_running': True
    }
    
    result = await db.timer_entries.insert_one(timer_doc)
    
    return {
        'id': str(result.inserted_id),
        'message': 'Timer démarré',
        'start_time': timer_doc['start_time']
    }

@api_router.post("/timer/stop")
async def stop_timer(user=Depends(get_current_user)):
    user_id = str(user['_id'])
    
    timer = await db.timer_entries.find_one({
        'user_id': user_id,
        'is_running': True
    })
    
    if not timer:
        raise HTTPException(status_code=400, detail="Pas de timer en cours")
    
    end_time = datetime.utcnow()
    duration = (end_time - timer['start_time']).total_seconds() / 3600
    
    await db.timer_entries.update_one(
        {'_id': timer['_id']},
        {'$set': {
            'end_time': end_time,
            'duration': round(duration, 2),
            'is_running': False
        }}
    )
    
    return {
        'id': str(timer['_id']),
        'message': 'Timer arrêté',
        'duration': round(duration, 2)
    }

@api_router.get("/timer/current")
async def get_current_timer(user=Depends(get_current_user)):
    user_id = str(user['_id'])
    
    timer = await db.timer_entries.find_one({
        'user_id': user_id,
        'is_running': True
    })
    
    if not timer:
        return {'running': False, 'timer': None}
    
    elapsed = (datetime.utcnow() - timer['start_time']).total_seconds() / 3600
    
    project_name = None
    if timer.get('project_id'):
        project = await db.projects.find_one({'_id': ObjectId(timer['project_id'])})
        project_name = project['name'] if project else None
    
    return {
        'running': True,
        'timer': {
            'id': str(timer['_id']),
            'start_time': timer['start_time'],
            'elapsed_hours': round(elapsed, 2),
            'project_id': timer.get('project_id'),
            'project_name': project_name,
            'description': timer.get('description', '')
        }
    }

@api_router.get("/timer/history")
async def get_timer_history(user=Depends(get_current_user)):
    user_id = str(user['_id'])
    
    timers = await db.timer_entries.find({
        'user_id': user_id,
        'is_running': False
    }).sort('start_time', -1).to_list(100)
    
    result = []
    for t in timers:
        project_name = None
        if t.get('project_id'):
            project = await db.projects.find_one({'_id': ObjectId(t['project_id'])})
            project_name = project['name'] if project else None
        
        result.append({
            'id': str(t['_id']),
            'start_time': t['start_time'],
            'end_time': t['end_time'],
            'duration': t['duration'],
            'project_id': t.get('project_id'),
            'project_name': project_name,
            'description': t.get('description', ''),
            'billable': t.get('billable', True)
        })
    
    return result

# ===================== LEAVE/ABSENCE ENDPOINTS =====================

@api_router.post("/leaves", response_model=LeaveResponse)
async def create_leave(data: LeaveCreate, user=Depends(get_current_user)):
    leave_doc = {
        'user_id': str(user['_id']),
        'type': data.type,
        'start_date': data.start_date,
        'end_date': data.end_date,
        'reason': data.reason or "",
        'status': LeaveStatus.PENDING,
        'approved_by': None,
        'approved_at': None,
        'created_at': datetime.utcnow()
    }
    
    result = await db.leaves.insert_one(leave_doc)
    
    # Notify managers
    managers = await db.users.find({'role': {'$in': [UserRole.MANAGER, UserRole.ADMIN]}}).to_list(100)
    for manager in managers:
        await create_notification(
            str(manager['_id']),
            "Nouvelle demande d'absence",
            f"{user['first_name']} {user['last_name']} a demandé une absence",
            "info"
        )
    
    return LeaveResponse(
        id=str(result.inserted_id),
        user_id=leave_doc['user_id'],
        type=leave_doc['type'],
        start_date=leave_doc['start_date'],
        end_date=leave_doc['end_date'],
        reason=leave_doc['reason'],
        status=leave_doc['status'],
        created_at=leave_doc['created_at']
    )

@api_router.get("/leaves", response_model=List[LeaveResponse])
async def get_leaves(
    user_id: Optional[str] = None,
    status: Optional[str] = None,
    user=Depends(get_current_user)
):
    query = {}
    
    if user['role'] not in [UserRole.MANAGER, UserRole.ADMIN]:
        query['user_id'] = str(user['_id'])
    elif user_id:
        query['user_id'] = user_id
    
    if status:
        query['status'] = status
    
    leaves = await db.leaves.find(query).sort('start_date', -1).to_list(1000)
    
    result = []
    for l in leaves:
        user_doc = await db.users.find_one({'_id': ObjectId(l['user_id'])})
        user_name = f"{user_doc['first_name']} {user_doc['last_name']}" if user_doc else "Inconnu"
        
        result.append(LeaveResponse(
            id=str(l['_id']),
            user_id=l['user_id'],
            user_name=user_name,
            type=l['type'],
            start_date=l['start_date'],
            end_date=l['end_date'],
            reason=l.get('reason', ''),
            status=l['status'],
            approved_by=l.get('approved_by'),
            approved_at=l.get('approved_at'),
            created_at=l['created_at']
        ))
    
    return result

@api_router.post("/leaves/{leave_id}/approve")
async def approve_leave(leave_id: str, user=Depends(get_manager_user)):
    await db.leaves.update_one(
        {'_id': ObjectId(leave_id)},
        {'$set': {'status': LeaveStatus.APPROVED, 'approved_by': str(user['_id']), 'approved_at': datetime.utcnow()}}
    )
    
    leave = await db.leaves.find_one({'_id': ObjectId(leave_id)})
    if leave:
        await create_notification(leave['user_id'], "Absence approuvée", f"Votre demande d'absence a été approuvée", "success")
    
    await create_audit_log(str(user['_id']), "APPROVE", "leave", leave_id)
    return {"message": "Absence approuvée"}

@api_router.post("/leaves/{leave_id}/reject")
async def reject_leave(leave_id: str, user=Depends(get_manager_user)):
    await db.leaves.update_one(
        {'_id': ObjectId(leave_id)},
        {'$set': {'status': LeaveStatus.REJECTED, 'approved_by': str(user['_id']), 'approved_at': datetime.utcnow()}}
    )
    
    leave = await db.leaves.find_one({'_id': ObjectId(leave_id)})
    if leave:
        await create_notification(leave['user_id'], "Absence refusée", f"Votre demande d'absence a été refusée", "error")
    
    await create_audit_log(str(user['_id']), "REJECT", "leave", leave_id)
    return {"message": "Absence refusée"}

# ===================== INVOICE ENDPOINTS =====================

@api_router.post("/invoices", response_model=InvoiceResponse)
async def create_invoice(data: InvoiceCreate, user=Depends(get_manager_user)):
    # Get timesheet entries for the invoice
    entries = []
    total_hours = 0
    total_amount = 0
    
    if data.timesheet_ids:
        for ts_id in data.timesheet_ids:
            entry = await db.timeentries.find_one({'_id': ObjectId(ts_id)})
            if entry and entry.get('billable', True):
                duration, _ = calculate_duration(
                    entry.get('clock_in'),
                    entry.get('clock_out'),
                    entry.get('break_start'),
                    entry.get('break_end')
                )
                
                # Get project rate
                rate = 0
                if entry.get('project_id'):
                    project = await db.projects.find_one({'_id': ObjectId(entry['project_id'])})
                    rate = project.get('hourly_rate', 0) if project else 0
                
                entries.append({
                    'timesheet_id': ts_id,
                    'date': entry['date'],
                    'hours': duration,
                    'rate': rate,
                    'amount': duration * rate
                })
                total_hours += duration
                total_amount += duration * rate
    
    # Generate invoice number
    count = await db.invoices.count_documents({})
    invoice_number = f"INV-{datetime.utcnow().year}-{count + 1:04d}"
    
    client = await db.clients.find_one({'_id': ObjectId(data.client_id)})
    project = await db.projects.find_one({'_id': ObjectId(data.project_id)}) if data.project_id else None
    
    invoice_doc = {
        'invoice_number': invoice_number,
        'client_id': data.client_id,
        'project_id': data.project_id,
        'amount': round(total_amount, 2),
        'hours': round(total_hours, 2),
        'status': InvoiceStatus.DRAFT,
        'date': datetime.utcnow(),
        'due_date': data.due_date,
        'notes': data.notes or "",
        'items': entries,
        'created_by': str(user['_id'])
    }
    
    result = await db.invoices.insert_one(invoice_doc)
    await create_audit_log(str(user['_id']), "CREATE", "invoice", str(result.inserted_id))
    
    return InvoiceResponse(
        id=str(result.inserted_id),
        invoice_number=invoice_number,
        client_id=data.client_id,
        client_name=client['name'] if client else None,
        project_id=data.project_id,
        project_name=project['name'] if project else None,
        amount=round(total_amount, 2),
        hours=round(total_hours, 2),
        status=InvoiceStatus.DRAFT,
        date=invoice_doc['date'],
        due_date=data.due_date,
        notes=data.notes or "",
        items=entries
    )

@api_router.get("/invoices", response_model=List[InvoiceResponse])
async def get_invoices(
    client_id: Optional[str] = None,
    status: Optional[str] = None,
    user=Depends(get_manager_user)
):
    query = {}
    if client_id:
        query['client_id'] = client_id
    if status:
        query['status'] = status
    
    invoices = await db.invoices.find(query).sort('date', -1).to_list(1000)
    
    result = []
    for inv in invoices:
        client = await db.clients.find_one({'_id': ObjectId(inv['client_id'])})
        project = await db.projects.find_one({'_id': ObjectId(inv['project_id'])}) if inv.get('project_id') else None
        
        result.append(InvoiceResponse(
            id=str(inv['_id']),
            invoice_number=inv['invoice_number'],
            client_id=inv['client_id'],
            client_name=client['name'] if client else None,
            project_id=inv.get('project_id'),
            project_name=project['name'] if project else None,
            amount=inv['amount'],
            hours=inv['hours'],
            status=inv['status'],
            date=inv['date'],
            due_date=inv.get('due_date'),
            notes=inv.get('notes', ''),
            items=inv.get('items', [])
        ))
    
    return result

@api_router.put("/invoices/{invoice_id}/status")
async def update_invoice_status(invoice_id: str, status: str, user=Depends(get_manager_user)):
    if status not in [InvoiceStatus.DRAFT, InvoiceStatus.SENT, InvoiceStatus.PAID, InvoiceStatus.OVERDUE]:
        raise HTTPException(status_code=400, detail="Statut invalide")
    
    await db.invoices.update_one(
        {'_id': ObjectId(invoice_id)},
        {'$set': {'status': status}}
    )
    await create_audit_log(str(user['_id']), "UPDATE_STATUS", "invoice", invoice_id, f"Status: {status}")
    return {"message": f"Facture mise à jour: {status}"}

# ===================== NOTIFICATION ENDPOINTS =====================

@api_router.get("/notifications", response_model=List[NotificationResponse])
async def get_notifications(unread_only: bool = False, user=Depends(get_current_user)):
    query = {'user_id': str(user['_id'])}
    if unread_only:
        query['read'] = False
    
    notifications = await db.notifications.find(query).sort('created_at', -1).to_list(100)
    
    return [NotificationResponse(
        id=str(n['_id']),
        user_id=n['user_id'],
        title=n['title'],
        message=n['message'],
        type=n.get('type', 'info'),
        read=n['read'],
        created_at=n['created_at']
    ) for n in notifications]

@api_router.post("/notifications/{notif_id}/read")
async def mark_notification_read(notif_id: str, user=Depends(get_current_user)):
    await db.notifications.update_one(
        {'_id': ObjectId(notif_id), 'user_id': str(user['_id'])},
        {'$set': {'read': True}}
    )
    return {"message": "Notification marquée comme lue"}

@api_router.post("/notifications/read-all")
async def mark_all_notifications_read(user=Depends(get_current_user)):
    await db.notifications.update_many(
        {'user_id': str(user['_id']), 'read': False},
        {'$set': {'read': True}}
    )
    return {"message": "Toutes les notifications marquées comme lues"}

@api_router.get("/notifications/count")
async def get_unread_count(user=Depends(get_current_user)):
    count = await db.notifications.count_documents({'user_id': str(user['_id']), 'read': False})
    return {'unread_count': count}

# ===================== AUDIT LOG ENDPOINTS =====================

@api_router.get("/audit-logs", response_model=List[AuditLogResponse])
async def get_audit_logs(
    entity: Optional[str] = None,
    user_id: Optional[str] = None,
    limit: int = 100,
    user=Depends(get_admin_user)
):
    query = {}
    if entity:
        query['entity'] = entity
    if user_id:
        query['user_id'] = user_id
    
    logs = await db.audit_logs.find(query).sort('timestamp', -1).limit(limit).to_list(limit)
    
    result = []
    for log in logs:
        user_doc = await db.users.find_one({'_id': ObjectId(log['user_id'])})
        user_name = f"{user_doc['first_name']} {user_doc['last_name']}" if user_doc else "Inconnu"
        
        result.append(AuditLogResponse(
            id=str(log['_id']),
            user_id=log['user_id'],
            user_name=user_name,
            action=log['action'],
            entity=log['entity'],
            entity_id=log.get('entity_id'),
            details=log.get('details'),
            timestamp=log['timestamp'],
            ip_address=log.get('ip_address')
        ))
    
    return result

# ===================== STATISTICS ENDPOINTS =====================

@api_router.get("/stats/weekly")
async def get_weekly_stats(user=Depends(get_current_user)):
    user_id = str(user['_id'])
    today = datetime.utcnow().date()
    week_start = today - timedelta(days=today.weekday())
    
    entries = await db.timeentries.find({
        'user_id': user_id,
        'date': {'$gte': week_start.isoformat()}
    }).to_list(100)
    
    total_hours = 0
    billable_hours = 0
    total_overtime = 0
    daily_hours = user.get('contract_hours', 42) / 5
    
    for e in entries:
        work_hours, _ = calculate_duration(
            e.get('clock_in'),
            e.get('clock_out'),
            e.get('break_start'),
            e.get('break_end')
        )
        total_hours += work_hours
        if e.get('billable', True):
            billable_hours += work_hours
        total_overtime += max(0, work_hours - daily_hours)
    
    return {
        'week_start': week_start.isoformat(),
        'total_hours': round(total_hours, 2),
        'billable_hours': round(billable_hours, 2),
        'overtime_hours': round(total_overtime, 2),
        'contract_hours': user.get('contract_hours', 42),
        'days_worked': len(entries)
    }

@api_router.get("/stats/monthly")
async def get_monthly_stats(month: Optional[int] = None, year: Optional[int] = None, user=Depends(get_current_user)):
    user_id = str(user['_id'])
    now = datetime.utcnow()
    target_month = month or now.month
    target_year = year or now.year
    
    month_start = f"{target_year}-{target_month:02d}-01"
    if target_month == 12:
        month_end = f"{target_year + 1}-01-01"
    else:
        month_end = f"{target_year}-{target_month + 1:02d}-01"
    
    entries = await db.timeentries.find({
        'user_id': user_id,
        'date': {'$gte': month_start, '$lt': month_end}
    }).to_list(100)
    
    total_hours = 0
    billable_hours = 0
    total_overtime = 0
    daily_hours = user.get('contract_hours', 42) / 5
    
    for e in entries:
        work_hours, _ = calculate_duration(
            e.get('clock_in'),
            e.get('clock_out'),
            e.get('break_start'),
            e.get('break_end')
        )
        total_hours += work_hours
        if e.get('billable', True):
            billable_hours += work_hours
        total_overtime += max(0, work_hours - daily_hours)
    
    return {
        'month': target_month,
        'year': target_year,
        'total_hours': round(total_hours, 2),
        'billable_hours': round(billable_hours, 2),
        'overtime_hours': round(total_overtime, 2),
        'contract_hours': user.get('contract_hours', 42),
        'days_worked': len(entries)
    }

@api_router.get("/stats/dashboard")
async def get_dashboard_stats(user=Depends(get_manager_user)):
    today = datetime.utcnow().date().isoformat()
    
    total_employees = await db.users.count_documents({'role': UserRole.EMPLOYEE})
    active_today = await db.timeentries.count_documents({
        'date': today,
        'clock_out': None
    })
    pending_entries = await db.timeentries.count_documents({'status': TimesheetStatus.PENDING})
    pending_leaves = await db.leaves.count_documents({'status': LeaveStatus.PENDING})
    
    # Calculate billable hours this month
    now = datetime.utcnow()
    month_start = f"{now.year}-{now.month:02d}-01"
    entries_this_month = await db.timeentries.find({
        'date': {'$gte': month_start},
        'billable': True
    }).to_list(10000)
    
    billable_hours = 0
    for e in entries_this_month:
        hours, _ = calculate_duration(
            e.get('clock_in'),
            e.get('clock_out'),
            e.get('break_start'),
            e.get('break_end')
        )
        billable_hours += hours
    
    return {
        'total_employees': total_employees,
        'active_today': active_today,
        'pending_entries': pending_entries,
        'pending_leaves': pending_leaves,
        'billable_hours_month': round(billable_hours, 2)
    }

# ===================== REPORT ENDPOINTS =====================

@api_router.get("/reports/pdf")
async def generate_pdf_report(
    user_id: Optional[str] = None,
    month: Optional[int] = None,
    year: Optional[int] = None,
    user=Depends(get_current_user)
):
    target_user_id = user_id if user['role'] in [UserRole.MANAGER, UserRole.ADMIN] and user_id else str(user['_id'])
    target_user = await db.users.find_one({'_id': ObjectId(target_user_id)})
    
    if not target_user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    now = datetime.utcnow()
    target_month = month or now.month
    target_year = year or now.year
    
    month_start = f"{target_year}-{target_month:02d}-01"
    if target_month == 12:
        month_end = f"{target_year + 1}-01-01"
    else:
        month_end = f"{target_year}-{target_month + 1:02d}-01"
    
    entries = await db.timeentries.find({
        'user_id': target_user_id,
        'date': {'$gte': month_start, '$lt': month_end}
    }).sort('date', 1).to_list(100)
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    elements = []
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], alignment=1)
    elements.append(Paragraph(f"Rapport de temps - {target_month:02d}/{target_year}", title_style))
    elements.append(Spacer(1, 12))
    elements.append(Paragraph(f"Employé: {target_user['first_name']} {target_user['last_name']}", styles['Normal']))
    elements.append(Paragraph(f"Email: {target_user['email']}", styles['Normal']))
    elements.append(Spacer(1, 12))
    
    data = [['Date', 'Arrivée', 'Départ', 'Pause', 'Heures', 'Facturable', 'Statut']]
    total_hours = 0
    billable_hours = 0
    
    for e in entries:
        work_hours, break_hours = calculate_duration(
            e.get('clock_in'),
            e.get('clock_out'),
            e.get('break_start'),
            e.get('break_end')
        )
        total_hours += work_hours
        if e.get('billable', True):
            billable_hours += work_hours
        
        clock_in = e['clock_in'].strftime('%H:%M') if e.get('clock_in') else '-'
        clock_out = e['clock_out'].strftime('%H:%M') if e.get('clock_out') else '-'
        
        status_map = {'pending': 'En attente', 'approved': 'Approuvé', 'rejected': 'Refusé', 'draft': 'Brouillon'}
        
        data.append([
            e['date'],
            clock_in,
            clock_out,
            f"{break_hours:.1f}h",
            f"{work_hours:.1f}h",
            'Oui' if e.get('billable', True) else 'Non',
            status_map.get(e.get('status', 'pending'), 'En attente')
        ])
    
    data.append(['', '', '', '', '', '', ''])
    data.append(['', '', '', 'Total:', f"{total_hours:.1f}h", '', ''])
    data.append(['', '', '', 'Facturable:', f"{billable_hours:.1f}h", '', ''])
    
    table = Table(data, colWidths=[65, 50, 50, 45, 50, 55, 70])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -4), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('FONTNAME', (0, -2), (-1, -1), 'Helvetica-Bold'),
    ]))
    
    elements.append(table)
    elements.append(Spacer(1, 20))
    elements.append(Paragraph(f"Généré le {datetime.utcnow().strftime('%d/%m/%Y à %H:%M')}", styles['Normal']))
    
    doc.build(elements)
    buffer.seek(0)
    
    filename = f"rapport_{target_user['last_name']}_{target_month:02d}_{target_year}.pdf"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@api_router.get("/reports/excel")
async def generate_excel_report(
    user_id: Optional[str] = None,
    month: Optional[int] = None,
    year: Optional[int] = None,
    user=Depends(get_current_user)
):
    target_user_id = user_id if user['role'] in [UserRole.MANAGER, UserRole.ADMIN] and user_id else str(user['_id'])
    target_user = await db.users.find_one({'_id': ObjectId(target_user_id)})
    
    if not target_user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    now = datetime.utcnow()
    target_month = month or now.month
    target_year = year or now.year
    
    month_start = f"{target_year}-{target_month:02d}-01"
    if target_month == 12:
        month_end = f"{target_year + 1}-01-01"
    else:
        month_end = f"{target_year}-{target_month + 1:02d}-01"
    
    entries = await db.timeentries.find({
        'user_id': target_user_id,
        'date': {'$gte': month_start, '$lt': month_end}
    }).sort('date', 1).to_list(100)
    
    wb = Workbook()
    ws = wb.active
    ws.title = f"Rapport {target_month:02d}-{target_year}"
    
    ws.append(['Rapport de temps', '', '', '', '', '', ''])
    ws.append([f"Employé: {target_user['first_name']} {target_user['last_name']}", '', '', '', '', '', ''])
    ws.append([''])
    ws.append(['Date', 'Arrivée', 'Départ', 'Pause (h)', 'Heures', 'Facturable', 'Statut'])
    
    total_hours = 0
    billable_hours = 0
    
    for e in entries:
        work_hours, break_hours = calculate_duration(
            e.get('clock_in'),
            e.get('clock_out'),
            e.get('break_start'),
            e.get('break_end')
        )
        total_hours += work_hours
        if e.get('billable', True):
            billable_hours += work_hours
        
        clock_in = e['clock_in'].strftime('%H:%M') if e.get('clock_in') else '-'
        clock_out = e['clock_out'].strftime('%H:%M') if e.get('clock_out') else '-'
        status_map = {'pending': 'En attente', 'approved': 'Approuvé', 'rejected': 'Refusé'}
        
        ws.append([
            e['date'],
            clock_in,
            clock_out,
            round(break_hours, 2),
            round(work_hours, 2),
            'Oui' if e.get('billable', True) else 'Non',
            status_map.get(e.get('status', 'pending'), 'En attente')
        ])
    
    ws.append([''])
    ws.append(['', '', '', 'Total heures:', round(total_hours, 2), '', ''])
    ws.append(['', '', '', 'Heures facturables:', round(billable_hours, 2), '', ''])
    
    buffer = BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    
    filename = f"rapport_{target_user['last_name']}_{target_month:02d}_{target_year}.xlsx"
    
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# ===================== ROOT ENDPOINT =====================

@api_router.get("/")
async def root():
    return {
        "message": "TimeSheet SaaS API v2.0",
        "status": "online",
        "modules": [
            "users", "companies", "departments", "clients", 
            "projects", "activities", "timeentries", "timer",
            "leaves", "invoices", "notifications", "audit-logs", "reports"
        ]
    }

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
