from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from datetime import datetime
import uuid
import logging
import math

from database import db, STRIPE_API_KEY
from models import (
    Agency, AgencyCreate, AdminLogin, TokenResponse,
    QuickClientCreate, AdminReservationCreate, SendPaymentLinkRequest
)
from deps import (
    get_agency_admin, get_super_admin, get_current_user,
    create_token, hash_password, verify_password, build_user_profile
)
from utils.helpers import generate_slug
from utils.notifications import create_notification
from utils.email import send_email, send_reservation_confirmation

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/agencies")
async def list_agencies(user: dict = Depends(get_agency_admin)):
    is_super = user.get('role') == 'super_admin'
    if is_super:
        agencies = await db.agencies.find({}).to_list(100)
    else:
        agencies = await db.agencies.find({"$or": [{"id": user.get('agency_id')}, {"_id": user.get('agency_id')}]}).to_list(1)

    result = []
    for agency in agencies:
        aid = agency.get('id') or str(agency.get('_id', ''))
        if not aid:
            continue
        # Ensure 'id' field exists
        if 'id' not in agency:
            agency['id'] = aid
            await db.agencies.update_one({"_id": agency['_id']}, {"$set": {"id": aid}})
        agency.pop('_id', None)
        agency['vehicle_count'] = await db.vehicles.count_documents({"agency_id": aid})
        agency['reservation_count'] = await db.reservations.count_documents({"agency_id": aid})
        agency['admin_count'] = await db.users.count_documents({"agency_id": aid, "role": {"$in": ["admin", "super_admin"]}})
        admin_user = await db.users.find_one({"agency_id": aid, "role": "admin"}, {"email": 1, "name": 1, "id": 1, "_id": 0})
        agency['admin_email'] = admin_user['email'] if admin_user else None
        agency['admin_name'] = admin_user.get('name') if admin_user else None
        agency['admin_id'] = admin_user.get('id') if admin_user else None
        agency.pop('admin_password_plain', None)
        result.append(agency)
    return result


