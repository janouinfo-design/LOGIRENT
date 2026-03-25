from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, List
from bson import ObjectId
from datetime import datetime
from config import db
from models.enums import UserRole, LeaveStatus
from utils.auth import get_current_user, get_manager_user

router = APIRouter()

# ---- Directory ----
@router.get("/directory")
async def get_directory(user=Depends(get_current_user)):
    users = await db.users.find().to_list(1000)
    today = datetime.utcnow().date().isoformat()
    result = []
    for u in users:
        uid = str(u['_id'])
        dept_name = None
        if u.get('department_id'):
            dept = await db.departments.find_one({'_id': ObjectId(u['department_id'])})
            dept_name = dept['name'] if dept else None
        active_entry = await db.timeentries.find_one({'user_id': uid, 'date': today, 'clock_out': None})
        is_active = active_entry is not None
        work_location = active_entry.get('work_location', 'office') if active_entry else None
        on_leave = await db.leaves.find_one({'user_id': uid, 'status': LeaveStatus.APPROVED, 'start_date': {'$lte': today}, 'end_date': {'$gte': today}})
        status = 'absent'
        if on_leave:
            status = on_leave['type']
        elif is_active:
            status = work_location or 'office'
        result.append({
            'id': uid, 'first_name': u['first_name'], 'last_name': u['last_name'],
            'email': u['email'], 'role': u['role'], 'phone': u.get('phone', ''),
            'department': dept_name, 'status': status, 'work_location': work_location
        })
    return result

# ---- Messaging ----
@router.post("/messages/conversations")
async def create_conversation(participants: List[str], name: Optional[str] = None, user=Depends(get_current_user)):
    uid = str(user['_id'])
    if uid not in participants:
        participants.append(uid)
    conv = {'participants': participants, 'name': name or '', 'created_by': uid, 'created_at': datetime.utcnow(), 'last_message_at': datetime.utcnow()}
    result = await db.conversations.insert_one(conv)
    return {'id': str(result.inserted_id), 'message': 'Conversation creee'}

@router.get("/messages/conversations")
async def get_conversations(user=Depends(get_current_user)):
    uid = str(user['_id'])
    convs = await db.conversations.find({'participants': uid}).sort('last_message_at', -1).to_list(100)
    result = []
    for c in convs:
        parts = []
        for pid in c.get('participants', []):
            try:
                u = await db.users.find_one({'_id': ObjectId(pid)})
                if u:
                    parts.append({'id': str(u['_id']), 'name': f"{u['first_name']} {u['last_name']}"})
            except:
                pass
        last_msg = await db.messages.find_one({'conversation_id': str(c['_id'])}, sort=[('created_at', -1)])
        result.append({
            'id': str(c['_id']), 'name': c.get('name', ''), 'participants': parts,
            'last_message': last_msg.get('content', '') if last_msg else '',
            'last_message_at': c.get('last_message_at', c['created_at']).isoformat() if isinstance(c.get('last_message_at', c['created_at']), datetime) else str(c.get('last_message_at', '')),
            'unread': await db.messages.count_documents({'conversation_id': str(c['_id']), 'read_by': {'$nin': [uid]}})
        })
    return result

@router.post("/messages/send")
async def send_message(conversation_id: str, content: str, user=Depends(get_current_user)):
    uid = str(user['_id'])
    msg = {'conversation_id': conversation_id, 'sender_id': uid, 'content': content, 'read_by': [uid], 'created_at': datetime.utcnow()}
    result = await db.messages.insert_one(msg)
    await db.conversations.update_one({'_id': ObjectId(conversation_id)}, {'$set': {'last_message_at': datetime.utcnow()}})
    return {'id': str(result.inserted_id), 'message': 'Message envoye'}

@router.get("/messages/{conversation_id}")
async def get_messages(conversation_id: str, user=Depends(get_current_user)):
    uid = str(user['_id'])
    msgs = await db.messages.find({'conversation_id': conversation_id}).sort('created_at', 1).to_list(500)
    await db.messages.update_many({'conversation_id': conversation_id, 'read_by': {'$nin': [uid]}}, {'$push': {'read_by': uid}})
    result = []
    for m in msgs:
        sender = await db.users.find_one({'_id': ObjectId(m['sender_id'])})
        result.append({
            'id': str(m['_id']), 'sender_id': m['sender_id'],
            'sender_name': f"{sender['first_name']} {sender['last_name']}" if sender else 'Inconnu',
            'content': m['content'], 'is_mine': m['sender_id'] == uid,
            'created_at': m['created_at'].isoformat() if isinstance(m['created_at'], datetime) else str(m['created_at'])
        })
    return result

# ---- HR Documents ----
@router.post("/documents")
async def create_document(title: str, category: str, content: str = "", target_user_id: Optional[str] = None, user=Depends(get_current_user)):
    uid = str(user['_id'])
    doc = {'title': title, 'category': category, 'content': content, 'user_id': target_user_id or uid, 'created_by': uid, 'created_at': datetime.utcnow(), 'updated_at': datetime.utcnow()}
    result = await db.hr_documents.insert_one(doc)
    return {'id': str(result.inserted_id), 'message': 'Document cree'}

@router.get("/documents")
async def get_documents(target_user_id: Optional[str] = None, category: Optional[str] = None, user=Depends(get_current_user)):
    uid = str(user['_id'])
    query = {}
    if user['role'] in [UserRole.MANAGER, UserRole.ADMIN] and target_user_id:
        query['user_id'] = target_user_id
    elif user['role'] not in [UserRole.MANAGER, UserRole.ADMIN]:
        query['user_id'] = uid
    if category:
        query['category'] = category
    docs = await db.hr_documents.find(query).sort('created_at', -1).to_list(500)
    result = []
    for d in docs:
        owner = await db.users.find_one({'_id': ObjectId(d['user_id'])})
        result.append({
            'id': str(d['_id']), 'title': d['title'], 'category': d['category'],
            'content': d.get('content', ''), 'user_id': d['user_id'],
            'user_name': f"{owner['first_name']} {owner['last_name']}" if owner else 'Inconnu',
            'created_at': d['created_at'].isoformat() if isinstance(d['created_at'], datetime) else str(d['created_at'])
        })
    return result

@router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str, user=Depends(get_manager_user)):
    await db.hr_documents.delete_one({'_id': ObjectId(doc_id)})
    return {'message': 'Document supprime'}
