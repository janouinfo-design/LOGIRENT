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


async def _store_client_document(client_id: str, image_data: str, doc_type: str) -> str:
    """Store a client document in object storage and create a document record."""
    try:
        from utils.storage import put_object, get_public_url

        raw = image_data
        if ',' in raw:
            raw = raw.split(',', 1)[1]
        content = base64.b64decode(raw)

        path = f"logirent/documents/{client_id}/{doc_type}_{uuid.uuid4()}.jpg"
        put_object(path, content, "image/jpeg")
        url = get_public_url(path)

        doc_record = {
            "id": str(uuid.uuid4()),
            "client_id": client_id,
            "uploader_id": client_id,
            "doc_type": doc_type,
            "filename": f"{doc_type}.jpg",
            "storage_path": path,
            "url": url,
            "status": "pending",
            "extracted_data": {},
            "validated_by": None,
            "validated_at": None,
            "created_at": datetime.utcnow(),
        }
        await db.documents.insert_one(doc_record)
        return url
    except Exception as e:
        logger.error(f"Failed to store document in object storage: {e}")
        return ""


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
    user = await db.users.find_one({"email": request.email.lower()})
    if user:
        reset_token = str(uuid.uuid4())
        await db.password_resets.insert_one({
            "user_id": user['id'],
            "email": user['email'],
            "token": reset_token,
            "created_at": datetime.utcnow(),
            "used": False
        })
        try:
            from utils.email import send_email
            reset_html = f"""
            <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px;">
                <h2 style="color:#7C3AED;">LogiRent - Réinitialisation du mot de passe</h2>
                <p>Bonjour {user.get('name','')},</p>
                <p>Voici votre code de réinitialisation :</p>
                <div style="background:#F3EEFF;padding:16px;border-radius:8px;text-align:center;margin:20px 0;">
                    <span style="font-size:24px;font-weight:bold;color:#7C3AED;letter-spacing:2px;">{reset_token[:8].upper()}</span>
                </div>
                <p>Ce code expire dans 30 minutes.</p>
                <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
            </div>
            """
            await send_email(user['email'], "LogiRent - Réinitialisation du mot de passe", reset_html)
        except Exception as e:
            logger.error(f"Failed to send reset email: {e}")
    return {"message": "Si l'email existe, un code de réinitialisation a été envoyé"}


@router.post("/auth/reset-password")
async def reset_password(data: dict):
    code = data.get("code", "").strip().upper()
    new_password = data.get("new_password", "")
    if not code or not new_password:
        raise HTTPException(status_code=400, detail="Code et nouveau mot de passe requis")
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Le mot de passe doit contenir au moins 6 caractères")

    reset = await db.password_resets.find_one({"used": False})
    found = None
    async for r in db.password_resets.find({"used": False}).sort("created_at", -1).limit(50):
        if r['token'][:8].upper() == code:
            elapsed = (datetime.utcnow() - r['created_at']).total_seconds()
            if elapsed < 1800:
                found = r
                break

    if not found:
        raise HTTPException(status_code=400, detail="Code invalide ou expiré")

    await db.users.update_one(
        {"id": found['user_id']},
        {"$set": {"password_hash": hash_password(new_password)}}
    )
    await db.password_resets.update_one({"token": found['token']}, {"$set": {"used": True}})
    return {"message": "Mot de passe réinitialisé avec succès"}


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

    if not verification.get("is_valid", True) and verification.get("confidence", 0) > 60:
        return {"message": "Document rejeté", "verification": verification, "rejected": True}

    # Store in object storage + documents collection
    doc_url = await _store_client_document(user['id'], body.image_data, "license_front")

    await db.users.update_one(
        {"id": user['id']},
        {"$set": {
            "license_photo": doc_url or body.image_data,
            "license_verification": {
                "is_valid": verification.get("is_valid", True),
                "confidence": verification.get("confidence", 0),
                "reason": verification.get("reason", ""),
                "face": verification.get("face", "recto"),
                "is_blurry": verification.get("is_blurry", False),
                "is_expired": verification.get("is_expired", False),
                "quality_score": verification.get("quality_score", 0),
                "warnings": verification.get("warnings", []),
                "rejection_reasons": verification.get("rejection_reasons", []),
                "verified_at": datetime.utcnow().isoformat(),
            }
        }}
    )
    return {"message": "License uploaded successfully", "license_photo": doc_url or body.image_data, "verification": verification}


@router.post("/auth/upload-license-back-b64")
async def upload_license_back_b64(body: Base64Upload, user: dict = Depends(get_current_user)):
    verification = await verify_document_with_ai(body.image_data, "license")

    if not verification.get("is_valid", True) and verification.get("confidence", 0) > 60:
        return {"message": "Document rejeté", "verification": verification, "rejected": True}

    doc_url = await _store_client_document(user['id'], body.image_data, "license_back")

    await db.users.update_one(
        {"id": user['id']},
        {"$set": {"license_photo_back": doc_url or body.image_data}}
    )
    return {"message": "License back uploaded", "license_photo_back": doc_url or body.image_data, "verification": verification}


@router.post("/auth/upload-id-b64")
async def upload_id_b64(body: Base64Upload, user: dict = Depends(get_current_user)):
    verification = await verify_document_with_ai(body.image_data, "id")

    if not verification.get("is_valid", True) and verification.get("confidence", 0) > 60:
        return {"message": "Document rejeté", "verification": verification, "rejected": True}

    doc_url = await _store_client_document(user['id'], body.image_data, "id_card_front")

    await db.users.update_one(
        {"id": user['id']},
        {"$set": {
            "id_photo": doc_url or body.image_data,
            "id_verification": {
                "is_valid": verification.get("is_valid", True),
                "confidence": verification.get("confidence", 0),
                "reason": verification.get("reason", ""),
                "face": verification.get("face", "recto"),
                "is_blurry": verification.get("is_blurry", False),
                "is_expired": verification.get("is_expired", False),
                "quality_score": verification.get("quality_score", 0),
                "warnings": verification.get("warnings", []),
                "rejection_reasons": verification.get("rejection_reasons", []),
                "verified_at": datetime.utcnow().isoformat(),
            }
        }}
    )
    return {"message": "ID uploaded successfully", "id_photo": doc_url or body.image_data, "verification": verification}


@router.post("/auth/upload-id-back-b64")
async def upload_id_back_b64(body: Base64Upload, user: dict = Depends(get_current_user)):
    verification = await verify_document_with_ai(body.image_data, "id")

    if not verification.get("is_valid", True) and verification.get("confidence", 0) > 60:
        return {"message": "Document rejeté", "verification": verification, "rejected": True}

    doc_url = await _store_client_document(user['id'], body.image_data, "id_card_back")

    await db.users.update_one(
        {"id": user['id']},
        {"$set": {"id_photo_back": doc_url or body.image_data}}
    )
    return {"message": "ID back uploaded", "id_photo_back": doc_url or body.image_data, "verification": verification}


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
