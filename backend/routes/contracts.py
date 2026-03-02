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
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage, PageBreak
from reportlab.lib.colors import HexColor

logger = logging.getLogger(__name__)
router = APIRouter()

CONTRACT_TEMPLATES = {
    "fr": {
        "title": "CONTRAT DE LOCATION DE VÉHICULE",
        "section1": "1. Informations du Locataire",
        "section2": "2. Véhicule",
        "section3": "3. Prix et Paiement",
        "section4": "4. Caution",
        "section5": "5. Assurance et Responsabilité",
        "section6": "6. Reconnaissance de Dette",
        "section7": "7. For Juridique",
        "conditions_title": "CONDITIONS GÉNÉRALES DE LOCATION",
        "inspection_title": "ANNEXE – ÉTAT DES LIEUX",
        "final_title": "DÉCOMPTE FINAL",
        "fields": {
            "name": "Nom", "firstname": "Prénom", "dob": "Date de naissance",
            "address": "Adresse complète", "phone": "Téléphone", "email": "Email",
            "license": "Permis n°", "license_valid": "Valable jusqu'au",
            "brand_model": "Marque / Modèle", "plate": "Plaque", "chassis": "N° châssis",
            "km_start": "Km départ", "date_start": "Date / heure départ", "date_end": "Date / heure retour prévue",
            "total": "Montant total", "deposit": "Caution versée",
            "signature_client": "Signature Locataire", "signature_date": "Fait à Lausanne, le",
            "payment_notice": "Paiement exigible immédiatement.\nIntérêt moratoire 5% en cas de retard (art. 104 CO).",
            "insurance_text": "Franchise minimale : CHF 1'000.– par sinistre.\nExclusion en cas d'alcool, drogues, conducteur non autorisé ou usage illégal.\nLe Locataire répond de tout dommage et perte d'exploitation.",
            "debt_text": "Le présent contrat vaut reconnaissance de dette au sens de l'art. 82 LP pour tous montants dus.",
            "jurisdiction_text": "Droit suisse applicable.\nFor exclusif : Lausanne.",
        },
        "conditions": [
            "Article 1 – Paiement intégral avant remise des clés.",
            "Article 2 – Le Locataire répond de tout dommage matériel et immatériel.",
            "Article 3 – Retard = facturation jour complet + pénalité.",
            "Article 4 – Conducteurs non autorisés exclus de couverture.",
            "Article 5 – Sortie du territoire interdite sans autorisation écrite.",
            "Article 6 – Véhicule équipé GPS pouvant servir de preuve.",
            "Article 7 – Clause pénale en cas de violation grave.",
        ],
        "inspection_items_ext": ["Pare-chocs AV", "Pare-chocs AR", "Portières", "Jantes", "Toit", "Pare-brise"],
        "inspection_items_int": ["Sièges", "Tableau de bord", "Écran", "Tapis"],
    },
    "en": {
        "title": "VEHICLE RENTAL CONTRACT",
        "section1": "1. Tenant Information",
        "section2": "2. Vehicle",
        "section3": "3. Price and Payment",
        "section4": "4. Deposit",
        "section5": "5. Insurance and Liability",
        "section6": "6. Debt Acknowledgment",
        "section7": "7. Jurisdiction",
        "conditions_title": "GENERAL RENTAL CONDITIONS",
        "inspection_title": "ANNEX – VEHICLE INSPECTION",
        "final_title": "FINAL STATEMENT",
        "fields": {
            "name": "Last Name", "firstname": "First Name", "dob": "Date of Birth",
            "address": "Full Address", "phone": "Phone", "email": "Email",
            "license": "License No.", "license_valid": "Valid until",
            "brand_model": "Brand / Model", "plate": "Plate", "chassis": "Chassis No.",
            "km_start": "Starting km", "date_start": "Departure date/time", "date_end": "Planned return date/time",
            "total": "Total amount", "deposit": "Deposit paid",
            "signature_client": "Tenant Signature", "signature_date": "Done in Lausanne, on",
            "payment_notice": "Payment due immediately.\n5% default interest in case of delay (art. 104 CO).",
            "insurance_text": "Minimum deductible: CHF 1,000.– per claim.\nExclusion in case of alcohol, drugs, unauthorized driver or illegal use.\nThe Tenant is liable for all damages and loss of earnings.",
            "debt_text": "This contract constitutes an acknowledgment of debt within the meaning of art. 82 LP for all amounts due.",
            "jurisdiction_text": "Swiss law applicable.\nExclusive jurisdiction: Lausanne.",
        },
        "conditions": [
            "Article 1 – Full payment required before key handover.",
            "Article 2 – The Tenant is liable for all material and immaterial damage.",
            "Article 3 – Delay = full day billing + penalty.",
            "Article 4 – Unauthorized drivers excluded from coverage.",
            "Article 5 – Leaving the territory prohibited without written authorization.",
            "Article 6 – Vehicle equipped with GPS that may serve as evidence.",
            "Article 7 – Penalty clause in case of serious violation.",
        ],
        "inspection_items_ext": ["Front bumper", "Rear bumper", "Doors", "Rims", "Roof", "Windshield"],
        "inspection_items_int": ["Seats", "Dashboard", "Screen", "Floor mats"],
    }
}


