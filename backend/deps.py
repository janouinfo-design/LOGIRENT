from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime, timedelta
import jwt
import bcrypt
from database import db, JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRATION_HOURS
from models import UserProfile

security = HTTPBearer(auto_error=False)


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
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(credentials.credentials)
    user = await db.users.find_one({"id": payload['user_id']})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if user.get('role') != 'super_admin':
        raise HTTPException(status_code=403, detail="Accès réservé au super administrateur")
    return user


async def get_admin_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    return await get_agency_admin(credentials)
