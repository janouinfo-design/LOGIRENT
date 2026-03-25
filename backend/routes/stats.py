from fastapi import APIRouter, Depends
from typing import Optional
from bson import ObjectId
from datetime import datetime, timedelta
from config import db
from models.schemas import AuditLogResponse
from models.enums import UserRole, TimesheetStatus, LeaveStatus, LeaveType
from utils.auth import get_current_user, get_manager_user, get_admin_user
from utils.helpers import calculate_duration

router = APIRouter()

@router.get("/stats/weekly")
async def get_weekly_stats(user=Depends(get_current_user)):
    user_id = str(user['_id'])
    today = datetime.utcnow().date()
    week_start = today - timedelta(days=today.weekday())
    entries = await db.timeentries.find({'user_id': user_id, 'date': {'$gte': week_start.isoformat()}}).to_list(100)
    total_hours = 0
    billable_hours = 0
    total_overtime = 0
    daily_hours = user.get('contract_hours', 42) / 5
    for e in entries:
        work_hours, _ = calculate_duration(e.get('clock_in'), e.get('clock_out'), e.get('break_start'), e.get('break_end'))
        total_hours += work_hours
        if e.get('billable', True):
            billable_hours += work_hours
        total_overtime += max(0, work_hours - daily_hours)
    return {
        'week_start': week_start.isoformat(), 'total_hours': round(total_hours, 2),
        'billable_hours': round(billable_hours, 2), 'overtime_hours': round(total_overtime, 2),
        'contract_hours': user.get('contract_hours', 42), 'days_worked': len(entries)
    }

@router.get("/stats/monthly")
async def get_monthly_stats(month: Optional[int] = None, year: Optional[int] = None, user=Depends(get_current_user)):
    user_id = str(user['_id'])
    now = datetime.utcnow()
    target_month = month or now.month
    target_year = year or now.year
    month_start = f"{target_year}-{target_month:02d}-01"
    month_end = f"{target_year + 1}-01-01" if target_month == 12 else f"{target_year}-{target_month + 1:02d}-01"
    entries = await db.timeentries.find({'user_id': user_id, 'date': {'$gte': month_start, '$lt': month_end}}).to_list(100)
    total_hours = 0
    billable_hours = 0
    total_overtime = 0
    daily_hours = user.get('contract_hours', 42) / 5
    for e in entries:
        work_hours, _ = calculate_duration(e.get('clock_in'), e.get('clock_out'), e.get('break_start'), e.get('break_end'))
        total_hours += work_hours
        if e.get('billable', True):
            billable_hours += work_hours
        total_overtime += max(0, work_hours - daily_hours)
    return {
        'month': target_month, 'year': target_year, 'total_hours': round(total_hours, 2),
        'billable_hours': round(billable_hours, 2), 'overtime_hours': round(total_overtime, 2),
        'contract_hours': user.get('contract_hours', 42), 'days_worked': len(entries)
    }

@router.get("/stats/dashboard")
async def get_dashboard_stats(user=Depends(get_manager_user)):
    today = datetime.utcnow().date().isoformat()
    total_employees = await db.users.count_documents({'role': UserRole.EMPLOYEE})
    active_today = await db.timeentries.count_documents({'date': today, 'clock_out': None})
    pending_entries = await db.timeentries.count_documents({'status': TimesheetStatus.PENDING})
    pending_leaves = await db.leaves.count_documents({'status': LeaveStatus.PENDING})
    now = datetime.utcnow()
    month_start = f"{now.year}-{now.month:02d}-01"
    entries_this_month = await db.timeentries.find({'date': {'$gte': month_start}, 'billable': True}).to_list(10000)
    billable_hours = sum(calculate_duration(e.get('clock_in'), e.get('clock_out'), e.get('break_start'), e.get('break_end'))[0] for e in entries_this_month)
    return {
        'total_employees': total_employees, 'active_today': active_today,
        'pending_entries': pending_entries, 'pending_leaves': pending_leaves,
        'billable_hours_month': round(billable_hours, 2)
    }

