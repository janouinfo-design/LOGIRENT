from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import Response
from datetime import datetime
import uuid
import base64
import io
import logging

from database import db
from models import ContractGenerate, ContractSign
from deps import get_current_user, get_admin_user
from utils.notifications import create_notification

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage
from reportlab.lib.colors import HexColor, black, white

logger = logging.getLogger(__name__)
router = APIRouter()

PAGE_W, PAGE_H = A4
MARGIN = 15 * mm
CONTENT_W = PAGE_W - 2 * MARGIN

DARK = HexColor('#1A1A2E')
GREY = HexColor('#4B5563')
LIGHT_GREY = HexColor('#9CA3AF')
BORDER = HexColor('#D1D5DB')
ACCENT = HexColor('#2563EB')
LIGHT_BG = HexColor('#F3F4F6')


def _cell(text, bold=False, size=9, color=black, align='LEFT'):
    font = 'Helvetica-Bold' if bold else 'Helvetica'
    return Paragraph(f'<font face="{font}" size="{size}" color="{color}">{text or ""}</font>',
                     ParagraphStyle('c', alignment={'LEFT': TA_LEFT, 'CENTER': TA_CENTER}.get(align, TA_LEFT)))


def _label(text):
    return _cell(text, bold=True, size=8, color='#4B5563')


def _value(text):
    return _cell(str(text) if text else "—", size=9)