@router.post("/agencies")
async def create_agency(data: AgencyCreate, user: dict = Depends(get_super_admin)):
    if not data.admin_email or not data.admin_password or not data.admin_name:
        raise HTTPException(status_code=400, detail="Les champs admin sont requis")

    existing = await db.users.find_one({"email": data.admin_email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail=f"L'email {data.admin_email} est déjà utilisé")

    slug = generate_slug(data.name)
    existing_slug = await db.agencies.find_one({"slug": slug})
    if existing_slug:
        slug = f"{slug}-{str(uuid.uuid4())[:4]}"
    agency = Agency(name=data.name, slug=slug, address=data.address, phone=data.phone, email=data.email, navixy_api_url=data.navixy_api_url, navixy_hash=data.navixy_hash)
    await db.agencies.insert_one(agency.dict())

    admin_user = {
        "id": str(uuid.uuid4()),
        "email": data.admin_email.lower(),
        "password_hash": hash_password(data.admin_password),
        "name": data.admin_name,
        "phone": None, "address": None, "id_photo": None, "license_photo": None,
        "role": "admin", "agency_id": agency.id,
        "created_at": datetime.utcnow()
    }
    await db.users.insert_one(admin_user)

    return {"id": agency.id, "name": agency.name, "admin_email": data.admin_email.lower(), "admin_name": data.admin_name, "message": f"Agence '{agency.name}' créée"}


@router.put("/agencies/{agency_id}")
async def update_agency(agency_id: str, data: AgencyCreate, user: dict = Depends(get_super_admin)):
    update_fields = {"name": data.name}
    if data.address is not None:
        update_fields["address"] = data.address
    if data.phone is not None:
        update_fields["phone"] = data.phone
    if data.email is not None:
        update_fields["email"] = data.email
    if data.navixy_api_url is not None:
        update_fields["navixy_api_url"] = data.navixy_api_url
    if data.navixy_hash is not None:
        update_fields["navixy_hash"] = data.navixy_hash
    result = await db.agencies.update_one({"id": agency_id}, {"$set": update_fields})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Agence non trouvée")
    return {"message": "Agence mise à jour"}


@router.delete("/agencies/{agency_id}")
async def delete_agency(agency_id: str, user: dict = Depends(get_super_admin)):
    result = await db.agencies.delete_one({"id": agency_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Agence non trouvée")
    return {"message": "Agence supprimée"}


# ===== SMTP Configuration =====

@router.get("/admin/smtp-config")
async def get_smtp_config(user: dict = Depends(get_agency_admin)):
    agency_id = user.get('agency_id')
    if not agency_id:
        raise HTTPException(status_code=400, detail="Pas d'agence associee")
    agency = await db.agencies.find_one({"id": agency_id}, {"_id": 0, "smtp_config": 1, "name": 1})
    if not agency:
        raise HTTPException(status_code=404, detail="Agence non trouvee")
    smtp = agency.get('smtp_config') or {}
    # Never return password in clear
    if smtp.get('password'):
        smtp['password_set'] = True
        smtp['password'] = ''
    return {"smtp_config": smtp, "agency_name": agency.get('name', '')}


@router.put("/admin/smtp-config")
async def update_smtp_config(data: dict, user: dict = Depends(get_agency_admin)):
    agency_id = user.get('agency_id')
    if not agency_id:
        raise HTTPException(status_code=400, detail="Pas d'agence associee")

    smtp_config = {
        "host": data.get('host', '').strip(),
        "port": int(data.get('port', 587)),
        "email": data.get('email', '').strip(),
        "use_tls": data.get('use_tls', True),
        "sender_name": data.get('sender_name', '').strip(),
    }

    # Only update password if provided (non-empty)
    if data.get('password'):
        smtp_config['password'] = data['password']
    else:
        # Keep existing password
        existing = await db.agencies.find_one({"id": agency_id}, {"_id": 0, "smtp_config": 1})
        if existing and existing.get('smtp_config', {}).get('password'):
            smtp_config['password'] = existing['smtp_config']['password']

    await db.agencies.update_one({"id": agency_id}, {"$set": {"smtp_config": smtp_config}})
    return {"message": "Configuration SMTP sauvegardee"}


@router.post("/admin/smtp-test")
async def test_smtp_config(data: dict, user: dict = Depends(get_agency_admin)):
    agency_id = user.get('agency_id')
    test_recipient = data.get('test_email', user.get('email'))

    smtp_config = {
        "host": data.get('host', '').strip(),
        "port": int(data.get('port', 587)),
        "email": data.get('email', '').strip(),
        "password": data.get('password', ''),
        "use_tls": data.get('use_tls', True),
        "sender_name": data.get('sender_name', ''),
    }

    # If no password provided, use existing
    if not smtp_config['password'] and agency_id:
        existing = await db.agencies.find_one({"id": agency_id}, {"_id": 0, "smtp_config": 1})
        if existing and existing.get('smtp_config', {}).get('password'):
            smtp_config['password'] = existing['smtp_config']['password']

    if not all([smtp_config['host'], smtp_config['email'], smtp_config['password']]):
        raise HTTPException(status_code=400, detail="Veuillez remplir tous les champs SMTP")

    from utils.email import _send_via_smtp
    try:
        html = f"""
        <div style='font-family:Arial;padding:20px;'>
            <h2 style='color:#1E3A5F;'>Test SMTP LogiRent</h2>
            <p>Ce mail confirme que votre configuration SMTP fonctionne correctement.</p>
            <p><b>Serveur:</b> {smtp_config['host']}:{smtp_config['port']}</p>
            <p><b>Email:</b> {smtp_config['email']}</p>
            <p style='color:#10B981;font-weight:bold;'>Configuration validee !</p>
        </div>
        """
        await _send_via_smtp(smtp_config, test_recipient, "Test SMTP - LogiRent", html)
        return {"message": f"Email de test envoye a {test_recipient}", "success": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Echec SMTP: {str(e)}")




@router.post("/agencies/{agency_id}/admins")
async def add_admin_to_agency(agency_id: str, user_email: str, user: dict = Depends(get_super_admin)):
    target = await db.users.find_one({"email": user_email.lower()})
    if not target:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    agency = await db.agencies.find_one({"id": agency_id})
    if not agency:
        raise HTTPException(status_code=404, detail="Agence non trouvée")
    await db.users.update_one({"id": target['id']}, {"$set": {"role": "admin", "agency_id": agency_id}})
    return {"message": f"{target['name']} est maintenant admin de {agency['name']}"}


@router.get("/public/agency/{slug}")
async def get_agency_by_slug(slug: str):
    agency = await db.agencies.find_one({"slug": slug}, {"_id": 0})
    if not agency:
        raise HTTPException(status_code=404, detail="Agence non trouvée")
    agency['vehicle_count'] = await db.vehicles.count_documents({"agency_id": agency.get('id')})
    return agency


@router.post("/migrate-agency-slugs")
async def migrate_agency_slugs():
    agencies = await db.agencies.find({}, {"_id": 0}).to_list(100)
    updated = 0
    for agency in agencies:
        if not agency.get('slug'):
            slug = generate_slug(agency['name'])
            existing = await db.agencies.find_one({"slug": slug, "id": {"$ne": agency.get('id')}})
            if existing:
                slug = f"{slug}-{str(uuid.uuid4())[:4]}"
            await db.agencies.update_one({"id": agency.get('id')}, {"$set": {"slug": slug}})
            updated += 1
    return {"message": f"Updated {updated} agencies with slugs"}


# Agency Admin Mobile App routes
@router.post("/admin/quick-client")
async def create_quick_client(data: QuickClientCreate, user: dict = Depends(get_agency_admin)):
    import string, random
    agency_id = user.get('agency_id')

    if data.email:
        existing = await db.users.find_one({"email": data.email.lower()})
        if existing:
            existing['_id'] = str(existing['_id'])
            return {"message": "Client existant trouvé", "client": existing, "is_new": False}

    # Use admin-provided password or auto-generate
    if data.password and data.password.strip():
        plain_password = data.password.strip()
    else:
        chars = string.ascii_letters + string.digits
        plain_password = ''.join(random.choices(chars, k=8))

    # Auto-split name into first_name / last_name
    name_parts = data.name.strip().split(' ', 1)
    first_name = name_parts[0] if len(name_parts) >= 1 else ''
    last_name = name_parts[1] if len(name_parts) >= 2 else ''

    client = {
        "id": str(uuid.uuid4()),
        "email": data.email.lower() if data.email else f"tel_{data.phone or uuid.uuid4().hex[:8]}@logirent.local",
        "password_hash": hash_password(plain_password),
        "name": data.name,
        "first_name": first_name,
        "last_name": last_name,
        "phone": data.phone,
        "address": data.address,
        "id_photo": None, "id_photo_back": None,
        "license_photo": None, "license_photo_back": None,
        "birth_place": data.birth_place,
        "date_of_birth": data.date_of_birth,
        "license_number": data.license_number,
        "license_issue_date": data.license_issue_date,
        "license_expiry_date": data.license_expiry_date,
        "nationality": data.nationality,
        "role": "client", "agency_id": agency_id,
        "created_at": datetime.utcnow()
    }
    await db.users.insert_one(client)
    client.pop('password_hash', None)
    client.pop('_id', None)

    # Send welcome email with credentials
    if data.email and '@logirent.local' not in client['email']:
        try:
            from utils.email import send_welcome_email
            agency = await db.agencies.find_one({"id": agency_id}, {"_id": 0})
            agency_name = agency.get("name", "LogiRent") if agency else "LogiRent"
            await send_welcome_email(
                recipient=client['email'],
                client_name=data.name,
                password=plain_password,
                agency_name=agency_name,
                agency_id=agency_id,
            )
            logger.info(f"Welcome email sent to {client['email']}")
        except Exception as e:
            logger.error(f"Failed to send welcome email: {e}")

    return {"message": "Client créé", "client": client, "is_new": True, "generated_password": plain_password}


@router.post("/admin/clients/{client_id}/documents")
async def upload_client_documents(client_id: str, doc_type: str, file: UploadFile = File(...), user: dict = Depends(get_agency_admin)):
    """Upload license/ID card photos. doc_type: license_front, license_back, id_front, id_back"""
    from utils.storage import put_object

    client = await db.users.find_one({"id": client_id})
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Fichier trop volumineux (max 10MB)")

    ext = file.filename.split(".")[-1].lower() if file.filename and "." in file.filename else "jpg"
    path = f"logirent/clients/{client_id}/{doc_type}_{uuid.uuid4().hex[:8]}.{ext}"
    ct = file.content_type or f"image/{ext}"
    put_object(path, content, ct)

    field_map = {
        "license_front": "license_photo",
        "license_back": "license_photo_back",
        "id_front": "id_photo",
        "id_back": "id_photo_back",
    }
    db_field = field_map.get(doc_type)
    if not db_field:
        raise HTTPException(status_code=400, detail=f"Type invalide: {doc_type}")

    await db.users.update_one({"id": client_id}, {"$set": {db_field: path}})
    return {"path": path, "doc_type": doc_type}



@router.post("/admin/create-reservation-for-client")
async def create_reservation_for_client(data: AdminReservationCreate, user: dict = Depends(get_agency_admin)):
    agency_id = user.get('agency_id')

    client = await db.users.find_one({"id": data.client_id})
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")

    vehicle = await db.vehicles.find_one({"id": data.vehicle_id})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Véhicule non trouvé")

    if vehicle.get('status') == 'maintenance':
        raise HTTPException(status_code=400, detail="Véhicule en maintenance")

    # Category-based booking: check overlap for this specific vehicle
    overlap_count = await db.reservations.count_documents({
        "vehicle_id": data.vehicle_id,
        "status": {"$in": ["pending", "pending_cash", "confirmed", "active"]},
        "start_date": {"$lt": data.end_date},
        "end_date": {"$gt": data.start_date},
    })
    if overlap_count > 0:
        raise HTTPException(status_code=400, detail="Ce vehicule est deja reserve pour ces dates. Choisissez un autre vehicule ou d'autres dates.")

    # Calculate days: 1 day = 24 hours. Any extra hours beyond a 24h block = +1 day
    # 24h = 1j, 26h = 2j, 48h = 2j, 50h = 3j, 72h = 3j, 74h = 4j
    duration = data.end_date - data.start_date
    total_seconds = duration.total_seconds()
    total_hours = total_seconds / 3600
    if total_hours <= 0:
        raise HTTPException(status_code=400, detail="Date de fin doit etre apres la date de debut")
    total_days = max(1, math.ceil(total_hours / 24))

    base_price = vehicle['price_per_day'] * total_days
    vehicle_options = {opt['name']: opt for opt in vehicle.get('options', [])}
    selected_options = []
    options_price = 0
    for opt_name in data.options:
        if opt_name in vehicle_options:
            opt = vehicle_options[opt_name]
            opt_total = opt['price_per_day'] * total_days
            selected_options.append({"name": opt_name, "price_per_day": opt['price_per_day'], "total_price": opt_total})
            options_price += opt_total

    total_price = base_price + options_price
    status = "confirmed"

    reservation = {
        "id": str(uuid.uuid4()),
        "user_id": data.client_id,
        "vehicle_id": data.vehicle_id,
        "agency_id": agency_id,
        "start_date": data.start_date,
        "end_date": data.end_date,
        "options": selected_options,
        "total_days": total_days,
        "base_price": base_price,
        "options_price": options_price,
        "total_price": total_price,
        "status": status,
        "payment_method": data.payment_method,
        "payment_status": "unpaid",
        "created_by_admin": user['id'],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    await db.reservations.insert_one(reservation)
    reservation.pop('_id', None)

    await create_notification(
        data.client_id, 'reservation_confirmed',
        f"Votre reservation pour {vehicle['brand']} {vehicle['model']} (categorie {vehicle.get('type', 'Standard')}) du {data.start_date.strftime('%d/%m/%Y')} au {data.end_date.strftime('%d/%m/%Y')} est confirmee. N'oubliez pas votre carte d'identite et votre permis de conduire.",
        reservation['id']
    )

    try:
        await send_reservation_confirmation(client, vehicle, reservation, agency_id=agency_id)
    except Exception as e:
        logger.error(f"Failed to send confirmation email: {e}")

    return {"message": "Réservation créée", "reservation": reservation}


@router.post("/admin/reservations/{reservation_id}/send-payment-link")
async def send_payment_link_to_client(reservation_id: str, body: SendPaymentLinkRequest, user: dict = Depends(get_agency_admin)):
    from emergentintegrations.payments.stripe import StripeCheckout, CheckoutSessionRequest
    from models import PaymentTransaction

    reservation = await db.reservations.find_one({"id": reservation_id})
    if not reservation:
        raise HTTPException(status_code=404, detail="Réservation non trouvée")
    if reservation.get('payment_status') == 'paid':
        raise HTTPException(status_code=400, detail="Déjà payé")

    client = await db.users.find_one({"id": reservation['user_id']})
    vehicle = await db.vehicles.find_one({"id": reservation['vehicle_id']})
    if not client or not vehicle:
        raise HTTPException(status_code=404, detail="Client ou véhicule non trouvé")

    host_url = body.origin_url.rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)

    success_url = f"{host_url}/payment-success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{host_url}/payment-cancel?reservation_id={reservation['id']}"
    metadata = {"user_id": client['id'], "reservation_id": reservation['id'], "user_email": client['email']}

    checkout_request = CheckoutSessionRequest(
        amount=float(reservation['total_price']), currency="chf",
        success_url=success_url, cancel_url=cancel_url,
        metadata=metadata, payment_methods=['card']
    )
    session = await stripe_checkout.create_checkout_session(checkout_request)

    payment_transaction = PaymentTransaction(
        user_id=client['id'], reservation_id=reservation['id'],
        session_id=session.session_id, amount=float(reservation['total_price']),
        currency="chf", status="initiated", payment_status="pending", metadata=metadata
    )
    await db.payment_transactions.insert_one(payment_transaction.dict())

    await db.reservations.update_one(
        {"id": reservation['id']},
        {"$set": {"payment_session_id": session.session_id, "payment_method": "card"}}
    )

    start_date = reservation['start_date']
    end_date = reservation['end_date']
    if isinstance(start_date, str):
        start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
    if isinstance(end_date, str):
        end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00'))

    html = f'''
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <div style="background:#6C2BD9;padding:25px;border-radius:12px 12px 0 0;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:24px;">LogiRent</h1>
            <p style="color:rgba(255,255,255,0.8);margin:8px 0 0 0;">Lien de paiement</p>
        </div>
        <div style="background:#fff;padding:25px;border-radius:0 0 12px 12px;border:1px solid #E5E7EB;">
            <p>Bonjour {client['name']},</p>
            <p>Une réservation a été créée pour vous :</p>
            <div style="background:#F8FAFC;padding:15px;border-radius:8px;margin:15px 0;">
                <p style="margin:4px 0;"><strong>{vehicle['brand']} {vehicle['model']}</strong></p>
                <p style="margin:4px 0;">Du {start_date.strftime('%d/%m/%Y')} au {end_date.strftime('%d/%m/%Y')} ({reservation['total_days']} jours)</p>
                <p style="margin:4px 0;font-size:20px;font-weight:bold;color:#6C2BD9;">CHF {reservation['total_price']:.2f}</p>
            </div>
            <a href="{session.url}" style="display:block;background:#6C2BD9;color:#fff;text-align:center;padding:14px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;margin:20px 0;">Payer maintenant</a>
            <p style="color:#64748B;font-size:13px;">Ce lien est valable pendant 24 heures.</p>
            <p style="margin-top:20px;">L'équipe LogiRent</p>
        </div>
    </div>
    '''

    try:
        await send_email(client['email'], f"Lien de paiement - {vehicle['brand']} {vehicle['model']}", html, agency_id=user.get('agency_id'))
    except Exception as e:
        logger.error(f"Failed to send payment link email: {e}")

    return {"message": "Lien de paiement envoyé", "payment_url": session.url}


@router.get("/admin/search-clients")
async def search_clients(q: str = "", user: dict = Depends(get_agency_admin)):
    if not q or len(q) < 2:
        return {"clients": []}
    # Split query into words and search each word
    words = q.strip().split()
    if len(words) > 1:
        # Multi-word: all words must match in name, first_name, last_name, email or phone
        conditions = []
        for word in words:
            conditions.append({
                "$or": [
                    {"name": {"$regex": word, "$options": "i"}},
                    {"first_name": {"$regex": word, "$options": "i"}},
                    {"last_name": {"$regex": word, "$options": "i"}},
                    {"email": {"$regex": word, "$options": "i"}},
                    {"phone": {"$regex": word, "$options": "i"}},
                ]
            })
        query = {"role": "client", "$and": conditions}
    else:
        query = {
            "role": "client",
            "$or": [
                {"name": {"$regex": q, "$options": "i"}},
                {"first_name": {"$regex": q, "$options": "i"}},
                {"last_name": {"$regex": q, "$options": "i"}},
                {"email": {"$regex": q, "$options": "i"}},
                {"phone": {"$regex": q, "$options": "i"}},
            ]
        }
    clients = await db.users.find(query, {"password_hash": 0, "_id": 0, "id_photo": 0, "id_photo_back": 0, "license_photo": 0, "license_photo_back": 0}).limit(20).to_list(20)
    # Compose display_name from first_name + last_name if available
    for c in clients:
        fn = c.get('first_name', '') or ''
        ln = c.get('last_name', '') or ''
        if fn or ln:
            c['display_name'] = f"{fn} {ln}".strip()
        else:
            c['display_name'] = c.get('name', '')
    return {"clients": clients}


@router.get("/admin/available-vehicles")
async def get_available_vehicles_for_dates(start_date: datetime, end_date: datetime, user: dict = Depends(get_agency_admin)):
    agency_id = user.get('agency_id')
    is_super = user.get('role') == 'super_admin'

    vf = {"status": {"$ne": "maintenance"}}
    if not is_super and agency_id:
        vf["agency_id"] = agency_id

    vehicles = await db.vehicles.find(vf).to_list(200)

    available = []
    for v in vehicles:
        vid = v.get('id') or str(v.get('_id', ''))
        if not vid:
            continue
        v.pop('_id', None)
        overlap = await db.reservations.find_one({
            "vehicle_id": vid,
            "status": {"$in": ["pending", "pending_cash", "confirmed", "active"]},
            "$or": [{"start_date": {"$lt": end_date}, "end_date": {"$gt": start_date}}]
        })
        if not overlap:
            if 'id' not in v:
                v['id'] = vid
            available.append(v)

    return {"vehicles": available}


@router.get("/admin/vehicle-schedule")
async def get_vehicle_schedule(start_date: str, end_date: str, user: dict = Depends(get_agency_admin)):
    agency_id = user.get('agency_id')
    is_super = user.get('role') == 'super_admin'

    from datetime import datetime as dt, timedelta
    try:
        sd = dt.fromisoformat(start_date)
        ed = dt.fromisoformat(end_date).replace(hour=23, minute=59, second=59)
    except:
        raise HTTPException(status_code=400, detail="Invalid date format")

    vf = {"status": {"$ne": "maintenance"}}
    if not is_super and agency_id:
        vf["agency_id"] = agency_id

    vehicles = await db.vehicles.find(vf).to_list(200)
    vehicle_ids = []
    vehicles_map = {}
    for v in vehicles:
        vid = v.get('id') or str(v.get('_id', ''))
        if not vid:
            continue
        if 'id' not in v:
            v['id'] = vid
            await db.vehicles.update_one({"_id": v['_id']}, {"$set": {"id": vid}})
        v.pop('_id', None)
        vehicle_ids.append(vid)
        vehicles_map[vid] = v

    # Fetch ALL reservations with active status (not just those with matching vehicle_id)
    base_filter = {} if is_super else {"agency_id": agency_id}
    all_reservations = await db.reservations.find({
        **base_filter,
        "status": {"$in": ["pending", "pending_cash", "confirmed", "active", "completed"]},
    }, {"_id": 0}).to_list(2000)

    def parse_date(d):
        if isinstance(d, dt):
            return d
        if isinstance(d, str):
            try:
                return dt.fromisoformat(d.replace('Z', '+00:00').replace('+00:00', ''))
            except:
                try:
                    return dt.strptime(d[:19], "%Y-%m-%dT%H:%M:%S")
                except:
                    try:
                        return dt.strptime(d[:10], "%Y-%m-%d")
                    except:
                        return None
        return None

    # Group by vehicle and filter by date range
    # Pre-fetch user names for all reservations
    user_ids = list(set(r.get('user_id', '') for r in all_reservations if r.get('user_id')))
    users_cursor = db.users.find({"id": {"$in": user_ids}}, {"_id": 0, "id": 1, "first_name": 1, "last_name": 1, "email": 1, "name": 1})
    users_map = {}
    async for u in users_cursor:
        uid = u.get('id', '')
        name = u.get('name', '') or f"{u.get('first_name', '')} {u.get('last_name', '')}".strip()
        if not name:
            name = u.get('email', '').split('@')[0]
        users_map[uid] = name

    vehicle_reservations: dict = {vid: [] for vid in vehicle_ids}
    orphan_reservations = []
    for r in all_reservations:
        r_start = parse_date(r.get('start_date'))
        r_end = parse_date(r.get('end_date'))
        if not r_start or not r_end:
            continue
        # Overlap check: reservation overlaps [sd, ed] if start < ed AND end > sd
        if r_start < ed and r_end > sd:
            vid = r.get('vehicle_id', '')
            user_name = r.get('user_name', '') or users_map.get(r.get('user_id', ''), '')
            entry = {
                "id": r.get('id', ''),
                "user_name": user_name,
                "start": r_start.isoformat(),
                "end": r_end.isoformat(),
                "status": r.get('status', ''),
            }
            if vid in vehicle_reservations:
                vehicle_reservations[vid].append(entry)
            else:
                orphan_reservations.append(entry)

    result = []
    for vid in vehicle_ids:
        v = vehicles_map[vid]
        result.append({
            "id": vid, "brand": v.get('brand', ''), "model": v.get('model', ''),
            "price_per_day": v.get('price_per_day', 0), "type": v.get('type', ''),
            "seats": v.get('seats', 0), "transmission": v.get('transmission', ''),
            "fuel_type": v.get('fuel_type', ''), "options": v.get('options', []),
            "reservations": vehicle_reservations[vid]
        })

    return {"vehicles": result, "orphan_reservations": orphan_reservations}


# Admin login
@router.post("/admin/login")
async def admin_login(credentials: AdminLogin):
    user = await db.users.find_one({"email": credentials.email.lower()})
    if not user or not verify_password(credentials.password, user['password_hash']):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")

    role = user.get('role', 'client')
    if role not in ('admin', 'super_admin'):
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs.")

    token = create_token(user['id'], user['email'], role)
    profile = await build_user_profile(user)
    return TokenResponse(access_token=token, user=profile)


# Setup / Migration
@router.post("/setup/init")
async def setup_init():
    existing_agency = await db.agencies.find_one({})
    if existing_agency:
        return {"message": "Plateforme déjà initialisée", "agency_id": existing_agency.get('id')}

    agency = Agency(name="LogiRent Geneva", address="Geneva, Switzerland", phone="+41 22 000 0000", email="admin@logirent.ch")
    await db.agencies.insert_one(agency.dict())

    await db.users.update_one({"email": "test@example.com"}, {"$set": {"role": "super_admin", "agency_id": agency.id}})
    await db.vehicles.update_many({"agency_id": None}, {"$set": {"agency_id": agency.id}})
    await db.vehicles.update_many({"agency_id": {"$exists": False}}, {"$set": {"agency_id": agency.id}})
    await db.reservations.update_many({"agency_id": None}, {"$set": {"agency_id": agency.id}})
    await db.reservations.update_many({"agency_id": {"$exists": False}}, {"$set": {"agency_id": agency.id}})
    await db.users.update_many({"role": {"$exists": False}}, {"$set": {"role": "client", "agency_id": None}})

    return {"message": "Plateforme initialisée", "agency_id": agency.id, "agency_name": agency.name}


@router.get("/agencies/{agency_id}/booking-options")
async def get_agency_booking_options(agency_id: str):
    """Public endpoint to get booking options for a specific agency"""
    agency = await db.agencies.find_one({"id": agency_id}, {"_id": 0, "id": 1, "booking_options": 1})
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")
    options = agency.get("booking_options", [
        {"name": "GPS", "price_per_day": 10, "enabled": True},
        {"name": "Siège enfant", "price_per_day": 8, "enabled": True},
        {"name": "Conducteur supplémentaire", "price_per_day": 15, "enabled": True},
    ])
    # Only return enabled options
    return {"options": [o for o in options if o.get("enabled", True)]}
