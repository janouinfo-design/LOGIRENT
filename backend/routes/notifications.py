from fastapi import APIRouter, Depends
from database import db
from deps import get_current_user

router = APIRouter()


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