def _section_table(data, col_widths):
    t = Table(data, colWidths=col_widths, hAlign='LEFT')
    t.setStyle(TableStyle([
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('LINEBELOW', (0, 0), (-1, -1), 0.5, BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    return t


def generate_contract_pdf(contract_data: dict, signature_base64: str = None) -> bytes:
    lang = contract_data.get("language", "fr")
    d = contract_data
    is_fr = lang == "fr"

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=10 * mm, bottomMargin=8 * mm,
                            leftMargin=12 * mm, rightMargin=12 * mm)

    CW = PAGE_W - 24 * mm  # content width with 12mm margins

    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle('Title1', fontSize=16, fontName='Helvetica-Bold', alignment=TA_CENTER,
                              spaceAfter=1 * mm, textColor=DARK))
    styles.add(ParagraphStyle('SHead', fontSize=9, fontName='Helvetica-Bold', spaceBefore=2 * mm,
                              spaceAfter=1 * mm, textColor=DARK))
    styles.add(ParagraphStyle('Body', fontSize=7, fontName='Helvetica', spaceAfter=1 * mm, leading=9,
                              alignment=TA_JUSTIFY))
    styles.add(ParagraphStyle('Small', fontSize=6.5, fontName='Helvetica', leading=8, textColor=GREY))
    styles.add(ParagraphStyle('Footer', fontSize=7, fontName='Helvetica', alignment=TA_CENTER,
                              textColor=LIGHT_GREY))

    agency_name = d.get("agency_name", "LogiRent")
    contract_number = d.get("contract_number", "—")

    story = []

    # ======================== HEADER (with optional logo) ========================
    logo_path_val = d.get("logo_path")
    logo_cell = _cell(agency_name, bold=True, size=16, color='#1A1A2E')
    if logo_path_val:
        try:
            import os as _os
            from utils.storage import get_object
            logo_bytes, _ = get_object(logo_path_val)
            if logo_bytes and len(logo_bytes) > 100:
                logo_buf = io.BytesIO(logo_bytes)
                logo_cell = RLImage(logo_buf, width=30*mm, height=12*mm)
        except Exception as e:
            logger.warning(f"Logo load error: {e}")

    header_data = [
        [logo_cell,
         _cell("CONTRAT DE LOCATION" if is_fr else "RENTAL CONTRACT", bold=True, size=12, color='#1A1A2E', align='CENTER'),
         _cell(f"N° {contract_number}", bold=True, size=8, color='#4B5563')]
    ]
    header = Table(header_data, colWidths=[45 * mm, CW - 90 * mm, 45 * mm])
    header.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (0, 0), (0, 0), 'LEFT'),
        ('ALIGN', (1, 0), (1, 0), 'CENTER'),
        ('ALIGN', (2, 0), (2, 0), 'RIGHT'),
        ('LINEBELOW', (0, 0), (-1, 0), 1.5, DARK),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(header)
    story.append(Spacer(1, 2 * mm))

    # ======================== VEHICLE SECTION ========================
    vehicle_data = [
        [_label("Vehicule"), _value(d.get("vehicle_name", "")),
         _label("Plaques"), _value(d.get("vehicle_plate", "")),
         _label("Couleur"), _value(d.get("vehicle_color", "")),
         _label("Chassis"), _value(d.get("vehicle_chassis", ""))],
    ]
    vt = Table(vehicle_data, colWidths=[16*mm, 32*mm, 14*mm, 24*mm, 14*mm, 22*mm, 14*mm, CW-136*mm])
    vt.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 0.75, DARK),
        ('INNERGRID', (0, 0), (-1, -1), 0.4, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 2), ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('LEFTPADDING', (0, 0), (-1, -1), 3),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BACKGROUND', (0, 0), (-1, 0), LIGHT_BG),
    ]))
    story.append(vt)
    story.append(Spacer(1, 2 * mm))

    # ======================== TENANT SECTION ========================
    story.append(_cell("Responsable de la location" if is_fr else "Rental responsible", bold=True, size=8))

    half = CW / 2
    c1, c2 = 24 * mm, half - 24 * mm

    tenant_rows = [
        [_label("Nom"), _value(d.get("client_name", "")),
         _label("Prenom"), _value(d.get("client_firstname", ""))],
        [_label("Adresse"), _value(d.get("client_address", "")),
         _label("Tel"), _value(d.get("client_phone", ""))],
        [_label("Email"), _value(d.get("client_email", "")),
         _label("Nationalite"), _value(d.get("client_nationality", ""))],
        [_label("Date naissance"), _value(d.get("client_dob", "")),
         _label("Permis No."), _value(d.get("client_license", ""))],
        [_label("Date emission"), _value(d.get("client_license_issued", "")),
         _label("Date expiration"), _value(d.get("client_license_valid", ""))],
    ]
    tt = Table(tenant_rows, colWidths=[c1, c2, c1, c2])
    tt.setStyle(TableStyle([
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 2), ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('LEFTPADDING', (0, 0), (-1, -1), 3),
        ('LINEBELOW', (0, 0), (-1, -1), 0.4, BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(tt)
    story.append(Spacer(1, 2 * mm))

    # ======================== RENTAL DATES & MILEAGE ========================
    start_date = d.get("start_date", "")
    end_date = d.get("end_date", "")
    start_time = d.get("start_time", "")
    end_time = d.get("end_time", "")

    if start_date and " " in str(start_date):
        parts = str(start_date).split(" ", 1)
        start_date, start_time = parts[0], start_time or (parts[1] if len(parts) > 1 else "")
    if end_date and " " in str(end_date):
        parts = str(end_date).split(" ", 1)
        end_date, end_time = parts[0], end_time or (parts[1] if len(parts) > 1 else "")

    dates_header = [
        _label("Date de Prise"), _label("Heure"), _label("Date de Retour"), _label("Heure"),
        _label("Retour Definitif"), _label("Heure"),
    ]
    dates_values = [
        _value(start_date), _value(start_time), _value(end_date), _value(end_time),
        _value(""), _value(""),
    ]
    dt = Table([dates_header, dates_values],
               colWidths=[CW/6]*6)
    dt.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 0.75, DARK),
        ('INNERGRID', (0, 0), (-1, -1), 0.4, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 2), ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('LEFTPADDING', (0, 0), (-1, -1), 3),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BACKGROUND', (0, 0), (-1, 0), LIGHT_BG),
    ]))
    story.append(dt)
    story.append(Spacer(1, 1 * mm))

    # Km row
    km_data = [[
        _label("Km Depart"), _value(d.get("km_start", "")),
        _label("Km Retour"), _value(d.get("km_return", "")),
        _label("Difference"), _value(""),
    ]]
    kt = Table(km_data, colWidths=[CW/6]*6)
    kt.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 0.75, DARK),
        ('INNERGRID', (0, 0), (-1, -1), 0.4, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 2), ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('LEFTPADDING', (0, 0), (-1, -1), 3),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(kt)
    story.append(Spacer(1, 2 * mm))

    # ======================== PRICING TABLE ========================
    price_headers = [
        "Par Jour", "Week-end\n(Ven-Lun)", "Week-end\n(Sam-Lun)", "A L'heure",
        "Par Semaine", "Par Mois\n2000 Km", "Par Mois\n3000 Km", "Km Suppls",
    ]
    price_per_day = d.get("price_per_day", "")
    if price_per_day:
        try:
            price_per_day = f"CHF {float(price_per_day):.0f}"
        except (ValueError, TypeError):
            price_per_day = str(price_per_day)

    header_row = [_cell("Prix", bold=True, size=7)] + [_cell(h, bold=True, size=6, color='#4B5563', align='CENTER') for h in price_headers]
    price_row = [
        _cell("", size=7),
        _value(price_per_day), _value(d.get("price_weekend_fri", "")),
        _value(d.get("price_weekend_sat", "")), _value(d.get("price_hour", "")),
        _value(d.get("price_week", "")), _value(d.get("price_month_2000", "")),
        _value(d.get("price_month_3000", "")), _value(d.get("price_extra_km", "")),
    ]
    pcw = (CW - 14*mm) / 8
    pt = Table([header_row, price_row], colWidths=[14*mm] + [pcw]*8)
    pt.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 0.75, DARK),
        ('INNERGRID', (0, 0), (-1, -1), 0.4, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 2), ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('LEFTPADDING', (0, 0), (-1, -1), 2), ('RIGHTPADDING', (0, 0), (-1, -1), 2),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
        ('BACKGROUND', (0, 0), (-1, 0), LIGHT_BG),
    ]))
    story.append(pt)
    story.append(Spacer(1, 2 * mm))

    # ======================== LEGAL TEXT ========================
    agency_website = d.get("agency_website", "www.abicar.ch")
    deductible = d.get('deductible', '1000')
    custom_legal = d.get("custom_legal_text")
    if custom_legal:
        # Replace placeholders in custom text
        rendered = custom_legal.replace("{website}", agency_website).replace("{franchise}", str(deductible))
        legal_text = f"<b>Déclaration du locataire</b><br/><br/>" + rendered.replace("\n\n", "<br/><br/>").replace("\n", "<br/>")
    else:
        legal_text = (
            f"<b>Déclaration du locataire</b><br/><br/>"
            f"Le/la soussigné(e) déclare avoir pris connaissance et accepter les conditions générales de location "
            f"disponibles sur le site <b>{agency_website}</b>, lesquelles font partie intégrante du présent document."
            f"<br/><br/>"
            f"Le locataire s'engage à utiliser le véhicule avec diligence et à respecter strictement les dispositions "
            f"de la Loi fédérale sur la circulation routière (LCR) ainsi que toutes les prescriptions légales applicables."
            f"<br/><br/>"
            f"Les dommages couverts par l'assurance Casco collision du loueur sont soumis à une franchise de "
            f"<b>CHF {deductible}.–</b> par sinistre, laquelle demeure entièrement à la charge du locataire ou du "
            f"conducteur responsable."
            f"<br/><br/>"
            f"Le locataire reconnaît être responsable de tout dommage, amende ou frais résultant de l'utilisation "
            f"du véhicule. Le présent document vaut reconnaissance de dette au sens de l'art. 82 LP."
        )
    story.append(Paragraph(legal_text, styles['Body']))
    story.append(Spacer(1, 2 * mm))

    # ======================== FINANCIAL SECTION ========================
    try:
        deposit = float(d.get("deposit", 0) or 0)
    except (ValueError, TypeError):
        deposit = 0
    try:
        total_price = float(d.get("total_price", 0) or 0)
    except (ValueError, TypeError):
        total_price = 0
    total_paid = d.get("total_paid", "")

    fin_data = [
        [_label("Depot (caution)"), _value(f"CHF {deposit:.0f}" if deposit else ""),
         _label("PRIX INCLUS TVA"), _value(f"CHF {total_price:.2f}" if total_price else "")],
        [_label("Rendu"), _value(""),
         _label("Total paye client"), _value(total_paid if total_paid else "")],
    ]
    ft = Table(fin_data, colWidths=[30*mm, CW/2 - 30*mm, 32*mm, CW/2 - 32*mm])
    ft.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 0.75, DARK),
        ('INNERGRID', (0, 0), (-1, -1), 0.4, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 2), ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('LEFTPADDING', (0, 0), (-1, -1), 3),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(ft)
    story.append(Spacer(1, 2 * mm))

    # ======================== VEHICLE INSPECTION ========================
    try:
        import os
        inspection_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'assets', 'inspection-fr.png')
        if os.path.exists(inspection_path):
            story.append(RLImage(inspection_path, width=85 * mm, height=65 * mm, hAlign='CENTER'))
    except Exception as e:
        logger.warning(f"Inspection image error: {e}")

    # Damage annotations
    damages = d.get("damages", {})
    if isinstance(damages, str):
        try:
            import json
            damages = json.loads(damages)
        except Exception:
            damages = {}
    if damages:
        ZONE_LABELS = {
            "pare_chocs_avant": "Pare-chocs avant", "ailiere_gauche_avant": "Ailière G. avant",
            "toit": "Toit", "ailiere_droit_avant": "Ailière D. avant",
            "porte_avant_gauche": "Porte avant G.", "roof": "Toit central",
            "porte_avant_droite": "Porte avant D.", "porte_arriere_gauche": "Porte arrière G.",
            "coffre": "Coffre", "porte_arriere_droite": "Porte arrière D.",
            "ailiere_gauche_arriere": "Ailière G. arrière", "pare_chocs_arriere": "Pare-chocs arrière",
            "ailier_droit_arriere": "Ailier D. arrière",
        }
        dmg_rows = [[_cell("Zone", bold=True, size=7), _cell("Dommage", bold=True, size=7)]]
        for zone_key, desc in damages.items():
            if desc and str(desc).strip():
                label = ZONE_LABELS.get(zone_key, zone_key.replace("_", " ").title())
                dmg_rows.append([_cell(label, bold=True, size=7), _cell(str(desc), size=7)])
        if len(dmg_rows) > 1:
            dmg_table = Table(dmg_rows, colWidths=[40*mm, CW - 40*mm])
            dmg_table.setStyle(TableStyle([
                ('BOX', (0, 0), (-1, -1), 0.75, DARK),
                ('INNERGRID', (0, 0), (-1, -1), 0.4, BORDER),
                ('TOPPADDING', (0, 0), (-1, -1), 1.5), ('BOTTOMPADDING', (0, 0), (-1, -1), 1.5),
                ('LEFTPADDING', (0, 0), (-1, -1), 3),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('BACKGROUND', (0, 0), (-1, 0), HexColor('#FEE2E2')),
            ]))
            story.append(dmg_table)

    story.append(Spacer(1, 2 * mm))

    # ======================== SIGNATURE ========================
    city = d.get("agency_city", "Lausanne")
    sig_date = d.get("signature_date", "____________________")

    sig_data = [
        [_cell(f"{city}, le {sig_date}", size=8), _cell("Signature :", bold=True, size=8)]
    ]

    signature_added = False
    if signature_base64:
        try:
            sig_bytes = base64.b64decode(
                signature_base64.split(',')[-1] if ',' in signature_base64 else signature_base64)
            if len(sig_bytes) > 100:
                from PIL import Image as PILImage
                PILImage.open(io.BytesIO(sig_bytes)).verify()
                sig_buffer = io.BytesIO(sig_bytes)
                sig_data.append([_cell(""), RLImage(sig_buffer, width=45*mm, height=18*mm)])
                signature_added = True
        except Exception as e:
            logger.warning(f"Signature error: {e}")

    if not signature_added:
        sig_data.append([_cell(""), _cell("____________________________", size=8)])

    st = Table(sig_data, colWidths=[CW/2, CW/2])
    st.setStyle(TableStyle([
        ('TOPPADDING', (0, 0), (-1, -1), 2), ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('VALIGN', (0, 0), (-1, -1), 'BOTTOM'),
        ('ALIGN', (1, 0), (1, -1), 'CENTER'),
    ]))
    story.append(st)

    # ======================== FOOTER ========================
    agency_address = d.get("agency_address", "")
    agency_phone = d.get("agency_phone", "")
    agency_email = d.get("agency_email", "")
    agency_website_footer = d.get("agency_website", "")

    footer_parts = [p for p in [agency_address, agency_phone, agency_email, agency_website_footer] if p]
    if footer_parts:
        story.append(Spacer(1, 1 * mm))
        story.append(Paragraph(
            f'<font face="Helvetica" size="6" color="#9CA3AF">{"  |  ".join(footer_parts)}</font>',
            styles['Footer']))

    doc.build(story)
    return buffer.getvalue()