@router.get("/stats/balances")
async def get_employee_balances(target_user_id: Optional[str] = None, user=Depends(get_current_user)):
    uid = target_user_id if target_user_id and user['role'] in [UserRole.MANAGER, UserRole.ADMIN] else str(user['_id'])
    from fastapi import HTTPException
    target = await db.users.find_one({'_id': ObjectId(uid)})
    if not target:
        raise HTTPException(status_code=404, detail="Utilisateur non trouve")
    now = datetime.utcnow()
    year_start = f"{now.year}-01-01"
    contract_hours = target.get('contract_hours', 42)
    daily_hours = contract_hours / 5
    entries = await db.timeentries.find({'user_id': uid, 'date': {'$gte': year_start}}).to_list(10000)
    total_hours = 0
    overtime = 0
    for e in entries:
        wh, _ = calculate_duration(e.get('clock_in'), e.get('clock_out'), e.get('break_start'), e.get('break_end'))
        total_hours += wh
        overtime += max(0, wh - daily_hours)
    vacation_total = 25
    approved_vacations = await db.leaves.find({'user_id': uid, 'type': LeaveType.VACATION, 'status': LeaveStatus.APPROVED}).to_list(100)
    vacation_used = 0
    for v in approved_vacations:
        try:
            sd = datetime.strptime(v['start_date'], '%Y-%m-%d')
            ed = datetime.strptime(v['end_date'], '%Y-%m-%d')
            days = 0
            d = sd
            while d <= ed:
                if d.weekday() < 5:
                    days += 1
                d += timedelta(days=1)
            vacation_used += days
        except:
            vacation_used += 1
    sick_leaves = await db.leaves.find({'user_id': uid, 'type': LeaveType.SICK, 'status': LeaveStatus.APPROVED}).to_list(100)
    sick_days = 0
    for s in sick_leaves:
        try:
            sd = datetime.strptime(s['start_date'], '%Y-%m-%d')
            ed = datetime.strptime(s['end_date'], '%Y-%m-%d')
            sick_days += (ed - sd).days + 1
        except:
            sick_days += 1
    month_start = f"{now.year}-{now.month:02d}-01"
    month_entries = [e for e in entries if e.get('date', '') >= month_start]
    month_hours = sum(calculate_duration(e.get('clock_in'), e.get('clock_out'), e.get('break_start'), e.get('break_end'))[0] for e in month_entries)
    telework_days = sum(1 for e in month_entries if e.get('work_location') == 'home')
    office_days = sum(1 for e in month_entries if e.get('work_location', 'office') == 'office')
    onsite_days = sum(1 for e in month_entries if e.get('work_location') == 'onsite')
    return {
        'total_hours_year': round(total_hours, 1), 'overtime_hours': round(overtime, 1),
        'contract_hours_week': contract_hours, 'vacation_total': vacation_total,
        'vacation_used': vacation_used, 'vacation_remaining': vacation_total - vacation_used,
        'sick_days': sick_days, 'month_hours': round(month_hours, 1),
        'month_target': round(contract_hours * 4.33, 1),
        'telework_days': telework_days, 'office_days': office_days, 'onsite_days': onsite_days
    }

@router.get("/audit-logs")
async def get_audit_logs(entity: Optional[str] = None, user_id: Optional[str] = None, limit: int = 100, user=Depends(get_admin_user)):
    query = {}
    if entity:
        query['entity'] = entity
    if user_id:
        query['user_id'] = user_id
    logs = await db.audit_logs.find(query).sort('timestamp', -1).limit(limit).to_list(limit)
    result = []
    for log in logs:
        user_doc = await db.users.find_one({'_id': ObjectId(log['user_id'])})
        user_name = f"{user_doc['first_name']} {user_doc['last_name']}" if user_doc else "Inconnu"
        result.append(AuditLogResponse(
            id=str(log['_id']), user_id=log['user_id'], user_name=user_name,
            action=log['action'], entity=log['entity'], entity_id=log.get('entity_id'),
            details=log.get('details'), timestamp=log['timestamp'], ip_address=log.get('ip_address')
        ))
    return result

@router.get("/analytics/dashboard")
async def get_analytics_dashboard(months: int = 6, user=Depends(get_manager_user)):
    now = datetime.utcnow()
    monthly_data = []
    for i in range(months - 1, -1, -1):
        m = now.month - i
        y = now.year
        while m <= 0:
            m += 12
            y -= 1
        month_start = f"{y}-{m:02d}-01"
        month_end = f"{y + 1}-01-01" if m == 12 else f"{y}-{m + 1:02d}-01"
        entries = await db.timeentries.find({'date': {'$gte': month_start, '$lt': month_end}}).to_list(5000)
        total_h = 0
        billable_h = 0
        for e in entries:
            wh, _ = calculate_duration(e.get('clock_in'), e.get('clock_out'), e.get('break_start'), e.get('break_end'))
            total_h += wh
            if e.get('billable', True):
                billable_h += wh
        leaves = await db.leaves.find({'status': LeaveStatus.APPROVED, 'start_date': {'$gte': month_start, '$lt': month_end}}).to_list(500)
        absence_days = len(leaves)
        total_users = await db.users.count_documents({})
        absence_rate = round((absence_days / (total_users * 22)) * 100, 1) if total_users > 0 else 0
        months_names = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec']
        monthly_data.append({
            'month': months_names[m - 1], 'year': y, 'total_hours': round(total_h, 1),
            'billable_hours': round(billable_h, 1), 'absence_days': absence_days, 'absence_rate': absence_rate
        })
    projects = await db.projects.find({'is_active': True}).to_list(100)
    project_hours = []
    for p in projects:
        pid = str(p['_id'])
        entries = await db.timeentries.find({'project_id': pid}).to_list(5000)
        ph = sum(calculate_duration(e.get('clock_in'), e.get('clock_out'), e.get('break_start'), e.get('break_end'))[0] for e in entries)
        if ph > 0:
            project_hours.append({'name': p['name'], 'hours': round(ph, 1)})
    project_hours.sort(key=lambda x: x['hours'], reverse=True)
    curr_month_start = f"{now.year}-{now.month:02d}-01"
    curr_entries = await db.timeentries.find({'date': {'$gte': curr_month_start}}).to_list(5000)
    loc_dist = {'office': 0, 'home': 0, 'onsite': 0}
    for e in curr_entries:
        loc = e.get('work_location', 'office')
        loc_dist[loc] = loc_dist.get(loc, 0) + 1
    return {
        'monthly': monthly_data, 'project_hours': project_hours[:10],
        'location_distribution': loc_dist,
        'total_employees': await db.users.count_documents({}),
        'active_projects': await db.projects.count_documents({'is_active': True})
    }
