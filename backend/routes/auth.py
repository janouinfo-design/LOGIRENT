from fastapi import APIRouter, Depends
from bson import ObjectId
from datetime import datetime
from config import db
from models.schemas import UserCreate, UserLogin
from utils.auth import hash_password, verify_password, create_token, get_current_user
from utils.helpers import create_audit_log

router = APIRouter()

@router.post("/auth/register")
async def register(user_data: UserCreate):
    existing = await db.users.find_one({'email': user_data.email})
    if existing:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Email deja utilise")
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
    await create_audit_log(user_id, "CREATE", "user", user_id, f"Nouveau compte cree: {user_data.email}")
    return {
        'token': create_token(user_id, user_data.role),
        'user': {
            'id': user_id, 'email': user_data.email,
            'first_name': user_data.first_name, 'last_name': user_data.last_name,
            'role': user_data.role, 'contract_hours': user_data.contract_hours
        }
    }

@router.post("/auth/login")
async def login(credentials: UserLogin):
    from fastapi import HTTPException
    user = await db.users.find_one({'email': credentials.email})
    if not user or not verify_password(credentials.password, user['password_hash']):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    user_id = str(user['_id'])
    await create_audit_log(user_id, "LOGIN", "user", user_id)
    return {
        'token': create_token(user_id, user['role']),
        'user': {
            'id': user_id, 'email': user['email'],
            'first_name': user['first_name'], 'last_name': user['last_name'],
            'role': user['role'], 'contract_hours': user['contract_hours']
        }
    }

@router.get("/auth/me")
async def get_me(user=Depends(get_current_user)):
    dept_name = None
    if user.get('department_id'):
        dept = await db.departments.find_one({'_id': ObjectId(user['department_id'])})
        dept_name = dept['name'] if dept else None
    return {
        'id': str(user['_id']), 'email': user['email'],
        'first_name': user['first_name'], 'last_name': user['last_name'],
        'role': user['role'], 'contract_hours': user['contract_hours'],
        'department_id': user.get('department_id'), 'department_name': dept_name,
        'phone': user.get('phone', '')
    }