# ==================== ROUTES ====================

@router.post("/admin/contracts/generate")
async def generate_contract(data: ContractGenerate, user: dict = Depends(get_admin_user)):
    reservation = await db.reservations.find_one({"id": data.reservation_id}, {"_id": 0})
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")

    if user.get('role') != 'super_admin' and reservation.get('agency_id') != user.get('agency_id'):
        raise HTTPException(status_code=403, detail="Access denied")

    client_doc = await db.users.find_one({"id": reservation["user_id"]}, {"_id": 0})
    vehicle = await db.vehicles.find_one({"id": reservation["vehicle_id"]}, {"_id": 0})
    agency = await db.agencies.find_one({"id": reservation.get("agency_id")}, {"_id": 0})

    if not client_doc or not vehicle:
        raise HTTPException(status_code=404, detail="Client or vehicle not found")

    # Format dates
    start_date = reservation.get("start_date", "")
    end_date = reservation.get("end_date", "")
    start_date_str = ""
    start_time_str = ""
    end_date_str = ""
    end_time_str = ""

    for dt_val, setter_d, setter_t in [
        (start_date, lambda v: None, lambda v: None),
        (end_date, lambda v: None, lambda v: None),
    ]:
        pass

    # Parse start date
    if isinstance(start_date, datetime):
        start_date_str = start_date.strftime("%d/%m/%Y")
        start_time_str = start_date.strftime("%H:%M")
    elif isinstance(start_date, str):
        try:
            parsed = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            start_date_str = parsed.strftime("%d/%m/%Y")
            start_time_str = parsed.strftime("%H:%M")
        except Exception:
            start_date_str = str(start_date)

    # Parse end date
    if isinstance(end_date, datetime):
        end_date_str = end_date.strftime("%d/%m/%Y")
        end_time_str = end_date.strftime("%H:%M")
    elif isinstance(end_date, str):
        try:
            parsed = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            end_date_str = parsed.strftime("%d/%m/%Y")
            end_time_str = parsed.strftime("%H:%M")
        except Exception:
            end_date_str = str(end_date)

    # Count existing contracts for numbering
    contract_count = await db.contracts.count_documents({})

    contract_data = {
        "language": data.language,
        "contract_number": str(contract_count + 1),
        "agency_name": agency.get("name", "LogiRent") if agency else "LogiRent",
        "agency_address": agency.get("address", "") if agency else "",
        "agency_phone": agency.get("phone", "") if agency else "",
        "agency_email": agency.get("email", "") if agency else "",
        "agency_website": agency.get("website", "") if agency else "",
        "agency_city": agency.get("city", "Lausanne") if agency else "Lausanne",
        # Client info
        "client_name": client_doc.get("name", ""),
        "client_firstname": client_doc.get("first_name", client_doc.get("name", "").split(" ")[0] if " " in client_doc.get("name", "") else ""),
        "client_dob": client_doc.get("birth_year", "") and f"{client_doc.get('birth_year', '')} - {client_doc.get('birth_place', '')}" or client_doc.get("date_of_birth", ""),
        "client_phone": client_doc.get("phone", ""),
        "client_email": client_doc.get("email", ""),
        "client_address": client_doc.get("address", ""),
        "client_nationality": client_doc.get("nationality", ""),
        "client_license": client_doc.get("license_number", ""),
        "client_license_issued": client_doc.get("license_issue_date", "") or client_doc.get("license_issued", ""),
        "client_license_valid": client_doc.get("license_expiry_date", "") or client_doc.get("license_valid_until", ""),
        # Vehicle info
        "vehicle_name": f"{vehicle.get('brand', '')} {vehicle.get('model', '')}",
        "vehicle_plate": vehicle.get("plate_number", "") or vehicle.get("plate", ""),
        "vehicle_color": vehicle.get("color", ""),
        "vehicle_chassis": vehicle.get("chassis_number", "") or vehicle.get("chassis", ""),
        # Dates
        "start_date": start_date_str,
        "start_time": start_time_str,
        "end_date": end_date_str,
        "end_time": end_time_str,
        # Km
        "km_start": str(vehicle.get("mileage", "")) if vehicle.get("mileage") else "",
        "km_return": "",
        # Pricing
        "price_per_day": vehicle.get("price_per_day", ""),
        "total_price": reservation.get("total_price", 0),
        "deposit": reservation.get("deposit", 0),
        "deductible": "1000",
    }

    # Apply agency contract template defaults
    agency_id = reservation.get("agency_id")
    if agency_id:
        template = await db.contract_templates.find_one({"agency_id": agency_id}, {"_id": 0})
        if template:
            if template.get("deductible"):
                contract_data["deductible"] = template["deductible"]
            if template.get("agency_website"):
                contract_data["agency_website"] = template["agency_website"]
            if template.get("legal_text"):
                contract_data["custom_legal_text"] = template["legal_text"]
            if template.get("logo_path"):
                contract_data["logo_path"] = template["logo_path"]
            dp = template.get("default_prices", {})
            if dp:
                for pk in ["price_per_day", "price_weekend_fri", "price_weekend_sat",
                           "price_hour", "price_week", "price_month_2000",
                           "price_month_3000", "price_extra_km"]:
                    if dp.get(pk) and not contract_data.get(pk):
                        contract_data[pk] = dp[pk]

    existing = await db.contracts.find_one({"reservation_id": data.reservation_id}, {"_id": 0})
    if existing:
        await db.contracts.update_one(
            {"reservation_id": data.reservation_id},
            {"$set": {"contract_data": contract_data, "language": data.language,
                      "updated_at": datetime.utcnow().isoformat()}}
        )
        return {"message": "Contrat mis a jour", "contract_id": existing["id"]}

    contract_id = str(uuid.uuid4())
    contract = {
        "id": contract_id,
        "reservation_id": data.reservation_id,
        "agency_id": reservation.get("agency_id"),
        "user_id": reservation["user_id"],
        "vehicle_id": reservation["vehicle_id"],
        "language": data.language,
        "status": "draft",
        "contract_data": contract_data,
        "signature_client": None,
        "signature_date": None,
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }
    await db.contracts.insert_one(contract)
    return {"message": "Contrat genere", "contract_id": contract_id}


