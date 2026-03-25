from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from typing import List, Optional
from bson import ObjectId
from datetime import datetime
from io import BytesIO
from openpyxl import Workbook
from config import db
from models.schemas import InvoiceCreate, InvoiceResponse
from models.enums import UserRole, InvoiceStatus, LeaveStatus, LeaveType
from utils.auth import get_current_user, get_manager_user
from utils.helpers import calculate_duration, create_notification, create_audit_log

router = APIRouter()

# ---- Invoices ----
@router.post("/invoices", response_model=InvoiceResponse)
async def create_invoice(data: InvoiceCreate, user=Depends(get_manager_user)):
    entries = []
    total_hours = 0
    total_amount = 0
    if data.timesheet_ids:
        for ts_id in data.timesheet_ids:
            entry = await db.timeentries.find_one({'_id': ObjectId(ts_id)})
            if entry and entry.get('billable', True):
                duration, _ = calculate_duration(entry.get('clock_in'), entry.get('clock_out'), entry.get('break_start'), entry.get('break_end'))
                rate = 0
                if entry.get('project_id'):
                    project = await db.projects.find_one({'_id': ObjectId(entry['project_id'])})
                    rate = project.get('hourly_rate', 0) if project else 0
                entries.append({'timesheet_id': ts_id, 'date': entry['date'], 'hours': duration, 'rate': rate, 'amount': duration * rate})
                total_hours += duration
                total_amount += duration * rate
    count = await db.invoices.count_documents({})
    invoice_number = f"INV-{datetime.utcnow().year}-{count + 1:04d}"
    client = await db.clients.find_one({'_id': ObjectId(data.client_id)})
    project = await db.projects.find_one({'_id': ObjectId(data.project_id)}) if data.project_id else None
    invoice_doc = {
        'invoice_number': invoice_number, 'client_id': data.client_id, 'project_id': data.project_id,
        'amount': round(total_amount, 2), 'hours': round(total_hours, 2), 'status': InvoiceStatus.DRAFT,
        'date': datetime.utcnow(), 'due_date': data.due_date, 'notes': data.notes or "",
        'items': entries, 'created_by': str(user['_id'])
    }
    result = await db.invoices.insert_one(invoice_doc)
    await create_audit_log(str(user['_id']), "CREATE", "invoice", str(result.inserted_id))
    return InvoiceResponse(
        id=str(result.inserted_id), invoice_number=invoice_number, client_id=data.client_id,
        client_name=client['name'] if client else None, project_id=data.project_id,
        project_name=project['name'] if project else None, amount=round(total_amount, 2),
        hours=round(total_hours, 2), status=InvoiceStatus.DRAFT, date=invoice_doc['date'],
        due_date=data.due_date, notes=data.notes or "", items=entries
    )

@router.get("/invoices", response_model=List[InvoiceResponse])
async def get_invoices(client_id: Optional[str] = None, status: Optional[str] = None, user=Depends(get_manager_user)):
    query = {}
    if client_id:
        query['client_id'] = client_id
    if status:
        query['status'] = status
    invoices = await db.invoices.find(query).sort('date', -1).to_list(1000)
    result = []
    for inv in invoices:
        client = await db.clients.find_one({'_id': ObjectId(inv['client_id'])})
        project = await db.projects.find_one({'_id': ObjectId(inv['project_id'])}) if inv.get('project_id') else None
        result.append(InvoiceResponse(
            id=str(inv['_id']), invoice_number=inv['invoice_number'], client_id=inv['client_id'],
            client_name=client['name'] if client else None, project_id=inv.get('project_id'),
            project_name=project['name'] if project else None, amount=inv['amount'], hours=inv['hours'],
            status=inv['status'], date=inv['date'], due_date=inv.get('due_date'),
            notes=inv.get('notes', ''), items=inv.get('items', [])
        ))
    return result

@router.put("/invoices/{invoice_id}/status")
async def update_invoice_status(invoice_id: str, status: str, user=Depends(get_manager_user)):
    if status not in [InvoiceStatus.DRAFT, InvoiceStatus.SENT, InvoiceStatus.PAID, InvoiceStatus.OVERDUE]:
        raise HTTPException(status_code=400, detail="Statut invalide")
    await db.invoices.update_one({'_id': ObjectId(invoice_id)}, {'$set': {'status': status}})
    await create_audit_log(str(user['_id']), "UPDATE_STATUS", "invoice", invoice_id, f"Status: {status}")
    return {"message": f"Facture mise a jour: {status}"}

