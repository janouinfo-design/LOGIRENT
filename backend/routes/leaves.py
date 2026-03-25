from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from bson import ObjectId
from datetime import datetime
from config import db
from models.schemas import LeaveCreate, LeaveResponse
from models.enums import UserRole, LeaveStatus
from utils.auth import get_current_user, get_manager_user
from utils.helpers import create_notification, create_audit_log

router = APIRouter()

@router.post("/leaves", response_model=LeaveResponse)
async def create_leave(data: LeaveCreate, user=Depends(get_current_user)):
    leave_doc = {
        'user_id': str(user['_id']), 'type': data.type,
        'start_date': data.start_date, 'end_date': data.end_date,
        'reason': data.reason or "", 'status': LeaveStatus.PENDING,
        'approved_by': None, 'approved_at': None, 'created_at': datetime.utcnow()
    }
    result = await db.leaves.insert_one(leave_doc)
    managers = await db.users.find({'role': {'$in': [UserRole.MANAGER, UserRole.ADMIN]}}).to_list(100)
    for manager in managers:
        await create_notification(str(manager['_id']), "Nouvelle demande d'absence", f"{user['first_name']} {user['last_name']} a demande une absence", "info")
    return LeaveResponse(id=str(result.inserted_id), user_id=leave_doc['user_id'], type=leave_doc['type'], start_date=leave_doc['start_date'], end_date=leave_doc['end_date'], reason=leave_doc['reason'], status=leave_doc['status'], created_at=leave_doc['created_at'])

@router.get("/leaves", response_model=List[LeaveResponse])
async def get_leaves(user_id: Optional[str] = None, status: Optional[str] = None, user=Depends(get_current_user)):
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
            id=str(l['_id']), user_id=l['user_id'], user_name=user_name,
            type=l['type'], start_date=l['start_date'], end_date=l['end_date'],
            reason=l.get('reason', ''), status=l['status'],
            approved_by=l.get('approved_by'), approved_at=l.get('approved_at'),
            created_at=l['created_at']
        ))
    return result

@router.put("/leaves/{leave_id}")
async def update_leave(leave_id: str, data: LeaveCreate, user=Depends(get_current_user)):
    leave = await db.leaves.find_one({'_id': ObjectId(leave_id)})
    if not leave:
        raise HTTPException(status_code=404, detail="Absence non trouvee")
    if leave['user_id'] != str(user['_id']) and user['role'] not in [UserRole.MANAGER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Acces refuse")
    if leave['status'] != 'pending' and user['role'] not in [UserRole.MANAGER, UserRole.ADMIN]:
        raise HTTPException(status_code=400, detail="Impossible de modifier une absence deja traitee")
    update_dict = {'type': data.type, 'start_date': data.start_date, 'end_date': data.end_date, 'reason': data.reason or ''}
    await db.leaves.update_one({'_id': ObjectId(leave_id)}, {'$set': update_dict})
    await create_audit_log(str(user['_id']), "UPDATE", "leave", leave_id)
    return {"message": "Absence mise a jour"}

@router.delete("/leaves/{leave_id}")
async def delete_leave(leave_id: str, user=Depends(get_current_user)):
    leave = await db.leaves.find_one({'_id': ObjectId(leave_id)})
    if not leave:
        raise HTTPException(status_code=404, detail="Absence non trouvee")
    if leave['user_id'] != str(user['_id']) and user['role'] not in [UserRole.MANAGER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Acces refuse")
    await db.leaves.delete_one({'_id': ObjectId(leave_id)})
    await create_audit_log(str(user['_id']), "DELETE", "leave", leave_id)
    return {"message": "Absence supprimee"}

@router.post("/leaves/{leave_id}/approve")
async def approve_leave(leave_id: str, user=Depends(get_manager_user)):
    await db.leaves.update_one({'_id': ObjectId(leave_id)}, {'$set': {'status': LeaveStatus.APPROVED, 'approved_by': str(user['_id']), 'approved_at': datetime.utcnow()}})
    leave = await db.leaves.find_one({'_id': ObjectId(leave_id)})
    if leave:
        await create_notification(leave['user_id'], "Absence approuvee", "Votre demande d'absence a ete approuvee", "success")
    await create_audit_log(str(user['_id']), "APPROVE", "leave", leave_id)
    return {"message": "Absence approuvee"}

@router.post("/leaves/{leave_id}/reject")
async def reject_leave(leave_id: str, user=Depends(get_manager_user)):
    await db.leaves.update_one({'_id': ObjectId(leave_id)}, {'$set': {'status': LeaveStatus.REJECTED, 'approved_by': str(user['_id']), 'approved_at': datetime.utcnow()}})
    leave = await db.leaves.find_one({'_id': ObjectId(leave_id)})
    if leave:
        await create_notification(leave['user_id'], "Absence refusee", "Votre demande d'absence a ete refusee", "error")
    await create_audit_log(str(user['_id']), "REJECT", "leave", leave_id)
    return {"message": "Absence refusee"}
