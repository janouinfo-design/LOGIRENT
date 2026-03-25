from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime
from models.enums import UserRole


class CompanyCreate(BaseModel):
    name: str
    address: Optional[str] = ""
    country: Optional[str] = "Suisse"
    vat_number: Optional[str] = ""

class CompanyResponse(BaseModel):
    id: str
    name: str
    address: str
    country: str
    vat_number: str
    created_at: datetime

class DepartmentCreate(BaseModel):
    name: str
    description: Optional[str] = ""

class DepartmentResponse(BaseModel):
    id: str
    name: str
    description: str
    company_id: Optional[str] = None

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    role: str = UserRole.EMPLOYEE
    contract_hours: float = 42.0
    department_id: Optional[str] = None
    phone: Optional[str] = ""

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    first_name: str
    last_name: str
    role: str
    contract_hours: float
    department_id: Optional[str] = None
    department_name: Optional[str] = None
    phone: Optional[str] = None
    created_at: datetime

class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    contract_hours: Optional[float] = None
    department_id: Optional[str] = None
    phone: Optional[str] = None

class ClientCreate(BaseModel):
    name: str
    email: Optional[str] = ""
    phone: Optional[str] = ""
    company: Optional[str] = ""
    address: Optional[str] = ""

class ClientResponse(BaseModel):
    id: str
    name: str
    email: str
    phone: str
    company: str
    address: str
    created_at: datetime

class ActivityCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    billable: bool = True

class ActivityResponse(BaseModel):
    id: str
    name: str
    description: str
    billable: bool

class ProjectCreate(BaseModel):
    name: str
    client_id: Optional[str] = None
    description: Optional[str] = ""
    location: Optional[str] = ""
    budget: Optional[float] = 0.0
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    hourly_rate: Optional[float] = 0.0
    currency: Optional[str] = "CHF"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    geofence_radius: Optional[int] = 100

class ProjectResponse(BaseModel):
    id: str
    name: str
    client_id: Optional[str] = None
    client_name: Optional[str] = None
    description: str
    location: str
    budget: float
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    hourly_rate: float
    currency: str = "CHF"
    status: str
    created_at: datetime
    is_active: bool
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    geofence_radius: Optional[int] = 100

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    client_id: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    budget: Optional[float] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    hourly_rate: Optional[float] = None
    currency: Optional[str] = None
    status: Optional[str] = None
    is_active: Optional[bool] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    geofence_radius: Optional[int] = None

class TimesheetCreate(BaseModel):
    project_id: Optional[str] = None
    activity_id: Optional[str] = None
    comment: Optional[str] = ""
    billable: bool = True
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    work_location: Optional[str] = "office"

class TimesheetResponse(BaseModel):
    id: str
    user_id: str
    user_name: Optional[str] = None
    project_id: Optional[str] = None
    project_name: Optional[str] = None
    activity_id: Optional[str] = None
    activity_name: Optional[str] = None
    date: str
    clock_in: Optional[datetime] = None
    clock_out: Optional[datetime] = None
    break_start: Optional[datetime] = None
    break_end: Optional[datetime] = None
    duration: float
    break_duration: float
    billable: bool
    status: str
    comment: str
    overtime_hours: float

class TimesheetUpdate(BaseModel):
    clock_in: Optional[datetime] = None
    clock_out: Optional[datetime] = None
    break_start: Optional[datetime] = None
    break_end: Optional[datetime] = None
    project_id: Optional[str] = None
    activity_id: Optional[str] = None
    comment: Optional[str] = None
    billable: Optional[bool] = None
    status: Optional[str] = None

class TimerEntry(BaseModel):
    id: str
    user_id: str
    project_id: Optional[str] = None
    activity_id: Optional[str] = None
    start_time: datetime
    end_time: Optional[datetime] = None
    duration: float
    description: Optional[str] = ""
    billable: bool = True
    is_running: bool = False

class LeaveCreate(BaseModel):
    type: str
    start_date: str
    end_date: str
    reason: Optional[str] = ""

class LeaveResponse(BaseModel):
    id: str
    user_id: str
    user_name: Optional[str] = None
    type: str
    start_date: str
    end_date: str
    reason: str
    status: str
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    created_at: datetime

class InvoiceCreate(BaseModel):
    client_id: str
    project_id: Optional[str] = None
    timesheet_ids: List[str] = []
    due_date: Optional[str] = None
    notes: Optional[str] = ""

class InvoiceResponse(BaseModel):
    id: str
    invoice_number: str
    client_id: str
    client_name: Optional[str] = None
    project_id: Optional[str] = None
    project_name: Optional[str] = None
    amount: float
    hours: float
    status: str
    date: datetime
    due_date: Optional[str] = None
    notes: str
    items: List[dict] = []

class NotificationResponse(BaseModel):
    id: str
    user_id: str
    title: str
    message: str
    type: str
    read: bool
    created_at: datetime

class AuditLogResponse(BaseModel):
    id: str
    user_id: str
    user_name: Optional[str] = None
    action: str
    entity: str
    entity_id: Optional[str] = None
    details: Optional[str] = None
    timestamp: datetime
    ip_address: Optional[str] = None
