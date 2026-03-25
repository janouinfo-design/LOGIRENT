from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from bson import ObjectId
from datetime import datetime, timedelta
from config import db
from models.schemas import TimesheetCreate, TimesheetResponse, TimesheetUpdate
from models.enums import UserRole, TimesheetStatus
from utils.auth import get_current_user, get_manager_user
from utils.helpers import haversine_distance, calculate_duration, create_notification, create_audit_log

router = APIRouter()

# ---- Time Entries ----
@router.post("/timeentries/clock-in")
async def clock_in(data: TimesheetCreate, user=Depends(get_current_user)):
    today = datetime.utcnow().date().isoformat()
    user_id = str(user['_id'])
    if not data.project_id:
        raise HTTPException(status_code=400, detail="Vous devez selectionner un projet avant de pointer.")
    stale = await db.timeentries.find_one({'user_id': user_id, 'clock_out': None})
    if stale:
        close_time = stale.get('clock_in', datetime.utcnow())
        if stale.get('date') == today:
            close_time = datetime.utcnow()
        else:
            close_time = stale['clock_in'] + timedelta(hours=8)
        await db.timeentries.update_one({'_id': stale['_id']}, {'$set': {'clock_out': close_time, 'status': TimesheetStatus.PENDING}})
    if data.project_id:
        project = await db.projects.find_one({'_id': ObjectId(data.project_id)})
        if project and project.get('latitude') and project.get('longitude'):
            if not data.latitude or not data.longitude:
                raise HTTPException(status_code=400, detail="Position GPS requise pour ce projet")
            distance = haversine_distance(data.latitude, data.longitude, project['latitude'], project['longitude'])
            radius = project.get('geofence_radius', 100)
            if distance > radius:
                raise HTTPException(status_code=400, detail=f"Vous etes a {int(distance)}m du projet. Vous devez etre a moins de {radius}m pour pointer.")
    entry_doc = {
        'user_id': user_id, 'date': today, 'clock_in': datetime.utcnow(),
        'clock_out': None, 'break_start': None, 'break_end': None,
        'project_id': data.project_id, 'activity_id': data.activity_id,
        'comment': data.comment or "", 'billable': data.billable,
        'work_location': data.work_location or "office", 'status': TimesheetStatus.PENDING
    }
    result = await db.timeentries.insert_one(entry_doc)
    await create_audit_log(user_id, "CLOCK_IN", "timeentry", str(result.inserted_id))
    return {'id': str(result.inserted_id), 'message': 'Pointage debut enregistre', 'clock_in': entry_doc['clock_in']}

@router.post("/timeentries/clock-out")
async def clock_out(data: TimesheetCreate, user=Depends(get_current_user)):
    today = datetime.utcnow().date().isoformat()
    user_id = str(user['_id'])
    entry = await db.timeentries.find_one({'user_id': user_id, 'date': today, 'clock_out': None})
    if not entry:
        raise HTTPException(status_code=400, detail="Pas de pointage en cours")
    if entry.get('break_start') and not entry.get('break_end'):
        await db.timeentries.update_one({'_id': entry['_id']}, {'$set': {'break_end': datetime.utcnow()}})
        entry['break_end'] = datetime.utcnow()
    clock_out_time = datetime.utcnow()
    update_data = {
        'clock_out': clock_out_time,
        'project_id': data.project_id or entry.get('project_id'),
        'activity_id': data.activity_id or entry.get('activity_id'),
        'comment': data.comment if data.comment else entry.get('comment', ''),
        'billable': data.billable
    }
    await db.timeentries.update_one({'_id': entry['_id']}, {'$set': update_data})
    await create_audit_log(user_id, "CLOCK_OUT", "timeentry", str(entry['_id']))
    work_hours, break_hours = calculate_duration(entry['clock_in'], clock_out_time, entry.get('break_start'), entry.get('break_end'))
    return {'id': str(entry['_id']), 'message': 'Pointage fin enregistre', 'clock_out': clock_out_time, 'total_hours': work_hours, 'break_hours': break_hours}

@router.post("/timeentries/break-start")
async def start_break(user=Depends(get_current_user)):
    today = datetime.utcnow().date().isoformat()
    user_id = str(user['_id'])
    entry = await db.timeentries.find_one({'user_id': user_id, 'date': today, 'clock_out': None})
    if not entry:
        raise HTTPException(status_code=400, detail="Pas de pointage en cours")
    if entry.get('break_start') and not entry.get('break_end'):
        raise HTTPException(status_code=400, detail="Pause deja en cours")
    await db.timeentries.update_one({'_id': entry['_id']}, {'$set': {'break_start': datetime.utcnow(), 'break_end': None}})
    return {'message': 'Pause commencee', 'break_start': datetime.utcnow()}

@router.post("/timeentries/break-end")
async def end_break(user=Depends(get_current_user)):
    today = datetime.utcnow().date().isoformat()
    user_id = str(user['_id'])
    entry = await db.timeentries.find_one({'user_id': user_id, 'date': today, 'clock_out': None, 'break_start': {'$ne': None}, 'break_end': None})
    if not entry:
        raise HTTPException(status_code=400, detail="Pas de pause en cours")
    await db.timeentries.update_one({'_id': entry['_id']}, {'$set': {'break_end': datetime.utcnow()}})
    return {'message': 'Pause terminee', 'break_end': datetime.utcnow()}

