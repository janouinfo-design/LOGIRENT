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
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=12 * mm, bottomMargin=12 * mm,
                            leftMargin=MARGIN, rightMargin=MARGIN)

    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle('Title1', fontSize=18, fontName='Helvetica-Bold', alignment=TA_CENTER,
                              spaceAfter=2 * mm, textColor=DARK))
    styles.add(ParagraphStyle('Title2', fontSize=14, fontName='Helvetica-Bold', alignment=TA_CENTER,
                              spaceAfter=4 * mm, textColor=DARK, borderWidth=1))
    styles.add(ParagraphStyle('SHead', fontSize=11, fontName='Helvetica-Bold', spaceBefore=4 * mm,
                              spaceAfter=2 * mm, textColor=DARK))
    styles.add(ParagraphStyle('Body', fontSize=9, fontName='Helvetica', spaceAfter=1.5 * mm, leading=13,
                              alignment=TA_JUSTIFY))
    styles.add(ParagraphStyle('Small', fontSize=8, fontName='Helvetica', spaceAfter=1 * mm, leading=11,
                              textColor=GREY))
    styles.add(ParagraphStyle('Footer', fontSize=8, fontName='Helvetica', alignment=TA_CENTER,
                              textColor=LIGHT_GREY))

    agency_name = d.get("agency_name", "LogiRent")
    contract_number = d.get("contract_number", "—")

    story = []

    # ======================== HEADER ========================
    header_data = [
        [_cell(agency_name, bold=True, size=20, color='#1A1A2E'),
         _cell("CONTRAT DE LOCATION" if is_fr else "RENTAL CONTRACT", bold=True, size=14, color='#1A1A2E', align='CENTER'),
         _cell(f"{'N° du contrat' if is_fr else 'Contract No.'} : {contract_number}", bold=True, size=9, color='#4B5563')]
    ]
    header = Table(header_data, colWidths=[50 * mm, 70 * mm, 50 * mm])
    header.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (0, 0), (0, 0), 'LEFT'),
        ('ALIGN', (1, 0), (1, 0), 'CENTER'),
        ('ALIGN', (2, 0), (2, 0), 'RIGHT'),
        ('LINEBELOW', (0, 0), (-1, 0), 1.5, DARK),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(header)
    story.append(Spacer(1, 4 * mm))

    # ======================== VEHICLE SECTION ========================
    lbl_vehicle = "Vehicule" if is_fr else "Vehicle"
    lbl_plates = "Plaques" if is_fr else "Plates"
    lbl_color = "Couleur" if is_fr else "Color"

    vehicle_data = [
        [_label(lbl_vehicle), _value(d.get("vehicle_name", "")),
         _label(lbl_plates), _value(d.get("vehicle_plate", "")),
         _label(lbl_color), _value(d.get("vehicle_color", ""))],
    ]
    vt = Table(vehicle_data, colWidths=[18 * mm, 40 * mm, 18 * mm, 32 * mm, 18 * mm, 40 * mm])
    vt.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), LIGHT_BG),
        ('BOX', (0, 0), (-1, -1), 1, DARK),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(vt)
    story.append(Spacer(1, 3 * mm))

    # ======================== TENANT SECTION ========================
    lbl = {
        "responsible": "Responsable de la location" if is_fr else "Rental responsible",
        "nom": "Nom" if is_fr else "Last name",
        "prenom": "Prenom" if is_fr else "First name",
        "adresse": "Adresse" if is_fr else "Address",
        "tel": "Tel" if is_fr else "Phone",
        "email": "Email",
        "nationalite": "Nationalite" if is_fr else "Nationality",
        "naissance": "Lieu et Annee de Naissance" if is_fr else "Place and Year of Birth",
        "permis": "Permis No." if is_fr else "License No.",
        "emission": "Date d'emission" if is_fr else "Issue date",
        "expiration": "Date d'expiration" if is_fr else "Expiry date",
        "autre_conducteur": "Autre conducteur" if is_fr else "Other driver",
    }

    story.append(Paragraph(f'<b>{lbl["responsible"]}</b>', styles['SHead']))

    c1 = 30 * mm
    c2 = 55 * mm
    c3 = 30 * mm
    c4 = 55 * mm

    tenant_rows = [
        [_label(lbl["nom"]), _value(d.get("client_name", "")),
         _label(lbl["prenom"]), _value(d.get("client_firstname", ""))],
        [_label(lbl["adresse"]), _value(d.get("client_address", "")),
         _label(lbl["tel"]), _value(d.get("client_phone", ""))],
        [_label(lbl["email"]), _value(d.get("client_email", "")),
         _label(lbl["nationalite"]), _value(d.get("client_nationality", ""))],
    ]
    tt = _section_table(tenant_rows, [c1, c2, c3, c4])
    story.append(tt)
    story.append(Spacer(1, 1.5 * mm))

    # License info
    license_rows = [
        [_label(lbl["naissance"]), _value(d.get("client_dob", "")),
         _label(lbl["permis"]), _value(d.get("client_license", ""))],
        [_label(lbl["emission"]), _value(d.get("client_license_issued", "")),
         _label(lbl["expiration"]), _value(d.get("client_license_valid", ""))],
    ]
    lt = _section_table(license_rows, [c1, c2, c3, c4])
    story.append(lt)
    story.append(Spacer(1, 3 * mm))

    # ======================== RENTAL DATES & MILEAGE ========================
    lbl_prise = "Date de Prise" if is_fr else "Pickup Date"
    lbl_retour = "Date de Retour" if is_fr else "Return Date"
    lbl_heure = "Heure" if is_fr else "Time"
    lbl_retour_def = "Retour Definitif" if is_fr else "Actual Return"
    lbl_km_dep = "Km Depart" if is_fr else "Start Km"
    lbl_km_ret = "Km Retour" if is_fr else "Return Km"
    lbl_diff = "Difference" if is_fr else "Difference"

    start_date = d.get("start_date", "")
    end_date = d.get("end_date", "")
    start_time = d.get("start_time", "")
    end_time = d.get("end_time", "")

    # Parse date and time if combined
    if start_date and " " in str(start_date):
        parts = str(start_date).split(" ", 1)
        start_date = parts[0]
        start_time = start_time or parts[1] if len(parts) > 1 else ""
    if end_date and " " in str(end_date):
        parts = str(end_date).split(" ", 1)
        end_date = parts[0]
        end_time = end_time or parts[1] if len(parts) > 1 else ""

    dates_data = [
        [_label(lbl_prise), _value(start_date), _label(lbl_heure), _value(start_time),
         _label(lbl_km_dep), _value(d.get("km_start", ""))],
        [_label(lbl_retour), _value(end_date), _label(lbl_heure), _value(end_time),
         _label(lbl_km_ret), _value(d.get("km_return", ""))],
        [_label(lbl_retour_def), _value(""), _label(lbl_heure), _value(""),
         _label(lbl_diff), _value("")],
    ]
    dt = Table(dates_data, colWidths=[28 * mm, 30 * mm, 14 * mm, 20 * mm, 28 * mm, 46 * mm])
    dt.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 1, DARK),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 3),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BACKGROUND', (0, 0), (-1, 0), LIGHT_BG),
    ]))
    story.append(dt)
    story.append(Spacer(1, 3 * mm))

    # ======================== PRICING TABLE ========================
    lbl_prix = "Prix" if is_fr else "Price"
    price_headers = [
        "Par Jour" if is_fr else "Per Day",
        "Week-end\n(Ven-Lun)" if is_fr else "Weekend\n(Fri-Mon)",
        "Week-end\n(Sam-Lun)" if is_fr else "Weekend\n(Sat-Mon)",
        "A L'heure" if is_fr else "Per Hour",
        "Par Semaine" if is_fr else "Per Week",
        "Par Mois\n2000 Km" if is_fr else "Per Month\n2000 Km",
        "Par Mois\n3000 Km" if is_fr else "Per Month\n3000 Km",
        "Km Suppls" if is_fr else "Extra Km",
    ]

    price_per_day = d.get("price_per_day", "")
    if price_per_day:
        try:
            price_per_day = f"CHF {float(price_per_day):.0f}"
        except (ValueError, TypeError):
            price_per_day = str(price_per_day)

    price_row = [
        _cell(lbl_prix, bold=True, size=8),
        _value(price_per_day),
        _value(d.get("price_weekend_fri", "")),
        _value(d.get("price_weekend_sat", "")),
        _value(d.get("price_hour", "")),
        _value(d.get("price_week", "")),
        _value(d.get("price_month_2000", "")),
        _value(d.get("price_month_3000", "")),
        _value(d.get("price_extra_km", "")),
    ]

    header_row = [_cell("", size=7)] + [_cell(h, bold=True, size=7, color='#4B5563', align='CENTER') for h in price_headers]

    pt = Table([header_row, price_row],
               colWidths=[16 * mm] + [21.25 * mm] * 8)
    pt.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 1, DARK),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 2),
        ('RIGHTPADDING', (0, 0), (-1, -1), 2),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
        ('BACKGROUND', (0, 0), (-1, 0), LIGHT_BG),
    ]))
    story.append(pt)
    story.append(Spacer(1, 4 * mm))

    # ======================== LEGAL CONDITIONS ========================
    agency_website = d.get("agency_website", "www.abicar.ch")
    deductible = d.get('deductible', '1000')
    if is_fr:
        legal_text = (
            f"Le/la soussign\u00e9(e) d\u00e9clare avoir pris connaissance et accepter sans r\u00e9serve les conditions "
            f"g\u00e9n\u00e9rales disponibles sur le site <b>{agency_website}</b>, lesquelles font partie "
            f"int\u00e9grante du pr\u00e9sent contrat, conform\u00e9ment au Code des obligations (CO), "
            "notamment aux art. 1 ss CO (formation du contrat)."
            "<br/><br/>"
            "Les dommages relevant de la garantie Casco collision sont couverts par l'assurance du loueur, "
            f"sous r\u00e9serve d'une franchise contractuelle de <b>CHF {deductible}.\u2013</b> par sinistre, "
            "laquelle demeure int\u00e9gralement \u00e0 la charge du locataire responsable, "
            "conform\u00e9ment au principe de responsabilit\u00e9 contractuelle (art. 97 CO)."
            "<br/><br/>"
            "Le pr\u00e9sent document vaut reconnaissance de dette au sens de l'art. 82 CO et peut "
            "\u00eatre produit \u00e0 titre de titre de mainlev\u00e9e provisoire conform\u00e9ment \u00e0 l'art. 82 "
            "de la Loi f\u00e9d\u00e9rale sur la poursuite pour dettes et la faillite (LP)."
        )
    else:
        legal_text = (
            f"The undersigned declares having read and accepted without reservation the general conditions "
            f"available on the website <b>{agency_website}</b>, which form an integral part of this contract, "
            "in accordance with the Swiss Code of Obligations (CO), in particular art. 1 ff. CO (contract formation)."
            "<br/><br/>"
            "Damages covered under the Collision insurance are insured by the lessor, subject to a contractual "
            f"deductible of <b>CHF {deductible}.\u2013</b> per claim, which remains entirely the responsibility "
            "of the liable tenant, in accordance with the principle of contractual liability (art. 97 CO)."
            "<br/><br/>"
            "This document constitutes an acknowledgment of debt within the meaning of art. 82 CO and may be "
            "used as a provisional enforcement title in accordance with art. 82 of the Federal Act on Debt "
            "Enforcement and Bankruptcy (LP)."
        )
    story.append(Paragraph(legal_text, styles['Body']))
    story.append(Spacer(1, 3 * mm))

    # ======================== FINANCIAL SECTION ========================
    # Convert to float safely (may be string from update-fields)
    try:
        deposit = float(d.get("deposit", 0) or 0)
    except (ValueError, TypeError):
        deposit = 0
    try:
        total_price = float(d.get("total_price", 0) or 0)
    except (ValueError, TypeError):
        total_price = 0
    total_paid = d.get("total_paid", "")

    lbl_depot = "Depot (caution)" if is_fr else "Deposit (caution)"
    lbl_rendu = "Rendu" if is_fr else "Returned"
    lbl_prix_ttc = "PRIX INCLUS TVA" if is_fr else "PRICE INCLUDING VAT"
    lbl_total_paye = "Total paye client" if is_fr else "Total paid by client"

    fin_data = [
        [_label(lbl_depot), _value(f"CHF {deposit:.2f}" if deposit else ""),
         _label(lbl_prix_ttc), _value(f"CHF {total_price:.2f}" if total_price else "")],
        [_label(lbl_rendu), _value(""),
         _label(lbl_total_paye), _value(total_paid if total_paid else "")],
    ]
    ft = Table(fin_data, colWidths=[35 * mm, 50 * mm, 40 * mm, 45 * mm])
    ft.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 1, DARK),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BACKGROUND', (0, 0), (-1, 0), LIGHT_BG),
    ]))
    story.append(ft)
    story.append(Spacer(1, 4 * mm))

    # ======================== SIGNATURE SECTION ========================
    city = d.get("agency_city", "Lausanne")
    sig_date = d.get("signature_date", "____________________")
    lbl_lieu_date = f"{city}, {'le' if is_fr else 'on'} {sig_date}"

    story.append(Paragraph(lbl_lieu_date, styles['Body']))
    story.append(Spacer(1, 3 * mm))

    lbl_sig = "Signature" if is_fr else "Signature"
    signature_added = False
    if signature_base64:
        try:
            sig_bytes = base64.b64decode(
                signature_base64.split(',')[-1] if ',' in signature_base64 else signature_base64)
            if len(sig_bytes) > 100:
                sig_buffer = io.BytesIO(sig_bytes)
                # Validate image can be opened before adding to story
                from PIL import Image as PILImage
                test_img = PILImage.open(io.BytesIO(sig_bytes))
                test_img.verify()  # Verify it's a valid image
                # Re-create buffer for RLImage (verify() closes file)
                sig_buffer = io.BytesIO(sig_bytes)
                sig_label_style = ParagraphStyle('siglbl', fontSize=9, fontName='Helvetica-Bold', textColor=GREY)
                story.append(Paragraph(f"{lbl_sig} :", sig_label_style))
                story.append(RLImage(sig_buffer, width=55 * mm, height=22 * mm))
                signature_added = True
        except Exception as e:
            logger.warning(f"Failed to add signature image to PDF: {e}")
    
    if not signature_added:
        story.append(Paragraph(f"{lbl_sig} : ____________________________", styles['Body']))

    story.append(Spacer(1, 6 * mm))

    # ======================== FOOTER ========================
    agency_address = d.get("agency_address", "")
    agency_phone = d.get("agency_phone", "")
    agency_email = d.get("agency_email", "")
    agency_website = d.get("agency_website", "")

    footer_parts = [p for p in [agency_address, agency_phone, agency_email, agency_website] if p]
    if footer_parts:
        footer_line = "  |  ".join(footer_parts)
        story.append(Spacer(1, 2 * mm))
        story.append(Paragraph(
            f'<font face="Helvetica" size="7" color="#9CA3AF">{"-" * 80}</font>',
            styles['Footer']))
        story.append(Paragraph(footer_line, styles['Footer']))

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
        "client_dob": client_doc.get("date_of_birth", ""),
        "client_phone": client_doc.get("phone", ""),
        "client_email": client_doc.get("email", ""),
        "client_address": client_doc.get("address", ""),
        "client_nationality": client_doc.get("nationality", ""),
        "client_license": client_doc.get("license_number", ""),
        "client_license_issued": client_doc.get("license_issued", ""),
        "client_license_valid": client_doc.get("license_valid_until", ""),
        # Vehicle info
        "vehicle_name": f"{vehicle.get('brand', '')} {vehicle.get('model', '')}",
        "vehicle_plate": vehicle.get("plate", ""),
        "vehicle_color": vehicle.get("color", ""),
        "vehicle_chassis": vehicle.get("chassis", ""),
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
    }
    updates = {}
    for k, v in fields.items():
        if k in EDITABLE:
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
        raise HTTPException(status_code=404, detail="No contract for this reservation")
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