@router.put("/admin/contracts/{contract_id}/update-fields")
async def update_contract_fields(contract_id: str, fields: dict, user: dict = Depends(get_admin_user)):
    """Allow admin to update editable contract data fields before signing"""
    contract = await db.contracts.find_one({"id": contract_id}, {"_id": 0})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    if user.get('role') != 'super_admin' and contract.get('agency_id') != user.get('agency_id'):
        raise HTTPException(status_code=403, detail="Access denied")
    if contract.get("status") == "signed":
        raise HTTPException(status_code=400, detail="Cannot edit a signed contract")

    EDITABLE = {
        "vehicle_plate", "vehicle_color", "vehicle_chassis",
        "km_start", "km_return",
        "client_name", "client_firstname", "client_address", "client_phone",
        "client_email", "client_nationality", "client_dob",
        "client_license", "client_license_issued", "client_license_valid",
        "deposit", "deductible",
        "price_per_day", "price_weekend_fri", "price_weekend_sat",
        "price_hour", "price_week", "price_month_2000", "price_month_3000", "price_extra_km",
        "damages",
    }
    updates = {}
    for k, v in fields.items():
        if k in EDITABLE:
            if k == "damages" and isinstance(v, str):
                try:
                    import json
                    v = json.loads(v)
                except Exception:
                    pass
            updates[f"contract_data.{k}"] = v

    if updates:
        updates["updated_at"] = datetime.utcnow().isoformat()
        await db.contracts.update_one({"id": contract_id}, {"$set": updates})

    updated = await db.contracts.find_one({"id": contract_id}, {"_id": 0})
    return updated