@router.get("/timeentries/current")
async def get_current_entry(user=Depends(get_current_user)):
    today = datetime.utcnow().date().isoformat()
    user_id = str(user['_id'])
    entry = await db.timeentries.find_one({'user_id': user_id, 'date': today, 'clock_out': None})
    if not entry:
        cursor = db.timeentries.find({'user_id': user_id, 'date': today}).sort('clock_in', -1).limit(1)
        entries = await cursor.to_list(1)
        entry = entries[0] if entries else None
    if not entry:
        return {'active': False, 'entry': None}
    project_name = None
    if entry.get('project_id'):
        project = await db.projects.find_one({'_id': ObjectId(entry['project_id'])})
        project_name = project['name'] if project else None
    activity_name = None
    if entry.get('activity_id'):
        activity = await db.activities.find_one({'_id': ObjectId(entry['activity_id'])})
        activity_name = activity['name'] if activity else None
    work_hours, break_hours = calculate_duration(
        entry['clock_in'], entry.get('clock_out') or datetime.utcnow(),
        entry.get('break_start'),
        entry.get('break_end') or (datetime.utcnow() if entry.get('break_start') and not entry.get('break_end') else None)
    )
    return {
        'active': entry.get('clock_out') is None,
        'on_break': entry.get('break_start') is not None and entry.get('break_end') is None,
        'entry': {
            'id': str(entry['_id']), 'clock_in': entry['clock_in'],
            'clock_out': entry.get('clock_out'), 'break_start': entry.get('break_start'),
            'break_end': entry.get('break_end'), 'project_id': entry.get('project_id'),
            'project_name': project_name, 'activity_id': entry.get('activity_id'),
            'activity_name': activity_name, 'comment': entry.get('comment', ''),
            'billable': entry.get('billable', True), 'status': entry.get('status', TimesheetStatus.PENDING),
            'total_hours': work_hours, 'break_hours': break_hours
        }
    }

@router.get("/timeentries")
async def get_time_entries(
    start_date: Optional[str] = None, end_date: Optional[str] = None,
    user_id: Optional[str] = None, project_id: Optional[str] = None,
    status: Optional[str] = None, billable: Optional[bool] = None,
    user=Depends(get_current_user)
):
    query = {}
    if user['role'] not in [UserRole.MANAGER, UserRole.ADMIN]:
        query['user_id'] = str(user['_id'])
    elif user_id:
        query['user_id'] = user_id
    if start_date:
        query['date'] = {'$gte': start_date}
    if end_date:
        query.setdefault('date', {})['$lte'] = end_date
    if project_id:
        query['project_id'] = project_id
    if status:
        query['status'] = status
    if billable is not None:
        query['billable'] = billable
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
        activity_name = None
        if e.get('activity_id'):
            try:
                activity = await db.activities.find_one({'_id': ObjectId(e['activity_id'])})
                activity_name = activity['name'] if activity else None
            except:
                pass
        user_doc = await db.users.find_one({'_id': ObjectId(e['user_id'])})
        user_name = f"{user_doc['first_name']} {user_doc['last_name']}" if user_doc else "Inconnu"
        work_hours, break_hours = calculate_duration(e.get('clock_in'), e.get('clock_out'), e.get('break_start'), e.get('break_end'))
        daily_hours = user_doc.get('contract_hours', 42) / 5 if user_doc else 8.4
        overtime = max(0, work_hours - daily_hours)
        result.append(TimesheetResponse(
            id=str(e['_id']), user_id=e['user_id'], user_name=user_name,
            project_id=e.get('project_id'), project_name=project_name,
            activity_id=e.get('activity_id'), activity_name=activity_name,
            date=e['date'], clock_in=e.get('clock_in'), clock_out=e.get('clock_out'),
            break_start=e.get('break_start'), break_end=e.get('break_end'),
            duration=work_hours, break_duration=break_hours,
            billable=e.get('billable', True), status=e.get('status', TimesheetStatus.PENDING),
            comment=e.get('comment', ''), overtime_hours=overtime
        ))
    return result

