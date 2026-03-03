from fastapi import APIRouter, HTTPException, Depends, File, UploadFile
from datetime import datetime
import uuid
import base64
import logging

from database import db
from models import (
    UserCreate, AdminRegister, UserLogin, UserProfile, UserUpdate,
    ForgotPasswordRequest, TokenResponse, Base64Upload, Agency
)
from deps import (
    get_current_user, build_user_profile, create_token,
    hash_password, verify_password
)
from utils.helpers import verify_document_with_ai

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

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


@router.post("/auth/register-admin", response_model=TokenResponse)
async def register_admin(data: AdminRegister):
    existing = await db.users.find_one({"email": data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    agency = Agency(name=data.agency_name)
    await db.agencies.insert_one(agency.dict())

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


@router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email.lower()})
    if not user or not verify_password(credentials.password, user['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if user.get('is_active') is False:
        raise HTTPException(status_code=403, detail="Votre compte a été désactivé. Contactez l'administrateur.")

    role = user.get('role', 'client')
    token = create_token(user['id'], user['email'], role)
    profile = await build_user_profile(user)

    return TokenResponse(access_token=token, user=profile)


@router.post("/auth/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    return {"message": "If the email exists, a password reset link will be sent"}


@router.get("/auth/profile", response_model=UserProfile)
async def get_profile(user: dict = Depends(get_current_user)):
    return await build_user_profile(user)


@router.put("/auth/profile", response_model=UserProfile)
async def update_profile(update_data: UserUpdate, user: dict = Depends(get_current_user)):
    update_dict = {k: v for k, v in update_data.dict().items() if v is not None}

    if update_dict:
        await db.users.update_one({"id": user['id']}, {"$set": update_dict})

    updated_user = await db.users.find_one({"id": user['id']})
    return await build_user_profile(updated_user)


@router.post("/auth/upload-license")
async def upload_license(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    content = await file.read()
    base64_image = base64.b64encode(content).decode('utf-8')
    content_type = file.content_type or 'image/jpeg'
    data_uri = f"data:{content_type};base64,{base64_image}"

    await db.users.update_one({"id": user['id']}, {"$set": {"license_photo": data_uri}})
    return {"message": "License uploaded successfully", "license_photo": data_uri}


@router.post("/auth/upload-license-b64")
async def upload_license_b64(body: Base64Upload, user: dict = Depends(get_current_user)):
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
    return {"message": "License uploaded successfully", "license_photo": body.image_data, "verification": verification}


@router.post("/auth/upload-id-b64")
async def upload_id_b64(body: Base64Upload, user: dict = Depends(get_current_user)):
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
    return {"message": "ID uploaded successfully", "id_photo": body.image_data, "verification": verification}


@router.post("/auth/upload-id")
async def upload_id(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    content = await file.read()
    base64_image = base64.b64encode(content).decode('utf-8')
    content_type = file.content_type or 'image/jpeg'
    data_uri = f"data:{content_type};base64,{base64_image}"

    await db.users.update_one({"id": user['id']}, {"$set": {"id_photo": data_uri}})
    return {"message": "ID uploaded successfully", "id_photo": data_uri}



@router.post("/admin/impersonate/{user_id}")
async def impersonate_user(user_id: str, user: dict = Depends(get_current_user)):
    """Super admin can login as any user without password"""
    if user.get('role') != 'super_admin':
        raise HTTPException(status_code=403, detail="Super admin only")
    target = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    token = create_token(target['id'], target['email'], target.get('role', 'client'))
    profile = await build_user_profile(target)
    return {"access_token": token, "user": profile.dict()}
