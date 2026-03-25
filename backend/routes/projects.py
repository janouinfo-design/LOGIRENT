from fastapi import APIRouter, Depends, HTTPException
from typing import List
from bson import ObjectId
from datetime import datetime
from config import db
from models.schemas import ProjectCreate, ProjectResponse, ProjectUpdate
from utils.auth import get_current_user, get_manager_user
from utils.helpers import calculate_duration, create_audit_log

router = APIRouter()

@router.post("/projects", response_model=ProjectResponse)
async def create_project(data: ProjectCreate, user=Depends(get_manager_user)):
    project_doc = {
        'name': data.name, 'client_id': data.client_id,
        'description': data.description or "", 'location': data.location or "",
        'budget': data.budget or 0.0, 'start_date': data.start_date, 'end_date': data.end_date,
        'hourly_rate': data.hourly_rate or 0.0, 'currency': data.currency or "CHF",
        'latitude': data.latitude, 'longitude': data.longitude,
        'geofence_radius': data.geofence_radius or 100,
        'status': 'active', 'is_active': True, 'created_at': datetime.utcnow()
    }
    result = await db.projects.insert_one(project_doc)
    await create_audit_log(str(user['_id']), "CREATE", "project", str(result.inserted_id))
    client_name = None
    if data.client_id:
        client = await db.clients.find_one({'_id': ObjectId(data.client_id)})
        client_name = client['name'] if client else None
    return ProjectResponse(id=str(result.inserted_id), client_name=client_name, **project_doc)

@router.get("/projects", response_model=List[ProjectResponse])
async def get_projects(active_only: bool = True, user=Depends(get_current_user)):
    query = {'is_active': True} if active_only else {}
    projects = await db.projects.find(query).to_list(1000)
    result = []
    for p in projects:
        client_name = None
        if p.get('client_id'):
            try:
                client = await db.clients.find_one({'_id': ObjectId(p['client_id'])})
                client_name = client['name'] if client else None
            except:
                pass
        result.append(ProjectResponse(
            id=str(p['_id']), name=p['name'], client_id=p.get('client_id'),
            client_name=client_name, description=p.get('description', ''),
            location=p.get('location', ''), budget=p.get('budget', 0.0),
            start_date=p.get('start_date'), end_date=p.get('end_date'),
            hourly_rate=p.get('hourly_rate', 0.0), currency=p.get('currency', 'CHF'),
            status=p.get('status', 'active'), created_at=p.get('created_at', datetime.utcnow()),
            is_active=p.get('is_active', True), latitude=p.get('latitude'),
            longitude=p.get('longitude'), geofence_radius=p.get('geofence_radius', 100)
        ))
    return result

@router.put("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: str, data: ProjectUpdate, user=Depends(get_manager_user)):
    update_dict = {k: v for k, v in data.dict().items() if v is not None}
    if update_dict:
        await db.projects.update_one({'_id': ObjectId(project_id)}, {'$set': update_dict})
        await create_audit_log(str(user['_id']), "UPDATE", "project", project_id)
    project = await db.projects.find_one({'_id': ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Projet non trouve")
    client_name = None
    if project.get('client_id'):
        client = await db.clients.find_one({'_id': ObjectId(project['client_id'])})
        client_name = client['name'] if client else None
    return ProjectResponse(
        id=str(project['_id']), name=project['name'], client_id=project.get('client_id'),
        client_name=client_name, description=project.get('description', ''),
        location=project.get('location', ''), budget=project.get('budget', 0.0),
        start_date=project.get('start_date'), end_date=project.get('end_date'),
        hourly_rate=project.get('hourly_rate', 0.0), currency=project.get('currency', 'CHF'),
        status=project.get('status', 'active'), created_at=project.get('created_at', datetime.utcnow()),
        is_active=project.get('is_active', True), latitude=project.get('latitude'),
        longitude=project.get('longitude'), geofence_radius=project.get('geofence_radius', 100)
    )

@router.delete("/projects/{project_id}")
async def delete_project(project_id: str, user=Depends(get_manager_user)):
    await db.projects.update_one({'_id': ObjectId(project_id)}, {'$set': {'is_active': False}})
    await create_audit_log(str(user['_id']), "DELETE", "project", project_id)
    return {"message": "Projet desactive"}

@router.get("/projects/monthly-hours")
async def get_all_projects_monthly_hours(user=Depends(get_current_user)):
    now = datetime.utcnow()
    month_start = f"{now.year}-{now.month:02d}-01"
    month_end = f"{now.year + 1}-01-01" if now.month == 12 else f"{now.year}-{now.month + 1:02d}-01"
    projects = await db.projects.find({'is_active': True}).to_list(1000)
    result = {}
    for p in projects:
        pid = str(p['_id'])
        entries = await db.timeentries.find({'project_id': pid, 'date': {'$gte': month_start, '$lt': month_end}}).to_list(5000)
        total_hours = sum(calculate_duration(e.get('clock_in'), e.get('clock_out'), e.get('break_start'), e.get('break_end'))[0] for e in entries)
        result[pid] = round(total_hours, 2)
    return result

@router.get("/projects/{project_id}/monthly-hours")
async def get_project_monthly_hours(project_id: str, user=Depends(get_current_user)):
    now = datetime.utcnow()
    month_start = f"{now.year}-{now.month:02d}-01"
    month_end = f"{now.year + 1}-01-01" if now.month == 12 else f"{now.year}-{now.month + 1:02d}-01"
    entries = await db.timeentries.find({'project_id': project_id, 'date': {'$gte': month_start, '$lt': month_end}}).to_list(5000)
    total_hours = 0
    billable_hours = 0
    for e in entries:
        wh, _ = calculate_duration(e.get('clock_in'), e.get('clock_out'), e.get('break_start'), e.get('break_end'))
        total_hours += wh
        if e.get('billable', True):
            billable_hours += wh
    project = await db.projects.find_one({'_id': ObjectId(project_id)})
    hourly_rate = project.get('hourly_rate', 0) if project else 0
    currency = project.get('currency', 'CHF') if project else 'CHF'
    return {
        'project_id': project_id, 'month': now.month, 'year': now.year,
        'total_hours': round(total_hours, 2), 'billable_hours': round(billable_hours, 2),
        'cost': round(total_hours * hourly_rate, 2), 'currency': currency
    }

@router.get("/projects/{project_id}/stats")
async def get_project_stats(project_id: str, user=Depends(get_current_user)):
    entries = await db.timeentries.find({'project_id': project_id}).to_list(10000)
    total_hours = 0
    billable_hours = 0
    for e in entries:
        duration, _ = calculate_duration(e.get('clock_in'), e.get('clock_out'), e.get('break_start'), e.get('break_end'))
        total_hours += duration
        if e.get('billable', True):
            billable_hours += duration
    project = await db.projects.find_one({'_id': ObjectId(project_id)})
    hourly_rate = project.get('hourly_rate', 0) if project else 0
    budget = project.get('budget', 0) if project else 0
    return {
        'total_hours': round(total_hours, 2), 'billable_hours': round(billable_hours, 2),
        'billable_amount': round(billable_hours * hourly_rate, 2), 'budget': budget,
        'budget_remaining': round(budget - (billable_hours * hourly_rate), 2),
        'entries_count': len(entries)
    }