@router.put("/timeentries/{entry_id}")
async def update_time_entry(entry_id: str, update_data: TimesheetUpdate, user=Depends(get_current_user)):
    entry = await db.timeentries.find_one({'_id': ObjectId(entry_id)})
    if not entry:
        raise HTTPException(status_code=404, detail="Entree non trouvee")
    if entry['user_id'] != str(user['_id']) and user['role'] not in [UserRole.MANAGER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Acces refuse")
    if update_data.status and user['role'] not in [UserRole.MANAGER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Seuls les managers peuvent changer le statut")
    update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
    if update_dict:
        await db.timeentries.update_one({'_id': ObjectId(entry_id)}, {'$set': update_dict})
        await create_audit_log(str(user['_id']), "UPDATE", "timeentry", entry_id)
    return {"message": "Entree mise a jour"}

@router.post("/timeentries/{entry_id}/approve")
async def approve_entry(entry_id: str, user=Depends(get_manager_user)):
    await db.timeentries.update_one({'_id': ObjectId(entry_id)}, {'$set': {'status': TimesheetStatus.APPROVED, 'approved_by': str(user['_id']), 'approved_at': datetime.utcnow()}})
    entry = await db.timeentries.find_one({'_id': ObjectId(entry_id)})
    if entry:
        await create_notification(entry['user_id'], "Pointage approuve", f"Votre pointage du {entry['date']} a ete approuve", "success")
    await create_audit_log(str(user['_id']), "APPROVE", "timeentry", entry_id)
    return {"message": "Entree approuvee"}

@router.post("/timeentries/{entry_id}/reject")
async def reject_entry(entry_id: str, user=Depends(get_manager_user)):
    await db.timeentries.update_one({'_id': ObjectId(entry_id)}, {'$set': {'status': TimesheetStatus.REJECTED, 'approved_by': str(user['_id']), 'approved_at': datetime.utcnow()}})
    entry = await db.timeentries.find_one({'_id': ObjectId(entry_id)})
    if entry:
        await create_notification(entry['user_id'], "Pointage refuse", f"Votre pointage du {entry['date']} a ete refuse", "error")
    await create_audit_log(str(user['_id']), "REJECT", "timeentry", entry_id)
    return {"message": "Entree refusee"}

@router.post("/timeentries/approve-all")
async def approve_all_entries(user=Depends(get_manager_user)):
    result = await db.timeentries.update_many({'status': TimesheetStatus.PENDING}, {'$set': {'status': TimesheetStatus.APPROVED, 'approved_by': str(user['_id']), 'approved_at': datetime.utcnow()}})
    await create_audit_log(str(user['_id']), "APPROVE_ALL", "timeentry", None, f"{result.modified_count} entrees approuvees")
    return {"message": f"{result.modified_count} entrees approuvees"}

# ---- Timer ----
@router.post("/timer/start")
async def start_timer(data: TimesheetCreate, user=Depends(get_current_user)):
    user_id = str(user['_id'])
    running = await db.timer_entries.find_one({'user_id': user_id, 'is_running': True})
    if running:
        raise HTTPException(status_code=400, detail="Un timer est deja en cours")
    timer_doc = {
        'user_id': user_id, 'project_id': data.project_id, 'activity_id': data.activity_id,
        'start_time': datetime.utcnow(), 'end_time': None, 'duration': 0,
        'description': data.comment or "", 'billable': data.billable, 'is_running': True
    }
    result = await db.timer_entries.insert_one(timer_doc)
    return {'id': str(result.inserted_id), 'message': 'Timer demarre', 'start_time': timer_doc['start_time']}

@router.post("/timer/stop")
async def stop_timer(user=Depends(get_current_user)):
    user_id = str(user['_id'])
    timer = await db.timer_entries.find_one({'user_id': user_id, 'is_running': True})
    if not timer:
        raise HTTPException(status_code=400, detail="Pas de timer en cours")
    end_time = datetime.utcnow()
    duration = (end_time - timer['start_time']).total_seconds() / 3600
    await db.timer_entries.update_one({'_id': timer['_id']}, {'$set': {'end_time': end_time, 'duration': round(duration, 2), 'is_running': False}})
    return {'id': str(timer['_id']), 'message': 'Timer arrete', 'duration': round(duration, 2)}

@router.get("/timer/current")
async def get_current_timer(user=Depends(get_current_user)):
    user_id = str(user['_id'])
    timer = await db.timer_entries.find_one({'user_id': user_id, 'is_running': True})
    if not timer:
        return {'running': False, 'timer': None}
    elapsed = (datetime.utcnow() - timer['start_time']).total_seconds() / 3600
    project_name = None
    if timer.get('project_id'):
        project = await db.projects.find_one({'_id': ObjectId(timer['project_id'])})
        project_name = project['name'] if project else None
    return {
        'running': True,
        'timer': {
            'id': str(timer['_id']), 'start_time': timer['start_time'],
            'elapsed_hours': round(elapsed, 2), 'project_id': timer.get('project_id'),
            'project_name': project_name, 'description': timer.get('description', '')
        }
    }

@router.get("/timer/history")
async def get_timer_history(user=Depends(get_current_user)):
    user_id = str(user['_id'])
    timers = await db.timer_entries.find({'user_id': user_id, 'is_running': False}).sort('start_time', -1).to_list(100)
    result = []
    for t in timers:
        project_name = None
        if t.get('project_id'):
            project = await db.projects.find_one({'_id': ObjectId(t['project_id'])})
            project_name = project['name'] if project else None
        result.append({
            'id': str(t['_id']), 'start_time': t['start_time'], 'end_time': t['end_time'],
            'duration': t['duration'], 'project_id': t.get('project_id'),
            'project_name': project_name, 'description': t.get('description', ''),
            'billable': t.get('billable', True)
        })
    return result
