from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from bson import ObjectId
from datetime import datetime
from config import db
from models.schemas import NotificationResponse
from utils.auth import get_current_user

router = APIRouter()

@router.get("/notifications", response_model=List[NotificationResponse])
async def get_notifications(unread_only: bool = False, user=Depends(get_current_user)):
    query = {'user_id': str(user['_id'])}
    if unread_only:
        query['read'] = False
    notifications = await db.notifications.find(query).sort('created_at', -1).to_list(100)
    return [NotificationResponse(id=str(n['_id']), user_id=n['user_id'], title=n['title'], message=n['message'], type=n.get('type', 'info'), read=n['read'], created_at=n['created_at']) for n in notifications]

@router.post("/notifications/{notif_id}/read")
async def mark_notification_read(notif_id: str, user=Depends(get_current_user)):
    await db.notifications.update_one({'_id': ObjectId(notif_id), 'user_id': str(user['_id'])}, {'$set': {'read': True}})
    return {"message": "Notification marquee comme lue"}

@router.put("/notifications/{notif_id}")
async def update_notification(notif_id: str, data: dict, user=Depends(get_current_user)):
    notif = await db.notifications.find_one({'_id': ObjectId(notif_id), 'user_id': str(user['_id'])})
    if not notif:
        raise HTTPException(status_code=404, detail="Notification non trouvee")
    update_fields = {}
    if 'title' in data:
        update_fields['title'] = data['title']
    if 'message' in data:
        update_fields['message'] = data['message']
    if 'type' in data:
        update_fields['type'] = data['type']
    if update_fields:
        await db.notifications.update_one({'_id': ObjectId(notif_id)}, {'$set': update_fields})
    return {"message": "Notification mise a jour"}

@router.delete("/notifications/{notif_id}")
async def delete_notification(notif_id: str, user=Depends(get_current_user)):
    result = await db.notifications.delete_one({'_id': ObjectId(notif_id), 'user_id': str(user['_id'])})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Notification non trouvee")
    return {"message": "Notification supprimee"}

@router.post("/notifications/read-all")
async def mark_all_notifications_read(user=Depends(get_current_user)):
    await db.notifications.update_many({'user_id': str(user['_id']), 'read': False}, {'$set': {'read': True}})
    return {"message": "Toutes les notifications marquees comme lues"}

@router.get("/notifications/count")
async def get_unread_count(user=Depends(get_current_user)):
    count = await db.notifications.count_documents({'user_id': str(user['_id']), 'read': False})
    return {'unread_count': count}
