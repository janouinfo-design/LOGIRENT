from fastapi import APIRouter, Depends
from typing import Optional, List
from bson import ObjectId
from datetime import datetime, timedelta
from config import db
from models.enums import LeaveStatus
from utils.auth import get_current_user, get_manager_user
from utils.helpers import calculate_duration

router = APIRouter()

@router.get("/planning")
async def get_planning(start_date: Optional[str] = None, end_date: Optional[str] = None, department_id: Optional[str] = None, user=Depends(get_current_user)):
    now = datetime.utcnow().date()
    if not start_date:
        start_date = (now - timedelta(days=now.weekday())).isoformat()
    if not end_date:
        end_date = (now + timedelta(days=6 - now.weekday())).isoformat()
    user_query = {}
    if department_id:
        user_query['department_id'] = department_id
    users = await db.users.find(user_query).to_list(1000)
    planning = []
    for u in users:
        uid = str(u['_id'])
        entries = await db.timeentries.find({'user_id': uid, 'date': {'$gte': start_date, '$lte': end_date}}).to_list(100)
        leaves = await db.leaves.find({'user_id': uid, 'status': LeaveStatus.APPROVED, 'start_date': {'$lte': end_date}, 'end_date': {'$gte': start_date}}).to_list(50)
        days = {}
        for e in entries:
            wh, _ = calculate_duration(e.get('clock_in'), e.get('clock_out'), e.get('break_start'), e.get('break_end'))
            loc = e.get('work_location', 'office')
            project_name = None
            if e.get('project_id'):
                proj = await db.projects.find_one({'_id': ObjectId(e['project_id'])})
                project_name = proj['name'] if proj else None
            days[e['date']] = {
                'hours': round(wh, 1), 'location': loc, 'type': 'work',
                'status': e.get('status', 'pending'),
                'clock_in': e.get('clock_in').isoformat() if e.get('clock_in') else None,
                'clock_out': e.get('clock_out').isoformat() if e.get('clock_out') else None,
                'break_start': e.get('break_start').isoformat() if e.get('break_start') else None,
                'break_end': e.get('break_end').isoformat() if e.get('break_end') else None,
                'project_name': project_name,
            }
        for lv in leaves:
            try:
                sd = datetime.strptime(lv['start_date'], '%Y-%m-%d').date()
                ed = datetime.strptime(lv['end_date'], '%Y-%m-%d').date()
                d = sd
                while d <= ed:
                    ds = d.isoformat()
                    if ds not in days and ds >= start_date and ds <= end_date:
                        days[ds] = {'hours': 0, 'location': '', 'type': lv['type'], 'status': 'approved'}
                    d += timedelta(days=1)
            except:
                pass
        dept_name = None
        if u.get('department_id'):
            dept = await db.departments.find_one({'_id': ObjectId(u['department_id'])})
            dept_name = dept['name'] if dept else None
        planning.append({'user_id': uid, 'name': f"{u['first_name']} {u['last_name']}", 'role': u['role'], 'department': dept_name, 'days': days})
    return planning

@router.post("/schedules")
async def create_schedule(
    user_id: str, schedule_type: str = "fixed",
    monday_start: str = "08:00", monday_end: str = "17:00",
    tuesday_start: str = "08:00", tuesday_end: str = "17:00",
    wednesday_start: str = "08:00", wednesday_end: str = "17:00",
    thursday_start: str = "08:00", thursday_end: str = "17:00",
    friday_start: str = "08:00", friday_end: str = "17:00",
    saturday_start: str = "", saturday_end: str = "",
    sunday_start: str = "", sunday_end: str = "",
    flex_weekly_hours: float = 40.0,
    user=Depends(get_manager_user)
):
    sched = {
        'user_id': user_id, 'schedule_type': schedule_type,
        'days': {
            'monday': {'start': monday_start, 'end': monday_end},
            'tuesday': {'start': tuesday_start, 'end': tuesday_end},
            'wednesday': {'start': wednesday_start, 'end': wednesday_end},
            'thursday': {'start': thursday_start, 'end': thursday_end},
            'friday': {'start': friday_start, 'end': friday_end},
            'saturday': {'start': saturday_start, 'end': saturday_end},
            'sunday': {'start': sunday_start, 'end': sunday_end},
        },
        'flex_weekly_hours': flex_weekly_hours,
        'created_at': datetime.utcnow(), 'updated_at': datetime.utcnow()
    }
    existing = await db.schedules.find_one({'user_id': user_id})
    if existing:
        await db.schedules.update_one({'_id': existing['_id']}, {'$set': sched})
        return {'id': str(existing['_id']), 'message': 'Horaire mis a jour'}
    result = await db.schedules.insert_one(sched)
    return {'id': str(result.inserted_id), 'message': 'Horaire cree'}

@router.get("/schedules")
async def get_schedules(user_id: Optional[str] = None, user=Depends(get_current_user)):
    query = {}
    if user_id:
        query['user_id'] = user_id
    scheds = await db.schedules.find(query).to_list(500)
    result = []
    for s in scheds:
        u = await db.users.find_one({'_id': ObjectId(s['user_id'])})
        result.append({
            'id': str(s['_id']), 'user_id': s['user_id'],
            'user_name': f"{u['first_name']} {u['last_name']}" if u else 'Inconnu',
            'schedule_type': s.get('schedule_type', 'fixed'), 'days': s.get('days', {}),
            'flex_weekly_hours': s.get('flex_weekly_hours', 40.0),
        })
    return result
