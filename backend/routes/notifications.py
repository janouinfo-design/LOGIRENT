from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from database import db
from deps import get_current_user

router = APIRouter()


class PushTokenRegister(BaseModel):
    token: str
    device_type: Optional[str] = "unknown"


@router.post("/notifications/register-token")
async def register_push_token(data: PushTokenRegister, user: dict = Depends(get_current_user)):
    existing = await db.push_tokens.find_one({"token": data.token})
    if existing:
        await db.push_tokens.update_one(
            {"token": data.token},
            {"$set": {"user_id": user['id'], "device_type": data.device_type, "updated_at": datetime.utcnow()}}
        )
    else:
        await db.push_tokens.insert_one({
            "user_id": user['id'],
            "token": data.token,
            "device_type": data.device_type,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        })
    return {"message": "Token enregistré"}


@router.delete("/notifications/unregister-token")
async def unregister_push_token(data: PushTokenRegister, user: dict = Depends(get_current_user)):
    await db.push_tokens.delete_one({"token": data.token, "user_id": user['id']})
    return {"message": "Token supprimé"}


@router.get("/notifications")
async def get_notifications(limit: int = 50, user: dict = Depends(get_current_user)):
    notifs = await db.notifications.find(
        {"user_id": user['id']}, {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    return {"notifications": notifs}


@router.get("/notifications/unread-count")
async def get_unread_count(user: dict = Depends(get_current_user)):
    count = await db.notifications.count_documents({"user_id": user['id'], "read": False})
    return {"count": count}


@router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, user: dict = Depends(get_current_user)):
    await db.notifications.update_one(
        {"id": notification_id, "user_id": user['id']},
        {"$set": {"read": True}}
    )
    return {"message": "Notification marquée comme lue"}


@router.put("/notifications/read-all")
async def mark_all_notifications_read(user: dict = Depends(get_current_user)):
    await db.notifications.update_many(
        {"user_id": user['id'], "read": False},
        {"$set": {"read": True}}
    )
    return {"message": "Toutes les notifications marquées comme lues"}


@router.delete("/notifications/{notification_id}")
async def delete_notification(notification_id: str, user: dict = Depends(get_current_user)):
    await db.notifications.delete_one({"id": notification_id, "user_id": user['id']})
    return {"message": "Notification supprimée"}


@router.delete("/notifications/clear-all")
async def clear_all_notifications(user: dict = Depends(get_current_user)):
    await db.notifications.delete_many({"user_id": user['id']})
    return {"message": "Toutes les notifications supprimées"}
