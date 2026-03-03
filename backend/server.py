from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
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
import uuid
from datetime import datetime, timedelta, date
import bcrypt
import jwt
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from openpyxl import Workbook
from bson import ObjectId

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'timesheet_db')]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'timesheet_secret_key_2025')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

# Create the main app
app = FastAPI(title="TimeSheet API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ===================== MODELS =====================

class UserRole:
    EMPLOYEE = "employee"
    MANAGER = "manager"
    ADMIN = "admin"

class TimeEntryStatus:
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class AbsenceType:
    VACATION = "vacation"
    SICK = "sick"
    TRAINING = "training"
    HOLIDAY = "holiday"

# User Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    role: str = UserRole.EMPLOYEE
    contract_hours: float = 42.0  # Default Swiss standard

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
    created_at: datetime

class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    contract_hours: Optional[float] = None

# Project Models
class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    location: Optional[str] = ""

class ProjectResponse(BaseModel):
    id: str
    name: str
    description: str
    location: str
    created_at: datetime
    is_active: bool

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    is_active: Optional[bool] = None

# TimeEntry Models
class TimeEntryCreate(BaseModel):
    project_id: Optional[str] = None
    comment: Optional[str] = ""

class TimeEntryResponse(BaseModel):
    id: str
    user_id: str
    user_name: Optional[str] = None
    date: str
    clock_in: Optional[datetime] = None
    clock_out: Optional[datetime] = None
    break_start: Optional[datetime] = None
    break_end: Optional[datetime] = None
    project_id: Optional[str] = None
    project_name: Optional[str] = None
    comment: str
    status: str
    total_hours: float
    break_hours: float
    overtime_hours: float
    location: Optional[str] = None

class TimeEntryUpdate(BaseModel):
    clock_in: Optional[datetime] = None
    clock_out: Optional[datetime] = None
    break_start: Optional[datetime] = None
    break_end: Optional[datetime] = None
    project_id: Optional[str] = None
    comment: Optional[str] = None
    status: Optional[str] = None

# Absence Models
class AbsenceCreate(BaseModel):
    type: str
    start_date: str  # YYYY-MM-DD
    end_date: str    # YYYY-MM-DD
    comment: Optional[str] = ""

class AbsenceResponse(BaseModel):
    id: str
    user_id: str
    user_name: Optional[str] = None
    type: str
    start_date: str
    end_date: str
    comment: str
    status: str
    approved_by: Optional[str] = None
    created_at: datetime

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

def calculate_hours(clock_in: datetime, clock_out: datetime, break_start: datetime = None, break_end: datetime = None) -> tuple:
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

# ===================== AUTH ENDPOINTS =====================

@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    # Check if user exists
    existing = await db.users.find_one({'email': user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    
    # Create user
    user_doc = {
        'email': user_data.email,
        'password_hash': hash_password(user_data.password),
        'first_name': user_data.first_name,
        'last_name': user_data.last_name,
        'role': user_data.role,
        'contract_hours': user_data.contract_hours,
        'created_at': datetime.utcnow()
    }
    
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    
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
    return {
        'id': str(user['_id']),
        'email': user['email'],
        'first_name': user['first_name'],
        'last_name': user['last_name'],
        'role': user['role'],
        'contract_hours': user['contract_hours']
    }

# ===================== USER ENDPOINTS =====================

@api_router.get("/users", response_model=List[UserResponse])
async def get_users(user=Depends(get_manager_user)):
    users = await db.users.find().to_list(1000)
    return [
        UserResponse(
            id=str(u['_id']),
            email=u['email'],
            first_name=u['first_name'],
            last_name=u['last_name'],
            role=u['role'],
            contract_hours=u['contract_hours'],
            created_at=u['created_at']
        ) for u in users
    ]

@api_router.put("/users/{user_id}")
async def update_user(user_id: str, update_data: UserUpdate, user=Depends(get_current_user)):
    # Users can only update themselves, managers/admins can update anyone
    if str(user['_id']) != user_id and user['role'] not in [UserRole.MANAGER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Accès refusé")
    
    update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
    if update_dict:
        await db.users.update_one({'_id': ObjectId(user_id)}, {'$set': update_dict})
    
    updated_user = await db.users.find_one({'_id': ObjectId(user_id)})
    return {
        'id': str(updated_user['_id']),
        'email': updated_user['email'],
        'first_name': updated_user['first_name'],
        'last_name': updated_user['last_name'],
        'role': updated_user['role'],
        'contract_hours': updated_user['contract_hours']
    }

# ===================== PROJECT ENDPOINTS =====================

@api_router.post("/projects", response_model=ProjectResponse)
async def create_project(project_data: ProjectCreate, user=Depends(get_manager_user)):
    project_doc = {
        'name': project_data.name,
        'description': project_data.description or "",
        'location': project_data.location or "",
        'created_at': datetime.utcnow(),
        'is_active': True
    }
    result = await db.projects.insert_one(project_doc)
    project_doc['id'] = str(result.inserted_id)
    return ProjectResponse(**project_doc)

@api_router.get("/projects", response_model=List[ProjectResponse])
async def get_projects(user=Depends(get_current_user)):
    projects = await db.projects.find({'is_active': True}).to_list(1000)
    return [
        ProjectResponse(
            id=str(p['_id']),
            name=p['name'],
            description=p.get('description', ''),
            location=p.get('location', ''),
            created_at=p['created_at'],
            is_active=p.get('is_active', True)
        ) for p in projects
    ]

@api_router.put("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: str, update_data: ProjectUpdate, user=Depends(get_manager_user)):
    update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
    if update_dict:
        await db.projects.update_one({'_id': ObjectId(project_id)}, {'$set': update_dict})
    
    project = await db.projects.find_one({'_id': ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Projet non trouvé")
    
    return ProjectResponse(
        id=str(project['_id']),
        name=project['name'],
        description=project.get('description', ''),
        location=project.get('location', ''),
        created_at=project['created_at'],
        is_active=project.get('is_active', True)
    )

@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str, user=Depends(get_manager_user)):
    await db.projects.update_one({'_id': ObjectId(project_id)}, {'$set': {'is_active': False}})
    return {"message": "Projet désactivé"}

# ===================== TIME ENTRY ENDPOINTS =====================

@api_router.post("/timeentries/clock-in")
async def clock_in(data: TimeEntryCreate, user=Depends(get_current_user)):
    today = datetime.utcnow().date().isoformat()
    user_id = str(user['_id'])
    
    # Check if already clocked in today
    existing = await db.timeentries.find_one({
        'user_id': user_id,
        'date': today,
        'clock_out': None
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Déjà pointé aujourd'hui")
    
    entry_doc = {
        'user_id': user_id,
        'date': today,
        'clock_in': datetime.utcnow(),
        'clock_out': None,
        'break_start': None,
        'break_end': None,
        'project_id': data.project_id,
        'comment': data.comment or "",
        'status': TimeEntryStatus.PENDING
    }
    
    result = await db.timeentries.insert_one(entry_doc)
    entry_doc['id'] = str(result.inserted_id)
    
    return {
        'id': entry_doc['id'],
        'message': 'Pointage début enregistré',
        'clock_in': entry_doc['clock_in']
    }

@api_router.post("/timeentries/clock-out")
async def clock_out(data: TimeEntryCreate, user=Depends(get_current_user)):
    today = datetime.utcnow().date().isoformat()
    user_id = str(user['_id'])
    
    # Find today's open entry
    entry = await db.timeentries.find_one({
        'user_id': user_id,
        'date': today,
        'clock_out': None
    })
    
    if not entry:
        raise HTTPException(status_code=400, detail="Pas de pointage en cours")
    
    # End break if active
    if entry.get('break_start') and not entry.get('break_end'):
        await db.timeentries.update_one(
            {'_id': entry['_id']},
            {'$set': {'break_end': datetime.utcnow()}}
        )
        entry['break_end'] = datetime.utcnow()
    
    clock_out_time = datetime.utcnow()
    
    # Update entry
    update_data = {
        'clock_out': clock_out_time,
        'project_id': data.project_id or entry.get('project_id'),
        'comment': data.comment if data.comment else entry.get('comment', '')
    }
    
    await db.timeentries.update_one({'_id': entry['_id']}, {'$set': update_data})
    
    # Calculate hours
    work_hours, break_hours = calculate_hours(
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
    
    entry = await db.timeentries.find_one({
        'user_id': user_id,
        'date': today
    })
    
    if not entry:
        return {'active': False, 'entry': None}
    
    project_name = None
    if entry.get('project_id'):
        project = await db.projects.find_one({'_id': ObjectId(entry['project_id'])})
        project_name = project['name'] if project else None
    
    work_hours, break_hours = calculate_hours(
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
            'comment': entry.get('comment', ''),
            'status': entry.get('status', TimeEntryStatus.PENDING),
            'total_hours': work_hours,
            'break_hours': break_hours
        }
    }

@api_router.get("/timeentries")
async def get_time_entries(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user_id: Optional[str] = None,
    status: Optional[str] = None,
    user=Depends(get_current_user)
):
    query = {}
    
    # Non-managers can only see their own entries
    if user['role'] not in [UserRole.MANAGER, UserRole.ADMIN]:
        query['user_id'] = str(user['_id'])
    elif user_id:
        query['user_id'] = user_id
    
    if start_date:
        query['date'] = {'$gte': start_date}
    if end_date:
        query.setdefault('date', {})['$lte'] = end_date
    if status:
        query['status'] = status
    
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
        
        user_doc = await db.users.find_one({'_id': ObjectId(e['user_id'])})
        user_name = f"{user_doc['first_name']} {user_doc['last_name']}" if user_doc else "Inconnu"
        
        work_hours, break_hours = calculate_hours(
            e.get('clock_in'),
            e.get('clock_out'),
            e.get('break_start'),
            e.get('break_end')
        )
        
        # Calculate overtime (based on 8.4h/day for 42h/week)
        daily_hours = user_doc.get('contract_hours', 42) / 5 if user_doc else 8.4
        overtime = max(0, work_hours - daily_hours)
        
        result.append(TimeEntryResponse(
            id=str(e['_id']),
            user_id=e['user_id'],
            user_name=user_name,
            date=e['date'],
            clock_in=e.get('clock_in'),
            clock_out=e.get('clock_out'),
            break_start=e.get('break_start'),
            break_end=e.get('break_end'),
            project_id=e.get('project_id'),
            project_name=project_name,
            comment=e.get('comment', ''),
            status=e.get('status', TimeEntryStatus.PENDING),
            total_hours=work_hours,
            break_hours=break_hours,
            overtime_hours=overtime
        ))
    
    return result

@api_router.put("/timeentries/{entry_id}")
async def update_time_entry(entry_id: str, update_data: TimeEntryUpdate, user=Depends(get_current_user)):
    entry = await db.timeentries.find_one({'_id': ObjectId(entry_id)})
    if not entry:
        raise HTTPException(status_code=404, detail="Entrée non trouvée")
    
    # Check permissions
    if entry['user_id'] != str(user['_id']) and user['role'] not in [UserRole.MANAGER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Accès refusé")
    
    # Only managers can change status
    if update_data.status and user['role'] not in [UserRole.MANAGER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Seuls les managers peuvent changer le statut")
    
    update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
    if update_dict:
        await db.timeentries.update_one({'_id': ObjectId(entry_id)}, {'$set': update_dict})
    
    return {"message": "Entrée mise à jour"}

@api_router.post("/timeentries/{entry_id}/approve")
async def approve_entry(entry_id: str, user=Depends(get_manager_user)):
    await db.timeentries.update_one(
        {'_id': ObjectId(entry_id)},
        {'$set': {'status': TimeEntryStatus.APPROVED, 'approved_by': str(user['_id'])}}
    )
    return {"message": "Entrée approuvée"}

@api_router.post("/timeentries/{entry_id}/reject")
async def reject_entry(entry_id: str, user=Depends(get_manager_user)):
    await db.timeentries.update_one(
        {'_id': ObjectId(entry_id)},
        {'$set': {'status': TimeEntryStatus.REJECTED, 'approved_by': str(user['_id'])}}
    )
    return {"message": "Entrée refusée"}

# ===================== ABSENCE ENDPOINTS =====================

@api_router.post("/absences", response_model=AbsenceResponse)
async def create_absence(absence_data: AbsenceCreate, user=Depends(get_current_user)):
    absence_doc = {
        'user_id': str(user['_id']),
        'type': absence_data.type,
        'start_date': absence_data.start_date,
        'end_date': absence_data.end_date,
        'comment': absence_data.comment or "",
        'status': TimeEntryStatus.PENDING,
        'approved_by': None,
        'created_at': datetime.utcnow()
    }
    
    result = await db.absences.insert_one(absence_doc)
    
    return AbsenceResponse(
        id=str(result.inserted_id),
        user_id=absence_doc['user_id'],
        type=absence_doc['type'],
        start_date=absence_doc['start_date'],
        end_date=absence_doc['end_date'],
        comment=absence_doc['comment'],
        status=absence_doc['status'],
        created_at=absence_doc['created_at']
    )

@api_router.get("/absences", response_model=List[AbsenceResponse])
async def get_absences(
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
    
    absences = await db.absences.find(query).sort('start_date', -1).to_list(1000)
    
    result = []
    for a in absences:
        user_doc = await db.users.find_one({'_id': ObjectId(a['user_id'])})
        user_name = f"{user_doc['first_name']} {user_doc['last_name']}" if user_doc else "Inconnu"
        
        result.append(AbsenceResponse(
            id=str(a['_id']),
            user_id=a['user_id'],
            user_name=user_name,
            type=a['type'],
            start_date=a['start_date'],
            end_date=a['end_date'],
            comment=a.get('comment', ''),
            status=a['status'],
            approved_by=a.get('approved_by'),
            created_at=a['created_at']
        ))
    
    return result

@api_router.post("/absences/{absence_id}/approve")
async def approve_absence(absence_id: str, user=Depends(get_manager_user)):
    await db.absences.update_one(
        {'_id': ObjectId(absence_id)},
        {'$set': {'status': TimeEntryStatus.APPROVED, 'approved_by': str(user['_id'])}}
    )
    return {"message": "Absence approuvée"}

@api_router.post("/absences/{absence_id}/reject")
async def reject_absence(absence_id: str, user=Depends(get_manager_user)):
    await db.absences.update_one(
        {'_id': ObjectId(absence_id)},
        {'$set': {'status': TimeEntryStatus.REJECTED, 'approved_by': str(user['_id'])}}
    )
    return {"message": "Absence refusée"}

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
    total_overtime = 0
    daily_hours = user.get('contract_hours', 42) / 5
    
    for e in entries:
        work_hours, _ = calculate_hours(
            e.get('clock_in'),
            e.get('clock_out'),
            e.get('break_start'),
            e.get('break_end')
        )
        total_hours += work_hours
        total_overtime += max(0, work_hours - daily_hours)
    
    return {
        'week_start': week_start.isoformat(),
        'total_hours': round(total_hours, 2),
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
    
    # Build date range
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
    total_overtime = 0
    daily_hours = user.get('contract_hours', 42) / 5
    
    for e in entries:
        work_hours, _ = calculate_hours(
            e.get('clock_in'),
            e.get('clock_out'),
            e.get('break_start'),
            e.get('break_end')
        )
        total_hours += work_hours
        total_overtime += max(0, work_hours - daily_hours)
    
    return {
        'month': target_month,
        'year': target_year,
        'total_hours': round(total_hours, 2),
        'overtime_hours': round(total_overtime, 2),
        'contract_hours': user.get('contract_hours', 42),
        'days_worked': len(entries)
    }

@api_router.get("/stats/dashboard")
async def get_dashboard_stats(user=Depends(get_manager_user)):
    today = datetime.utcnow().date().isoformat()
    
    # Count employees
    total_employees = await db.users.count_documents({'role': UserRole.EMPLOYEE})
    
    # Count active today
    active_today = await db.timeentries.count_documents({
        'date': today,
        'clock_out': None
    })
    
    # Count pending entries
    pending_entries = await db.timeentries.count_documents({'status': TimeEntryStatus.PENDING})
    
    # Count pending absences
    pending_absences = await db.absences.count_documents({'status': TimeEntryStatus.PENDING})
    
    return {
        'total_employees': total_employees,
        'active_today': active_today,
        'pending_entries': pending_entries,
        'pending_absences': pending_absences
    }

# ===================== REPORT ENDPOINTS =====================

@api_router.get("/reports/pdf")
async def generate_pdf_report(
    user_id: Optional[str] = None,
    month: Optional[int] = None,
    year: Optional[int] = None,
    user=Depends(get_current_user)
):
    # Determine target user
    target_user_id = user_id if user['role'] in [UserRole.MANAGER, UserRole.ADMIN] and user_id else str(user['_id'])
    target_user = await db.users.find_one({'_id': ObjectId(target_user_id)})
    
    if not target_user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    now = datetime.utcnow()
    target_month = month or now.month
    target_year = year or now.year
    
    # Build date range
    month_start = f"{target_year}-{target_month:02d}-01"
    if target_month == 12:
        month_end = f"{target_year + 1}-01-01"
    else:
        month_end = f"{target_year}-{target_month + 1:02d}-01"
    
    entries = await db.timeentries.find({
        'user_id': target_user_id,
        'date': {'$gte': month_start, '$lt': month_end}
    }).sort('date', 1).to_list(100)
    
    # Generate PDF
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    elements = []
    styles = getSampleStyleSheet()
    
    # Title
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], alignment=1)
    elements.append(Paragraph(f"Rapport de temps - {target_month:02d}/{target_year}", title_style))
    elements.append(Spacer(1, 12))
    
    # Employee info
    elements.append(Paragraph(f"Employé: {target_user['first_name']} {target_user['last_name']}", styles['Normal']))
    elements.append(Paragraph(f"Email: {target_user['email']}", styles['Normal']))
    elements.append(Spacer(1, 12))
    
    # Table data
    data = [['Date', 'Arrivée', 'Départ', 'Pause', 'Heures', 'Statut']]
    total_hours = 0
    total_overtime = 0
    daily_hours = target_user.get('contract_hours', 42) / 5
    
    for e in entries:
        work_hours, break_hours = calculate_hours(
            e.get('clock_in'),
            e.get('clock_out'),
            e.get('break_start'),
            e.get('break_end')
        )
        total_hours += work_hours
        total_overtime += max(0, work_hours - daily_hours)
        
        clock_in = e['clock_in'].strftime('%H:%M') if e.get('clock_in') else '-'
        clock_out = e['clock_out'].strftime('%H:%M') if e.get('clock_out') else '-'
        
        status_map = {'pending': 'En attente', 'approved': 'Approuvé', 'rejected': 'Refusé'}
        
        data.append([
            e['date'],
            clock_in,
            clock_out,
            f"{break_hours:.1f}h",
            f"{work_hours:.1f}h",
            status_map.get(e.get('status', 'pending'), 'En attente')
        ])
    
    # Add totals
    data.append(['', '', '', 'Total:', f"{total_hours:.1f}h", ''])
    data.append(['', '', '', 'Heures sup:', f"{total_overtime:.1f}h", ''])
    
    # Create table
    table = Table(data, colWidths=[80, 60, 60, 50, 60, 80])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -3), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('FONTNAME', (0, -2), (-1, -1), 'Helvetica-Bold'),
    ]))
    
    elements.append(table)
    elements.append(Spacer(1, 20))
    
    # Footer
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
    
    # Create workbook
    wb = Workbook()
    ws = wb.active
    ws.title = f"Rapport {target_month:02d}-{target_year}"
    
    # Headers
    ws.append(['Rapport de temps', '', '', '', '', ''])
    ws.append([f"Employé: {target_user['first_name']} {target_user['last_name']}", '', '', '', '', ''])
    ws.append([''])
    ws.append(['Date', 'Arrivée', 'Départ', 'Pause (h)', 'Heures travaillées', 'Statut'])
    
    total_hours = 0
    daily_hours = target_user.get('contract_hours', 42) / 5
    
    for e in entries:
        work_hours, break_hours = calculate_hours(
            e.get('clock_in'),
            e.get('clock_out'),
            e.get('break_start'),
            e.get('break_end')
        )
        total_hours += work_hours
        
        clock_in = e['clock_in'].strftime('%H:%M') if e.get('clock_in') else '-'
        clock_out = e['clock_out'].strftime('%H:%M') if e.get('clock_out') else '-'
        status_map = {'pending': 'En attente', 'approved': 'Approuvé', 'rejected': 'Refusé'}
        
        ws.append([
            e['date'],
            clock_in,
            clock_out,
            round(break_hours, 2),
            round(work_hours, 2),
            status_map.get(e.get('status', 'pending'), 'En attente')
        ])
    
    ws.append([''])
    ws.append(['', '', '', 'Total heures:', round(total_hours, 2), ''])
    
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
    return {"message": "TimeSheet API v1.0", "status": "online"}

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