# ---- Expenses ----
@router.post("/expenses")
async def create_expense(amount: float, category: str, description: str = "", date: Optional[str] = None, project_id: Optional[str] = None, user=Depends(get_current_user)):
    expense_doc = {
        'user_id': str(user['_id']), 'amount': amount, 'category': category,
        'description': description, 'date': date or datetime.utcnow().date().isoformat(),
        'project_id': project_id, 'status': 'pending', 'created_at': datetime.utcnow()
    }
    result = await db.expenses.insert_one(expense_doc)
    managers = await db.users.find({'role': {'$in': [UserRole.MANAGER, UserRole.ADMIN]}}).to_list(100)
    for m in managers:
        await create_notification(str(m['_id']), "Nouvelle note de frais", f"{user['first_name']} {user['last_name']}: {amount} CHF", "info")
    return {'id': str(result.inserted_id), 'message': 'Note de frais creee'}

@router.get("/expenses")
async def get_expenses(status: Optional[str] = None, user=Depends(get_current_user)):
    query = {}
    if user['role'] not in [UserRole.MANAGER, UserRole.ADMIN]:
        query['user_id'] = str(user['_id'])
    if status:
        query['status'] = status
    expenses = await db.expenses.find(query).sort('created_at', -1).to_list(1000)
    result = []
    for exp in expenses:
        user_doc = await db.users.find_one({'_id': ObjectId(exp['user_id'])})
        user_name = f"{user_doc['first_name']} {user_doc['last_name']}" if user_doc else "Inconnu"
        project_name = None
        if exp.get('project_id'):
            proj = await db.projects.find_one({'_id': ObjectId(exp['project_id'])})
            project_name = proj['name'] if proj else None
        result.append({
            'id': str(exp['_id']), 'user_id': exp['user_id'], 'user_name': user_name,
            'amount': exp['amount'], 'category': exp['category'],
            'description': exp.get('description', ''), 'date': exp['date'],
            'project_id': exp.get('project_id'), 'project_name': project_name,
            'status': exp['status'],
            'created_at': exp['created_at'].isoformat() if isinstance(exp['created_at'], datetime) else exp['created_at']
        })
    return result

@router.post("/expenses/{expense_id}/approve")
async def approve_expense(expense_id: str, user=Depends(get_manager_user)):
    await db.expenses.update_one({'_id': ObjectId(expense_id)}, {'$set': {'status': 'approved'}})
    exp = await db.expenses.find_one({'_id': ObjectId(expense_id)})
    if exp:
        await create_notification(exp['user_id'], "Note de frais approuvee", f"Votre note de frais de {exp['amount']} CHF a ete approuvee", "success")
    return {"message": "Note de frais approuvee"}

@router.post("/expenses/{expense_id}/reject")
async def reject_expense(expense_id: str, user=Depends(get_manager_user)):
    await db.expenses.update_one({'_id': ObjectId(expense_id)}, {'$set': {'status': 'rejected'}})
    exp = await db.expenses.find_one({'_id': ObjectId(expense_id)})
    if exp:
        await create_notification(exp['user_id'], "Note de frais refusee", f"Votre note de frais de {exp['amount']} CHF a ete refusee", "error")
    return {"message": "Note de frais refusee"}

