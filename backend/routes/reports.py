from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from typing import Optional
from bson import ObjectId
from datetime import datetime
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from openpyxl import Workbook
from config import db
from models.enums import UserRole
from utils.auth import get_current_user
from utils.helpers import calculate_duration

router = APIRouter()

@router.get("/reports/pdf")
async def generate_pdf_report(user_id: Optional[str] = None, month: Optional[int] = None, year: Optional[int] = None, user=Depends(get_current_user)):
    target_user_id = user_id if user['role'] in [UserRole.MANAGER, UserRole.ADMIN] and user_id else str(user['_id'])
    target_user = await db.users.find_one({'_id': ObjectId(target_user_id)})
    if not target_user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouve")
    now = datetime.utcnow()
    target_month = month or now.month
    target_year = year or now.year
    month_start = f"{target_year}-{target_month:02d}-01"
    month_end = f"{target_year + 1}-01-01" if target_month == 12 else f"{target_year}-{target_month + 1:02d}-01"
    entries = await db.timeentries.find({'user_id': target_user_id, 'date': {'$gte': month_start, '$lt': month_end}}).sort('date', 1).to_list(100)
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    elements = []
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], alignment=1)
    elements.append(Paragraph(f"Rapport de temps - {target_month:02d}/{target_year}", title_style))
    elements.append(Spacer(1, 12))
    elements.append(Paragraph(f"Employe: {target_user['first_name']} {target_user['last_name']}", styles['Normal']))
    elements.append(Paragraph(f"Email: {target_user['email']}", styles['Normal']))
    elements.append(Spacer(1, 12))
    data = [['Date', 'Arrivee', 'Depart', 'Pause', 'Heures', 'Facturable', 'Statut']]
    total_hours = 0
    billable_hours = 0
    for e in entries:
        work_hours, break_hours = calculate_duration(e.get('clock_in'), e.get('clock_out'), e.get('break_start'), e.get('break_end'))
        total_hours += work_hours
        if e.get('billable', True):
            billable_hours += work_hours
        clock_in = e['clock_in'].strftime('%H:%M') if e.get('clock_in') else '-'
        clock_out = e['clock_out'].strftime('%H:%M') if e.get('clock_out') else '-'
        status_map = {'pending': 'En attente', 'approved': 'Approuve', 'rejected': 'Refuse', 'draft': 'Brouillon'}
        data.append([e['date'], clock_in, clock_out, f"{break_hours:.1f}h", f"{work_hours:.1f}h", 'Oui' if e.get('billable', True) else 'Non', status_map.get(e.get('status', 'pending'), 'En attente')])
    data.append(['', '', '', '', '', '', ''])
    data.append(['', '', '', 'Total:', f"{total_hours:.1f}h", '', ''])
    data.append(['', '', '', 'Facturable:', f"{billable_hours:.1f}h", '', ''])
    table = Table(data, colWidths=[65, 50, 50, 45, 50, 55, 70])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey), ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'), ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9), ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -4), colors.beige), ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('FONTNAME', (0, -2), (-1, -1), 'Helvetica-Bold'),
    ]))
    elements.append(table)
    elements.append(Spacer(1, 20))
    elements.append(Paragraph(f"Genere le {datetime.utcnow().strftime('%d/%m/%Y a %H:%M')}", styles['Normal']))
    doc.build(elements)
    buffer.seek(0)
    filename = f"rapport_{target_user['last_name']}_{target_month:02d}_{target_year}.pdf"
    return StreamingResponse(buffer, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename={filename}"})

@router.get("/reports/excel")
async def generate_excel_report(user_id: Optional[str] = None, month: Optional[int] = None, year: Optional[int] = None, user=Depends(get_current_user)):
    target_user_id = user_id if user['role'] in [UserRole.MANAGER, UserRole.ADMIN] and user_id else str(user['_id'])
    target_user = await db.users.find_one({'_id': ObjectId(target_user_id)})
    if not target_user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouve")
    now = datetime.utcnow()
    target_month = month or now.month
    target_year = year or now.year
    month_start = f"{target_year}-{target_month:02d}-01"
    month_end = f"{target_year + 1}-01-01" if target_month == 12 else f"{target_year}-{target_month + 1:02d}-01"
    entries = await db.timeentries.find({'user_id': target_user_id, 'date': {'$gte': month_start, '$lt': month_end}}).sort('date', 1).to_list(100)
    wb = Workbook()
    ws = wb.active
    ws.title = f"Rapport {target_month:02d}-{target_year}"
    ws.append(['Rapport de temps', '', '', '', '', '', ''])
    ws.append([f"Employe: {target_user['first_name']} {target_user['last_name']}", '', '', '', '', '', ''])
    ws.append([''])
    ws.append(['Date', 'Arrivee', 'Depart', 'Pause (h)', 'Heures', 'Facturable', 'Statut'])
    total_hours = 0
    billable_hours = 0
    for e in entries:
        work_hours, break_hours = calculate_duration(e.get('clock_in'), e.get('clock_out'), e.get('break_start'), e.get('break_end'))
        total_hours += work_hours
        if e.get('billable', True):
            billable_hours += work_hours
        clock_in = e['clock_in'].strftime('%H:%M') if e.get('clock_in') else '-'
        clock_out = e['clock_out'].strftime('%H:%M') if e.get('clock_out') else '-'
        status_map = {'pending': 'En attente', 'approved': 'Approuve', 'rejected': 'Refuse'}
        ws.append([e['date'], clock_in, clock_out, round(break_hours, 2), round(work_hours, 2), 'Oui' if e.get('billable', True) else 'Non', status_map.get(e.get('status', 'pending'), 'En attente')])
    ws.append([''])
    ws.append(['', '', '', 'Total heures:', round(total_hours, 2), '', ''])
    ws.append(['', '', '', 'Heures facturables:', round(billable_hours, 2), '', ''])
    buffer = BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    filename = f"rapport_{target_user['last_name']}_{target_month:02d}_{target_year}.xlsx"
    return StreamingResponse(buffer, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": f"attachment; filename={filename}"})