@router.get("/admin/contracts")
async def list_contracts(user: dict = Depends(get_admin_user)):
    f = {} if user.get('role') == 'super_admin' else {"agency_id": user.get('agency_id')}
    contracts = await db.contracts.find(f, {"_id": 0}).sort("created_at", -1).to_list(200)
    return contracts


@router.get("/contracts/{contract_id}")
async def get_contract(contract_id: str, user: dict = Depends(get_current_user)):
    contract = await db.contracts.find_one({"id": contract_id}, {"_id": 0})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    if user.get('role') == 'client' and contract.get('user_id') != user.get('id'):
        raise HTTPException(status_code=403, detail="Access denied")
    if user.get('role') == 'admin' and contract.get('agency_id') != user.get('agency_id'):
        raise HTTPException(status_code=403, detail="Access denied")
    return contract


@router.get("/contracts/by-reservation/{reservation_id}")
async def get_contract_by_reservation(reservation_id: str, user: dict = Depends(get_current_user)):
    contract = await db.contracts.find_one({"reservation_id": reservation_id}, {"_id": 0})
    if not contract:
        return None
    return contract


@router.put("/contracts/{contract_id}/send")
async def send_contract(contract_id: str, user: dict = Depends(get_admin_user)):
    contract = await db.contracts.find_one({"id": contract_id}, {"_id": 0})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    if user.get('role') != 'super_admin' and contract.get('agency_id') != user.get('agency_id'):
        raise HTTPException(status_code=403, detail="Access denied")
    await db.contracts.update_one({"id": contract_id},
                                  {"$set": {"status": "sent", "updated_at": datetime.utcnow().isoformat()}})

    client_doc = await db.users.find_one({"id": contract["user_id"]}, {"_id": 0})
    if client_doc:
        msg = ("Un contrat de location est pret pour votre signature."
               if contract.get("language", "fr") == "fr"
               else "A rental contract is ready for your signature.")
        await create_notification(contract["user_id"], "contract", msg, contract_id)
    return {"message": "Contrat envoye au client"}