@router.put("/expenses/{expense_id}")
async def update_expense(expense_id: str, data: dict, user=Depends(get_current_user)):
    exp = await db.expenses.find_one({'_id': ObjectId(expense_id)})
    if not exp:
        raise HTTPException(status_code=404, detail="Note de frais non trouvee")
    if exp['user_id'] != str(user['_id']) and user['role'] not in [UserRole.MANAGER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Acces refuse")
    update_fields = {}
    for field in ['amount', 'category', 'description', 'date', 'project_id']:
        if field in data:
            update_fields[field] = float(data[field]) if field == 'amount' else data[field]
    if update_fields:
        await db.expenses.update_one({'_id': ObjectId(expense_id)}, {'$set': update_fields})
    return {"message": "Note de frais mise a jour"}

@router.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str, user=Depends(get_current_user)):
    exp = await db.expenses.find_one({'_id': ObjectId(expense_id)})
    if not exp:
        raise HTTPException(status_code=404, detail="Note de frais non trouvee")
    if exp['user_id'] != str(user['_id']) and user['role'] not in [UserRole.MANAGER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Acces refuse")
    await db.expenses.delete_one({'_id': ObjectId(expense_id)})
    return {"message": "Note de frais supprimee"}

# ---- Payroll ----
@router.get("/payroll/variables")
async def get_payroll_variables(month: int, year: int, user_id: Optional[str] = None, user=Depends(get_manager_user)):
    query = {}
    if user_id:
        query['user_id'] = user_id
    users_list = await db.users.find(query if user_id else {}).to_list(500)
    month_start = f"{year}-{month:02d}-01"
    month_end = f"{year + 1}-01-01" if month == 12 else f"{year}-{month + 1:02d}-01"
    payroll = []
    for u in users_list:
        uid = str(u['_id'])
        entries = await db.timeentries.find({'user_id': uid, 'date': {'$gte': month_start, '$lt': month_end}}).to_list(100)
        total_hours = 0
        overtime = 0
        night_hours = 0
        break_total = 0
        contract_hours = u.get('contract_hours', 40)
        daily_target = contract_hours / 5
        for e in entries:
            wh, bh = calculate_duration(e.get('clock_in'), e.get('clock_out'), e.get('break_start'), e.get('break_end'))
            total_hours += wh
            break_total += bh
            overtime += max(0, wh - daily_target)
            if e.get('clock_in') and isinstance(e['clock_in'], datetime):
                if e['clock_in'].hour >= 22 or e['clock_in'].hour < 6:
                    night_hours += wh
        leaves = await db.leaves.find({'user_id': uid, 'status': LeaveStatus.APPROVED, 'start_date': {'$gte': month_start}, 'end_date': {'$lt': month_end}}).to_list(50)
        sick_days = sum(1 for lv in leaves if lv['type'] == LeaveType.SICK)
        vacation_days = sum(1 for lv in leaves if lv['type'] == LeaveType.VACATION)
        expenses = await db.expenses.find({'user_id': uid, 'status': 'approved', 'date': {'$gte': month_start, '$lt': month_end}}).to_list(100)
        expense_total = sum(e['amount'] for e in expenses)
        dept_name = None
        if u.get('department_id'):
            dept = await db.departments.find_one({'_id': ObjectId(u['department_id'])})
            dept_name = dept['name'] if dept else None
        payroll.append({
            'user_id': uid, 'name': f"{u['first_name']} {u['last_name']}",
            'department': dept_name, 'contract_hours': contract_hours,
            'total_hours': round(total_hours, 2), 'overtime_hours': round(overtime, 2),
            'night_hours': round(night_hours, 2), 'break_hours': round(break_total, 2),
            'sick_days': sick_days, 'vacation_days': vacation_days,
            'expense_total': round(expense_total, 2),
            'hourly_rate': u.get('hourly_rate', 0),
            'gross_salary': round(total_hours * u.get('hourly_rate', 0), 2)
        })
    return payroll

@router.get("/payroll/export/{format}")
async def export_payroll(format: str, month: int, year: int, user=Depends(get_manager_user)):
    payroll = await get_payroll_variables(month, year, user=user)
    if format == 'cresus':
        output = BytesIO()
        output.write("Numero;Nom;Heures;Supp;Nuit;Maladie;Vacances;Frais;Brut\n".encode('utf-8'))
        for i, p in enumerate(payroll):
            line = f"{i+1};{p['name']};{p['total_hours']};{p['overtime_hours']};{p['night_hours']};{p['sick_days']};{p['vacation_days']};{p['expense_total']};{p['gross_salary']}\n"
            output.write(line.encode('utf-8'))
        output.seek(0)
        return StreamingResponse(output, media_type='text/csv', headers={'Content-Disposition': f'attachment; filename=cresus_paie_{month}_{year}.csv'})
    elif format == 'abacus':
        output = BytesIO()
        output.write('<?xml version="1.0" encoding="UTF-8"?>\n<AbaPayroll>\n'.encode('utf-8'))
        for i, p in enumerate(payroll):
            output.write(f'  <Employee id="{i+1}" name="{p["name"]}">\n'.encode('utf-8'))
            for tag, key in [('TotalHours', 'total_hours'), ('Overtime', 'overtime_hours'), ('NightHours', 'night_hours'), ('SickDays', 'sick_days'), ('VacationDays', 'vacation_days'), ('Expenses', 'expense_total'), ('GrossSalary', 'gross_salary')]:
                output.write(f'    <{tag}>{p[key]}</{tag}>\n'.encode('utf-8'))
            output.write(f'  </Employee>\n'.encode('utf-8'))
        output.write('</AbaPayroll>\n'.encode('utf-8'))
        output.seek(0)
        return StreamingResponse(output, media_type='application/xml', headers={'Content-Disposition': f'attachment; filename=abacus_paie_{month}_{year}.xml'})
    elif format == 'winbiz':
        wb = Workbook()
        ws = wb.active
        ws.title = f"Paie {month}-{year}"
        ws.append(['No', 'Nom', 'Dept', 'Heures contrat', 'Heures total', 'Supp', 'Nuit', 'Maladie (j)', 'Vacances (j)', 'Frais', 'Taux', 'Brut'])
        for i, p in enumerate(payroll):
            ws.append([i+1, p['name'], p['department'] or '', p['contract_hours'], p['total_hours'], p['overtime_hours'], p['night_hours'], p['sick_days'], p['vacation_days'], p['expense_total'], p['hourly_rate'], p['gross_salary']])
        output = BytesIO()
        wb.save(output)
        output.seek(0)
        return StreamingResponse(output, media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', headers={'Content-Disposition': f'attachment; filename=winbiz_paie_{month}_{year}.xlsx'})
    raise HTTPException(status_code=400, detail="Format non supporte. Utilisez: cresus, abacus, winbiz")
