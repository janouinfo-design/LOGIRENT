from fastapi import APIRouter, Depends, HTTPException
from typing import List
from bson import ObjectId
from datetime import datetime
from config import db
from models.schemas import (
    CompanyCreate, CompanyResponse, DepartmentCreate, DepartmentResponse,
    UserResponse, UserUpdate, ClientCreate, ClientResponse,
    ActivityCreate, ActivityResponse
)
from models.enums import UserRole
from utils.auth import get_current_user, get_manager_user, get_admin_user
from utils.helpers import create_audit_log

router = APIRouter()

# ---- Companies ----
@router.post("/companies", response_model=CompanyResponse)
async def create_company(data: CompanyCreate, user=Depends(get_admin_user)):
    company_doc = {
        'name': data.name, 'address': data.address or "",
        'country': data.country or "Suisse", 'vat_number': data.vat_number or "",
        'created_at': datetime.utcnow()
    }
    result = await db.companies.insert_one(company_doc)
    await create_audit_log(str(user['_id']), "CREATE", "company", str(result.inserted_id))
    return CompanyResponse(id=str(result.inserted_id), **company_doc)

@router.get("/companies", response_model=List[CompanyResponse])
async def get_companies(user=Depends(get_current_user)):
    companies = await db.companies.find().to_list(100)
    return [CompanyResponse(id=str(c['_id']), **{k: v for k, v in c.items() if k != '_id'}) for c in companies]

# ---- Departments ----
@router.post("/departments", response_model=DepartmentResponse)
async def create_department(data: DepartmentCreate, user=Depends(get_admin_user)):
    dept_doc = {'name': data.name, 'description': data.description or "", 'company_id': None}
    result = await db.departments.insert_one(dept_doc)
    await create_audit_log(str(user['_id']), "CREATE", "department", str(result.inserted_id))
    return DepartmentResponse(id=str(result.inserted_id), **dept_doc)

@router.get("/departments", response_model=List[DepartmentResponse])
async def get_departments(user=Depends(get_current_user)):
    depts = await db.departments.find().to_list(100)
    return [DepartmentResponse(id=str(d['_id']), name=d['name'], description=d.get('description', ''), company_id=d.get('company_id')) for d in depts]

@router.delete("/departments/{dept_id}")
async def delete_department(dept_id: str, user=Depends(get_admin_user)):
    await db.departments.delete_one({'_id': ObjectId(dept_id)})
    await create_audit_log(str(user['_id']), "DELETE", "department", dept_id)
    return {"message": "Departement supprime"}

# ---- Users ----
@router.get("/users", response_model=List[UserResponse])
async def get_users(user=Depends(get_manager_user)):
    users = await db.users.find().to_list(1000)
    result = []
    for u in users:
        dept_name = None
        if u.get('department_id'):
            dept = await db.departments.find_one({'_id': ObjectId(u['department_id'])})
            dept_name = dept['name'] if dept else None
        result.append(UserResponse(
            id=str(u['_id']), email=u['email'],
            first_name=u['first_name'], last_name=u['last_name'],
            role=u['role'], contract_hours=u['contract_hours'],
            department_id=u.get('department_id'), department_name=dept_name,
            phone=u.get('phone'), created_at=u['created_at']
        ))
    return result

@router.put("/users/{user_id}")
async def update_user(user_id: str, update_data: UserUpdate, user=Depends(get_current_user)):
    if str(user['_id']) != user_id and user['role'] not in [UserRole.MANAGER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Acces refuse")
    update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
    if update_dict:
        await db.users.update_one({'_id': ObjectId(user_id)}, {'$set': update_dict})
        await create_audit_log(str(user['_id']), "UPDATE", "user", user_id)
    updated_user = await db.users.find_one({'_id': ObjectId(user_id)})
    return {
        'id': str(updated_user['_id']), 'email': updated_user['email'],
        'first_name': updated_user['first_name'], 'last_name': updated_user['last_name'],
        'role': updated_user['role'], 'contract_hours': updated_user['contract_hours']
    }

# ---- Clients ----
@router.post("/clients", response_model=ClientResponse)
async def create_client(data: ClientCreate, user=Depends(get_manager_user)):
    client_doc = {
        'name': data.name, 'email': data.email or "", 'phone': data.phone or "",
        'company': data.company or "", 'address': data.address or "",
        'created_at': datetime.utcnow()
    }
    result = await db.clients.insert_one(client_doc)
    await create_audit_log(str(user['_id']), "CREATE", "client", str(result.inserted_id))
    return ClientResponse(id=str(result.inserted_id), **client_doc)

@router.get("/clients", response_model=List[ClientResponse])
async def get_clients(user=Depends(get_current_user)):
    clients = await db.clients.find().to_list(1000)
    return [ClientResponse(id=str(c['_id']), name=c['name'], email=c.get('email', ''), phone=c.get('phone', ''), company=c.get('company', ''), address=c.get('address', ''), created_at=c['created_at']) for c in clients]

@router.put("/clients/{client_id}")
async def update_client(client_id: str, data: ClientCreate, user=Depends(get_manager_user)):
    update_dict = {k: v for k, v in data.dict().items() if v is not None}
    await db.clients.update_one({'_id': ObjectId(client_id)}, {'$set': update_dict})
    await create_audit_log(str(user['_id']), "UPDATE", "client", client_id)
    return {"message": "Client mis a jour"}

@router.delete("/clients/{client_id}")
async def delete_client(client_id: str, user=Depends(get_manager_user)):
    await db.clients.delete_one({'_id': ObjectId(client_id)})
    await create_audit_log(str(user['_id']), "DELETE", "client", client_id)
    return {"message": "Client supprime"}

# ---- Activities ----
@router.post("/activities", response_model=ActivityResponse)
async def create_activity(data: ActivityCreate, user=Depends(get_manager_user)):
    activity_doc = {'name': data.name, 'description': data.description or "", 'billable': data.billable}
    result = await db.activities.insert_one(activity_doc)
    return ActivityResponse(id=str(result.inserted_id), **activity_doc)

@router.get("/activities", response_model=List[ActivityResponse])
async def get_activities(user=Depends(get_current_user)):
    activities = await db.activities.find().to_list(100)
    return [ActivityResponse(id=str(a['_id']), name=a['name'], description=a.get('description', ''), billable=a.get('billable', True)) for a in activities]

@router.delete("/activities/{activity_id}")
async def delete_activity(activity_id: str, user=Depends(get_manager_user)):
    await db.activities.delete_one({'_id': ObjectId(activity_id)})
    return {"message": "Activite supprimee"}