def generate_contract_pdf(contract_data: dict, signature_base64: str = None) -> bytes:
    lang = contract_data.get("language", "fr")
    tpl = CONTRACT_TEMPLATES[lang]
    f = tpl["fields"]
    d = contract_data

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=15*mm, bottomMargin=15*mm, leftMargin=20*mm, rightMargin=20*mm)

    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name='ContractTitle', fontSize=16, fontName='Helvetica-Bold', alignment=TA_CENTER, spaceAfter=8*mm, textColor=HexColor('#1A1A2E')))
    styles.add(ParagraphStyle(name='SectionHead', fontSize=12, fontName='Helvetica-Bold', spaceAfter=3*mm, spaceBefore=5*mm, textColor=HexColor('#1A1A2E')))
    styles.add(ParagraphStyle(name='ContractBody', fontSize=10, fontName='Helvetica', spaceAfter=2*mm, leading=14, alignment=TA_JUSTIFY))
    styles.add(ParagraphStyle(name='ContractSmall', fontSize=9, fontName='Helvetica', spaceAfter=1.5*mm, leading=12))
    styles.add(ParagraphStyle(name='FieldLabel', fontSize=9, fontName='Helvetica-Bold', textColor=HexColor('#4B5563')))
    styles.add(ParagraphStyle(name='CondTitle', fontSize=13, fontName='Helvetica-Bold', alignment=TA_CENTER, spaceAfter=5*mm, spaceBefore=8*mm, textColor=HexColor('#1A1A2E')))

    agency_name = d.get("agency_name", "LogiRent")
    story = []

    story.append(Paragraph(f"<b>{agency_name}</b>", styles['ContractTitle']))
    story.append(Paragraph(tpl["title"], styles['ContractTitle']))
    story.append(Spacer(1, 3*mm))
    story.append(Paragraph(f"Loueur : <b>{agency_name}</b>", styles['ContractBody']))
    story.append(Spacer(1, 3*mm))

    story.append(Paragraph(tpl["section1"], styles['SectionHead']))
    tenant_data = [
        [f["name"], d.get("client_name", ""), f["firstname"], d.get("client_firstname", "")],
        [f["dob"], d.get("client_dob", "—"), f["phone"], d.get("client_phone", "")],
        [f["email"], d.get("client_email", ""), f["address"], d.get("client_address", "—")],
        [f["license"], d.get("client_license", "—"), f["license_valid"], d.get("client_license_valid", "—")],
    ]
    t1 = Table(tenant_data, colWidths=[35*mm, 50*mm, 35*mm, 50*mm])
    t1.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'), ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9), ('TEXTCOLOR', (0, 0), (0, -1), HexColor('#4B5563')),
        ('TEXTCOLOR', (2, 0), (2, -1), HexColor('#4B5563')),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4), ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('LINEBELOW', (0, 0), (-1, -1), 0.5, HexColor('#E5E7EB')),
    ]))
    story.append(t1)
    story.append(Spacer(1, 4*mm))

    story.append(Paragraph(tpl["section2"], styles['SectionHead']))
    vehicle_data = [
        [f["brand_model"], d.get("vehicle_name", ""), f["plate"], d.get("vehicle_plate", "—")],
        [f["km_start"], d.get("km_start", "—"), f["chassis"], d.get("vehicle_chassis", "—")],
        [f["date_start"], d.get("start_date", ""), f["date_end"], d.get("end_date", "")],
    ]
    t2 = Table(vehicle_data, colWidths=[35*mm, 50*mm, 35*mm, 50*mm])
    t2.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'), ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9), ('TEXTCOLOR', (0, 0), (0, -1), HexColor('#4B5563')),
        ('TEXTCOLOR', (2, 0), (2, -1), HexColor('#4B5563')),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4), ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('LINEBELOW', (0, 0), (-1, -1), 0.5, HexColor('#E5E7EB')),
    ]))
    story.append(t2)
    story.append(Spacer(1, 4*mm))

    story.append(Paragraph(tpl["section3"], styles['SectionHead']))
    story.append(Paragraph(f"{f['total']} : <b>CHF {d.get('total_price', 0):.2f} TTC</b>", styles['ContractBody']))
    story.append(Paragraph(f["payment_notice"], styles['ContractSmall']))

    story.append(Paragraph(tpl["section4"], styles['SectionHead']))
    story.append(Paragraph(f"{f['deposit']} : <b>CHF {d.get('deposit', 0):.2f}</b>", styles['ContractBody']))
    deposit_text = "Le Loueur peut compenser toute créance avec la caution (art. 120 CO)." if lang == "fr" else "The Landlord may offset any claim against the deposit (art. 120 CO)."
    story.append(Paragraph(deposit_text, styles['ContractSmall']))

    story.append(Paragraph(tpl["section5"], styles['SectionHead']))
    story.append(Paragraph(f["insurance_text"], styles['ContractBody']))
    story.append(Paragraph(tpl["section6"], styles['SectionHead']))
    story.append(Paragraph(f["debt_text"], styles['ContractBody']))
    story.append(Paragraph(tpl["section7"], styles['SectionHead']))
    story.append(Paragraph(f["jurisdiction_text"], styles['ContractBody']))

    story.append(Spacer(1, 8*mm))
    story.append(Paragraph(f"{f['signature_date']} {d.get('signature_date', '____________________')}", styles['ContractBody']))
    story.append(Spacer(1, 5*mm))

    if signature_base64:
        try:
            sig_bytes = base64.b64decode(signature_base64.split(',')[-1] if ',' in signature_base64 else signature_base64)
            if len(sig_bytes) > 100:
                sig_buffer = io.BytesIO(sig_bytes)
                story.append(Paragraph(f["signature_client"] + " :", styles['FieldLabel']))
                story.append(RLImage(sig_buffer, width=60*mm, height=25*mm))
            else:
                story.append(Paragraph(f"{f['signature_client']} : <i>[Signature enregistrée]</i>", styles['ContractBody']))
        except Exception:
            story.append(Paragraph(f"{f['signature_client']} : <i>[Signature enregistrée]</i>", styles['ContractBody']))
    else:
        story.append(Paragraph(f"{f['signature_client']} : ____________________________", styles['ContractBody']))

    story.append(PageBreak())
    story.append(Paragraph(tpl["conditions_title"], styles['CondTitle']))
    story.append(Spacer(1, 3*mm))
    for cond in tpl["conditions"]:
        story.append(Paragraph(f"&bull; {cond}", styles['ContractBody']))
    story.append(Spacer(1, 5*mm))
    if signature_base64:
        try:
            sig_bytes2 = base64.b64decode(signature_base64.split(',')[-1] if ',' in signature_base64 else signature_base64)
            if len(sig_bytes2) > 100:
                sig_buffer2 = io.BytesIO(sig_bytes2)
                paraphe_label = "Signature Locataire (paraphe) :" if lang == "fr" else "Tenant Signature (initial):"
                story.append(Paragraph(paraphe_label, styles['FieldLabel']))
                story.append(RLImage(sig_buffer2, width=40*mm, height=18*mm))
        except Exception:
            pass

    story.append(PageBreak())
    story.append(Paragraph(tpl["inspection_title"], styles['CondTitle']))
    story.append(Spacer(1, 3*mm))
    ext_label = "Inspection extérieure :" if lang == "fr" else "Exterior inspection:"
    int_label = "Inspection intérieure :" if lang == "fr" else "Interior inspection:"
    story.append(Paragraph(ext_label, styles['SectionHead']))
    for item in tpl["inspection_items_ext"]:
        story.append(Paragraph(f"&#9744; {item} : ________________", styles['ContractBody']))
    story.append(Spacer(1, 3*mm))
    story.append(Paragraph(int_label, styles['SectionHead']))
    for item in tpl["inspection_items_int"]:
        story.append(Paragraph(f"&#9744; {item} : ________________", styles['ContractBody']))
    story.append(Spacer(1, 5*mm))
    dep_label = "Signature départ :" if lang == "fr" else "Departure signature:"
    story.append(Paragraph(f"{dep_label} ____________________________", styles['ContractBody']))

    story.append(PageBreak())
    story.append(Paragraph(tpl["final_title"], styles['CondTitle']))
    final_items = [
        ("Location" if lang == "fr" else "Rental", f"CHF {d.get('total_price', 0):.2f}"),
        ("Km supplémentaires" if lang == "fr" else "Extra km", "CHF ________"),
        ("Franchise" if lang == "fr" else "Deductible", "CHF ________"),
        ("Nettoyage" if lang == "fr" else "Cleaning", "CHF ________"),
        ("Retard" if lang == "fr" else "Delay", "CHF ________"),
        ("Perte exploitation" if lang == "fr" else "Loss of earnings", "CHF ________"),
    ]
    final_table = Table([[k, v] for k, v in final_items], colWidths=[80*mm, 50*mm])
    final_table.setStyle(TableStyle([
        ('FONTSIZE', (0, 0), (-1, -1), 10), ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LINEBELOW', (0, 0), (-1, -1), 0.5, HexColor('#E5E7EB')),
    ]))
    story.append(final_table)
    story.append(Spacer(1, 3*mm))
    total_label = "Total dû" if lang == "fr" else "Total due"
    story.append(Paragraph(f"<b>{total_label} : CHF {d.get('total_price', 0):.2f}</b>", styles['ContractBody']))
    deposit_label = "Déduction caution" if lang == "fr" else "Deposit deduction"
    story.append(Paragraph(f"{deposit_label} : CHF {d.get('deposit', 0):.2f}", styles['ContractBody']))
    solde_label = "Solde" if lang == "fr" else "Balance"
    story.append(Paragraph(f"<b>{solde_label} : CHF {d.get('total_price', 0) - d.get('deposit', 0):.2f}</b>", styles['ContractBody']))
    story.append(Spacer(1, 5*mm))
    mention = "Mention : Reconnaissance de dette selon art. 82 LP." if lang == "fr" else "Note: Acknowledgment of debt according to art. 82 LP."
    story.append(Paragraph(mention, styles['ContractSmall']))

    doc.build(story)
    return buffer.getvalue()