@router.put("/contracts/{contract_id}/sign")
async def sign_contract(contract_id: str, data: ContractSign, user: dict = Depends(get_current_user)):
    contract = await db.contracts.find_one({"id": contract_id}, {"_id": 0})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    if contract.get("user_id") != user.get("id") and user.get("role") not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Only the tenant can sign")
    if contract.get("status") == "signed":
        raise HTTPException(status_code=400, detail="Contract already signed")

    now = datetime.utcnow()
    await db.contracts.update_one(
        {"id": contract_id},
        {"$set": {
            "signature_client": data.signature_data,
            "signature_date": now.isoformat(),
            "status": "signed",
            "updated_at": now.isoformat(),
            "contract_data.signature_date": now.strftime("%d/%m/%Y"),
        }}
    )
    return {"message": "Contrat signe avec succes"}


@router.get("/contracts/{contract_id}/pdf")
async def download_contract_pdf(contract_id: str, user: dict = Depends(get_current_user)):
    contract = await db.contracts.find_one({"id": contract_id}, {"_id": 0})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    if user.get('role') == 'client' and contract.get('user_id') != user.get('id'):
        raise HTTPException(status_code=403, detail="Access denied")
    if user.get('role') == 'admin' and contract.get('agency_id') != user.get('agency_id'):
        raise HTTPException(status_code=403, detail="Access denied")

    pdf_bytes = generate_contract_pdf(contract.get("contract_data", {}), contract.get("signature_client"))
    return Response(content=pdf_bytes, media_type="application/pdf",
                    headers={"Content-Disposition": f"attachment; filename=contrat_{contract_id[:8]}.pdf"})