@router.post("/admin/contracts/generate")
async def generate_contract(data: ContractGenerate, user: dict = Depends(get_admin_user)):
    reservation = await db.reservations.find_one({"id": data.reservation_id}, {"_id": 0})
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")

    if user.get('role') != 'super_admin' and reservation.get('agency_id') != user.get('agency_id'):
        raise HTTPException(status_code=403, detail="Access denied")

    client = await db.users.find_one({"id": reservation["user_id"]}, {"_id": 0})
    vehicle = await db.vehicles.find_one({"id": reservation["vehicle_id"]}, {"_id": 0})
    agency = await db.agencies.find_one({"id": reservation.get("agency_id")}, {"_id": 0})

    if not client or not vehicle:
        raise HTTPException(status_code=404, detail="Client or vehicle not found")

    start_date = reservation.get("start_date", "")
    end_date = reservation.get("end_date", "")
    if isinstance(start_date, datetime):
        start_date = start_date.strftime("%d/%m/%Y %H:%M")
    elif isinstance(start_date, str):
        try:
            start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00')).strftime("%d/%m/%Y %H:%M")
        except Exception:
            pass
    if isinstance(end_date, datetime):
        end_date = end_date.strftime("%d/%m/%Y %H:%M")
    elif isinstance(end_date, str):
        try:
            end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00')).strftime("%d/%m/%Y %H:%M")
        except Exception:
            pass

    contract_data = {
        "agency_name": agency.get("name", "LogiRent") if agency else "LogiRent",
        "client_name": client.get("name", ""),
        "client_firstname": client.get("first_name", client.get("name", "").split(" ")[0] if " " in client.get("name", "") else ""),
        "client_dob": client.get("date_of_birth", "—"),
        "client_phone": client.get("phone", "—"),
        "client_email": client.get("email", ""),
        "client_address": client.get("address", "—"),
        "client_license": client.get("license_number", "—"),
        "client_license_valid": client.get("license_valid_until", "—"),
        "vehicle_name": f"{vehicle.get('brand', '')} {vehicle.get('model', '')}",
        "vehicle_plate": vehicle.get("plate", "—"),
        "vehicle_chassis": vehicle.get("chassis", "—"),
        "km_start": str(vehicle.get("mileage", "—")),
        "start_date": start_date,
        "end_date": end_date,
        "total_price": reservation.get("total_price", 0),
        "deposit": reservation.get("deposit", 0),
        "language": data.language,
    }

    existing = await db.contracts.find_one({"reservation_id": data.reservation_id}, {"_id": 0})
    if existing:
        await db.contracts.update_one(
            {"reservation_id": data.reservation_id},
            {"$set": {"contract_data": contract_data, "language": data.language, "updated_at": datetime.utcnow().isoformat()}}
        )
        return {"message": "Contrat mis à jour", "contract_id": existing["id"]}

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
    return {"message": "Contrat généré", "contract_id": contract_id}


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
    await db.contracts.update_one({"id": contract_id}, {"$set": {"status": "sent", "updated_at": datetime.utcnow().isoformat()}})

    client = await db.users.find_one({"id": contract["user_id"]}, {"_id": 0})
    if client:
        msg = "Un contrat de location est prêt pour votre signature." if contract.get("language", "fr") == "fr" else "A rental contract is ready for your signature."
        await create_notification(contract["user_id"], "contract", msg, contract_id)
    return {"message": "Contrat envoyé au client"}


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
    return {"message": "Contrat signé avec succès"}


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
    return Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=contrat_{contract_id[:8]}.pdf"})
