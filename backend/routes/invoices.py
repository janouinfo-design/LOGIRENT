"""
LogiRent Invoice Routes - Complete invoicing system for vehicle rentals.
Handles invoice CRUD, PDF generation with Swiss QR-bill, and payment tracking.
"""
from fastapi import APIRouter, HTTPException, Depends, Response
from datetime import datetime, date, timedelta, timezone
from typing import Optional
import logging
import uuid

from database import db
from deps import get_current_user, get_admin_user
from models import (
    InvoiceCreateFromReservation, InvoicePenaltyAdd,
    InvoiceMarkPaid,
)
from utils.invoice_pdf import generate_invoice_pdf

logger = logging.getLogger(__name__)
router = APIRouter()

TAX_RATE = 7.7


# ==================== HELPERS ====================

async def _next_invoice_number() -> str:
    """Generate next sequential invoice number: LR-YYYY-XXXXXX."""
    year = datetime.now(timezone.utc).year
    prefix = f"LR-{year}-"
    last = await db.invoices.find_one(
        {"invoice_number": {"$regex": f"^{prefix}"}},
        sort=[("invoice_number", -1)]
    )
    if last:
        try:
            seq = int(last['invoice_number'].split('-')[-1]) + 1
        except (ValueError, IndexError):
            seq = 1
    else:
        seq = 1
    return f"{prefix}{seq:06d}"


def _calc_item(code: str, label: str, quantity: float, unit_price: float, tax_rate: float = TAX_RATE) -> dict:
    """Build an invoice line item with tax calculation."""
    total_excl = round(quantity * unit_price, 2)
    total_incl = round(total_excl * (1 + tax_rate / 100), 2)
    return {
        "code": code,
        "label": label,
        "quantity": quantity,
        "unit_price": unit_price,
        "tax_rate": tax_rate,
        "total_excl_tax": total_excl,
        "total_incl_tax": total_incl,
    }


def _calc_totals(items: list) -> dict:
    """Calculate invoice totals from items."""
    subtotal = round(sum(i.get("total_excl_tax", 0) for i in items), 2)
    tax_total = round(sum(i.get("total_incl_tax", 0) - i.get("total_excl_tax", 0) for i in items), 2)
    total = round(sum(i.get("total_incl_tax", 0) for i in items), 2)
    return {"subtotal_excl_tax": subtotal, "tax_total": tax_total, "total_incl_tax": total}


def _serialize(doc: dict) -> dict:
    """Remove MongoDB _id for JSON serialization."""
    if doc and '_id' in doc:
        del doc['_id']
    return doc


# ==================== CREATE FROM RESERVATION ====================

@router.post("/invoices/create-from-reservation")
async def create_invoice_from_reservation(payload: InvoiceCreateFromReservation, user: dict = Depends(get_admin_user)):
    """Create an invoice from an existing reservation."""
    reservation = await db.reservations.find_one({"id": payload.reservation_id})
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation introuvable")

    # Check agency access
    if user.get('role') == 'agency_admin' and reservation.get('agency_id') != user.get('agency_id'):
        raise HTTPException(status_code=403, detail="Acces refuse")

    vehicle = await db.vehicles.find_one({"id": reservation['vehicle_id']}, {"_id": 0})
    customer = await db.users.find_one({"id": reservation['user_id']}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Client introuvable")

    # Build items
    if payload.custom_items:
        items = []
        for ci in payload.custom_items:
            items.append(_calc_item(
                ci.get('code', 'CUSTOM'),
                ci.get('label', ''),
                ci.get('quantity', 1),
                ci.get('unit_price', 0),
            ))
    else:
        items = _build_reservation_items(reservation, vehicle)

    totals = _calc_totals(items)
    inv_number = await _next_invoice_number()
    today = date.today().isoformat()
    due = (date.today() + timedelta(days=30)).isoformat()

    # For deposit invoices, take a percentage
    if payload.invoice_type == "deposit":
        deposit_pct = 0.3  # 30% deposit
        for item in items:
            item['quantity'] = 1
            item['unit_price'] = round(totals['total_incl_tax'] * deposit_pct, 2)
            item['total_excl_tax'] = round(item['unit_price'] / (1 + TAX_RATE / 100), 2)
            item['total_incl_tax'] = item['unit_price']
            item['label'] = f"Acompte 30% - {item['label']}"
            item['code'] = "DEPOSIT"
        items = [items[0]] if items else []
        totals = _calc_totals(items)

    invoice = {
        "id": str(uuid.uuid4()),
        "invoice_number": inv_number,
        "invoice_type": payload.invoice_type,
        "status": "pending",
        "customer_id": reservation['user_id'],
        "reservation_id": reservation['id'],
        "vehicle_id": reservation.get('vehicle_id'),
        "agency_id": reservation.get('agency_id') or user.get('agency_id'),
        "issue_date": today,
        "due_date": due,
        "currency": "CHF",
        "start_date": reservation.get('start_date', '').isoformat()[:10] if hasattr(reservation.get('start_date', ''), 'isoformat') else str(reservation.get('start_date', ''))[:10],
        "end_date": reservation.get('end_date', '').isoformat()[:10] if hasattr(reservation.get('end_date', ''), 'isoformat') else str(reservation.get('end_date', ''))[:10],
        **totals,
        "amount_paid": 0,
        "balance_due": totals['total_incl_tax'],
        "payment_method": None,
        "stripe_payment_intent_id": None,
        "stripe_session_id": None,
        "qr_reference": None,
        "pdf_url": None,
        "items": items,
        "notes": payload.notes,
        "parent_invoice_id": None,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }

    await db.invoices.insert_one(invoice)
    return _serialize(invoice)


def _build_reservation_items(reservation: dict, vehicle: dict = None) -> list:
    """Build invoice items from reservation data."""
    items = []
    days = reservation.get('total_days', 1)
    daily_rate = reservation.get('base_price', 0) / max(days, 1) if reservation.get('base_price') else (vehicle or {}).get('price_per_day', 0)

    vname = f"{(vehicle or {}).get('brand', '')} {(vehicle or {}).get('model', '')}".strip() or "Vehicule"
    items.append(_calc_item("RENTAL", f"Location {vname} ({days} jour{'s' if days > 1 else ''})", days, daily_rate))

    # Options
    for opt in reservation.get('options', []):
        if isinstance(opt, dict):
            items.append(_calc_item(
                "OPTION",
                opt.get('name', 'Option'),
                days,
                opt.get('price_per_day', 0),
            ))

    # Service fee
    items.append(_calc_item("SERVICE", "Frais de service", 1, 20))

    return items


# ==================== ADD PENALTY ====================

@router.post("/invoices/{invoice_id}/add-penalty")
async def add_penalty_invoice(invoice_id: str, payload: InvoicePenaltyAdd, user: dict = Depends(get_admin_user)):
    """Create a penalty invoice linked to an existing invoice."""
    parent = await db.invoices.find_one({"id": invoice_id})
    if not parent:
        raise HTTPException(status_code=404, detail="Facture introuvable")

    items = []
    for pi in payload.items:
        items.append(_calc_item(
            pi.get('code', 'PENALTY'),
            pi.get('label', 'Penalite'),
            pi.get('quantity', 1),
            pi.get('unit_price', 0),
        ))

    totals = _calc_totals(items)
    inv_number = await _next_invoice_number()

    penalty_inv = {
        "id": str(uuid.uuid4()),
        "invoice_number": inv_number,
        "invoice_type": "penalty",
        "status": "pending",
        "customer_id": parent['customer_id'],
        "reservation_id": parent.get('reservation_id'),
        "vehicle_id": parent.get('vehicle_id'),
        "agency_id": parent.get('agency_id'),
        "issue_date": date.today().isoformat(),
        "due_date": (date.today() + timedelta(days=15)).isoformat(),
        "currency": "CHF",
        "start_date": parent.get('start_date'),
        "end_date": parent.get('end_date'),
        **totals,
        "amount_paid": 0,
        "balance_due": totals['total_incl_tax'],
        "payment_method": None,
        "stripe_payment_intent_id": None,
        "stripe_session_id": None,
        "qr_reference": None,
        "pdf_url": None,
        "items": items,
        "notes": payload.notes,
        "parent_invoice_id": invoice_id,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }

    await db.invoices.insert_one(penalty_inv)
    return _serialize(penalty_inv)


# ==================== CREDIT NOTE ====================

@router.post("/invoices/{invoice_id}/credit-note")
async def create_credit_note(invoice_id: str, user: dict = Depends(get_admin_user)):
    """Create a credit note (avoir) for an existing invoice."""
    parent = await db.invoices.find_one({"id": invoice_id})
    if not parent:
        raise HTTPException(status_code=404, detail="Facture introuvable")

    # Reverse all items
    items = []
    for item in parent.get('items', []):
        items.append({
            **item,
            "label": f"Avoir - {item.get('label', '')}",
            "total_excl_tax": -abs(item.get('total_excl_tax', 0)),
            "total_incl_tax": -abs(item.get('total_incl_tax', 0)),
        })

    totals = _calc_totals(items)
    inv_number = await _next_invoice_number()

    credit = {
        "id": str(uuid.uuid4()),
        "invoice_number": inv_number,
        "invoice_type": "credit_note",
        "status": "refunded",
        "customer_id": parent['customer_id'],
        "reservation_id": parent.get('reservation_id'),
        "vehicle_id": parent.get('vehicle_id'),
        "agency_id": parent.get('agency_id'),
        "issue_date": date.today().isoformat(),
        "due_date": date.today().isoformat(),
        "currency": "CHF",
        "start_date": parent.get('start_date'),
        "end_date": parent.get('end_date'),
        **totals,
        "amount_paid": 0,
        "balance_due": totals['total_incl_tax'],
        "payment_method": None,
        "stripe_payment_intent_id": None,
        "stripe_session_id": None,
        "qr_reference": None,
        "pdf_url": None,
        "items": items,
        "notes": f"Avoir pour facture {parent.get('invoice_number', '')}",
        "parent_invoice_id": invoice_id,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }

    # Mark original as refunded
    await db.invoices.update_one({"id": invoice_id}, {"$set": {"status": "refunded", "updated_at": datetime.now(timezone.utc)}})
    await db.invoices.insert_one(credit)
    return _serialize(credit)


# ==================== LIST / GET ====================

@router.get("/invoices")
async def list_invoices(
    status: Optional[str] = None,
    invoice_type: Optional[str] = None,
    customer_id: Optional[str] = None,
    reservation_id: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """List invoices. Admins see agency invoices, clients see their own."""
    query = {}

    if user.get('role') == 'client':
        query['customer_id'] = user['id']
    elif user.get('role') == 'agency_admin':
        query['agency_id'] = user.get('agency_id')
    # super_admin sees all

    if status:
        query['status'] = status
    if invoice_type:
        query['invoice_type'] = invoice_type
    if customer_id and user.get('role') != 'client':
        query['customer_id'] = customer_id
    if reservation_id:
        query['reservation_id'] = reservation_id

    invoices = await db.invoices.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)

    # Enrich with customer and vehicle names
    for inv in invoices:
        cust = await db.users.find_one({"id": inv.get('customer_id')}, {"_id": 0, "name": 1, "email": 1})
        inv['customer_name'] = cust.get('name', '') if cust else ''
        inv['customer_email'] = cust.get('email', '') if cust else ''

        if inv.get('vehicle_id'):
            veh = await db.vehicles.find_one({"id": inv['vehicle_id']}, {"_id": 0, "brand": 1, "model": 1})
            inv['vehicle_name'] = f"{veh.get('brand', '')} {veh.get('model', '')}" if veh else ''
        else:
            inv['vehicle_name'] = ''

    return invoices


@router.get("/invoices/{invoice_id}")
async def get_invoice(invoice_id: str, user: dict = Depends(get_current_user)):
    """Get a single invoice."""
    inv = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not inv:
        raise HTTPException(status_code=404, detail="Facture introuvable")

    # Access control
    if user.get('role') == 'client' and inv.get('customer_id') != user['id']:
        raise HTTPException(status_code=403, detail="Acces refuse")
    if user.get('role') == 'agency_admin' and inv.get('agency_id') != user.get('agency_id'):
        raise HTTPException(status_code=403, detail="Acces refuse")

    # Enrich
    cust = await db.users.find_one({"id": inv.get('customer_id')}, {"_id": 0})
    inv['customer'] = _serialize(cust) if cust else {}
    if inv.get('vehicle_id'):
        veh = await db.vehicles.find_one({"id": inv['vehicle_id']}, {"_id": 0})
        inv['vehicle'] = _serialize(veh) if veh else {}

    return inv


# ==================== PDF ====================

@router.get("/invoices/{invoice_id}/pdf")
async def get_invoice_pdf(invoice_id: str, user: dict = Depends(get_current_user)):
    """Generate and return the invoice PDF with Swiss QR-bill."""
    inv = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not inv:
        raise HTTPException(status_code=404, detail="Facture introuvable")

    if user.get('role') == 'client' and inv.get('customer_id') != user['id']:
        raise HTTPException(status_code=403, detail="Acces refuse")

    customer = await db.users.find_one({"id": inv['customer_id']}, {"_id": 0})
    vehicle = None
    if inv.get('vehicle_id'):
        vehicle = await db.vehicles.find_one({"id": inv['vehicle_id']}, {"_id": 0})

    # Get agency billing settings
    company = None
    if inv.get('agency_id'):
        billing = await db.billing_settings.find_one({"agency_id": inv['agency_id']}, {"_id": 0})
        if billing and billing.get('company_name'):
            company = {
                "name": billing['company_name'],
                "street": billing.get('street', ''),
                "house_number": billing.get('house_number', ''),
                "pcode": billing.get('pcode', ''),
                "city": billing.get('city', ''),
                "country": billing.get('country', 'CH'),
                "phone": billing.get('phone', ''),
                "email": billing.get('email', ''),
                "website": billing.get('website', ''),
                "iban": billing.get('iban', ''),
                "vat_number": billing.get('vat_number', ''),
            }

    pdf_bytes = generate_invoice_pdf(inv, customer or {}, vehicle, company)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename={inv.get('invoice_number', 'facture')}.pdf"}
    )


# ==================== MARK PAID ====================

@router.post("/invoices/{invoice_id}/mark-paid")
async def mark_invoice_paid(invoice_id: str, payload: InvoiceMarkPaid, user: dict = Depends(get_admin_user)):
    """Manually mark an invoice as paid (cash, bank transfer, etc.)."""
    inv = await db.invoices.find_one({"id": invoice_id})
    if not inv:
        raise HTTPException(status_code=404, detail="Facture introuvable")

    await db.invoices.update_one(
        {"id": invoice_id},
        {"$set": {
            "status": "paid",
            "amount_paid": inv.get('total_incl_tax', 0),
            "balance_due": 0,
            "payment_method": payload.payment_method,
            "notes": payload.notes or inv.get('notes'),
            "updated_at": datetime.now(timezone.utc),
        }}
    )

    # Update reservation payment status if linked
    if inv.get('reservation_id'):
        await db.reservations.update_one(
            {"id": inv['reservation_id']},
            {"$set": {"payment_status": "paid", "updated_at": datetime.now(timezone.utc)}}
        )

    return {"message": "Facture marquee comme payee", "invoice_id": invoice_id}


# ==================== STRIPE PAYMENT ====================

@router.post("/invoices/{invoice_id}/pay")
async def pay_invoice_stripe(invoice_id: str, payment_method: str = "stripe_card", origin_url: str = "", user: dict = Depends(get_current_user)):
    """Create a Stripe Checkout session for paying an invoice."""
    from emergentintegrations.payments.stripe import StripeCheckout
    from emergentintegrations.payments.stripe.checkout import CheckoutSessionRequest
    from database import STRIPE_API_KEY

    inv = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not inv:
        raise HTTPException(status_code=404, detail="Facture introuvable")

    if inv.get('status') == 'paid':
        raise HTTPException(status_code=400, detail="Facture deja payee")

    balance = inv.get('balance_due', inv.get('total_incl_tax', 0))
    if balance <= 0:
        raise HTTPException(status_code=400, detail="Aucun solde a payer")

    host_url = origin_url.rstrip('/') if origin_url else "https://app.logirent.ch"
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)

    success_url = f"{host_url}/payment-success?session_id={{CHECKOUT_SESSION_ID}}&invoice_id={invoice_id}"
    cancel_url = f"{host_url}/payment-cancel?invoice_id={invoice_id}"

    metadata = {
        "invoice_id": invoice_id,
        "invoice_number": inv.get('invoice_number', ''),
        "user_id": user['id'],
        "user_email": user.get('email', ''),
    }

    payment_methods = ['twint'] if payment_method == 'stripe_twint' else ['card']

    checkout_request = CheckoutSessionRequest(
        amount=float(balance),
        currency="chf",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata,
        payment_methods=payment_methods,
    )

    session = await stripe_checkout.create_checkout_session(checkout_request)

    await db.invoices.update_one(
        {"id": invoice_id},
        {"$set": {
            "stripe_session_id": session.session_id,
            "payment_method": payment_method,
            "updated_at": datetime.now(timezone.utc),
        }}
    )

    return {"url": session.url, "session_id": session.session_id}


@router.get("/invoices/{invoice_id}/payment-status")
async def check_invoice_payment(invoice_id: str, user: dict = Depends(get_current_user)):
    """Check the payment status of an invoice via Stripe."""
    from emergentintegrations.payments.stripe import StripeCheckout
    from database import STRIPE_API_KEY

    inv = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not inv:
        raise HTTPException(status_code=404, detail="Facture introuvable")

    if not inv.get('stripe_session_id'):
        return {"status": inv.get('status'), "payment_status": inv.get('status')}

    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="https://placeholder.com/webhook")

    try:
        checkout_status = await stripe_checkout.get_checkout_status(inv['stripe_session_id'])

        if checkout_status.payment_status == 'paid' and inv.get('status') != 'paid':
            await db.invoices.update_one(
                {"id": invoice_id},
                {"$set": {
                    "status": "paid",
                    "amount_paid": inv.get('total_incl_tax', 0),
                    "balance_due": 0,
                    "updated_at": datetime.now(timezone.utc),
                }}
            )
            if inv.get('reservation_id'):
                await db.reservations.update_one(
                    {"id": inv['reservation_id']},
                    {"$set": {"payment_status": "paid", "updated_at": datetime.now(timezone.utc)}}
                )

        return {
            "status": checkout_status.status,
            "payment_status": checkout_status.payment_status,
            "amount": checkout_status.amount_total / 100 if checkout_status.amount_total else 0,
        }
    except Exception as e:
        logger.error(f"Stripe status check failed: {e}")
        return {"status": inv.get('status'), "payment_status": inv.get('status')}


# ==================== SEND EMAIL ====================

@router.post("/invoices/{invoice_id}/send")
async def send_invoice_email(invoice_id: str, user: dict = Depends(get_admin_user)):
    """Send invoice PDF by email to the customer."""
    inv = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not inv:
        raise HTTPException(status_code=404, detail="Facture introuvable")

    customer = await db.users.find_one({"id": inv['customer_id']}, {"_id": 0})
    if not customer or not customer.get('email'):
        raise HTTPException(status_code=400, detail="Email client manquant")

    vehicle = None
    if inv.get('vehicle_id'):
        vehicle = await db.vehicles.find_one({"id": inv['vehicle_id']}, {"_id": 0})

    try:
        pdf_bytes = generate_invoice_pdf(inv, customer, vehicle)

        import resend
        from database import RESEND_API_KEY, SENDER_EMAIL
        resend.api_key = RESEND_API_KEY

        import base64
        pdf_b64 = base64.b64encode(pdf_bytes).decode()

        type_labels = {
            'deposit': "Facture d'acompte",
            'reservation': 'Facture',
            'final': 'Facture finale',
            'penalty': 'Facture penalite',
            'credit_note': 'Avoir',
        }
        subject = f"{type_labels.get(inv.get('invoice_type'), 'Facture')} {inv.get('invoice_number', '')} - LogiRent"

        resend.Emails.send({
            "from": SENDER_EMAIL,
            "to": customer['email'],
            "subject": subject,
            "html": f"""
                <h2>LogiRent - {type_labels.get(inv.get('invoice_type'), 'Facture')}</h2>
                <p>Bonjour {customer.get('name', '')},</p>
                <p>Veuillez trouver ci-joint votre {type_labels.get(inv.get('invoice_type'), 'facture').lower()} n° <strong>{inv.get('invoice_number', '')}</strong>.</p>
                <p><strong>Montant total: CHF {inv.get('total_incl_tax', 0):.2f}</strong></p>
                <p><strong>Solde du: CHF {inv.get('balance_due', 0):.2f}</strong></p>
                <p>Merci de votre confiance.</p>
                <p>LogiRent SA</p>
            """,
            "attachments": [{
                "filename": f"{inv.get('invoice_number', 'facture')}.pdf",
                "content": pdf_b64,
                "content_type": "application/pdf",
            }],
        })

        return {"message": f"Facture envoyee a {customer['email']}"}
    except Exception as e:
        logger.error(f"Failed to send invoice email: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur d'envoi: {str(e)}")


# ==================== DELETE ====================

@router.delete("/invoices/{invoice_id}")
async def delete_invoice(invoice_id: str, user: dict = Depends(get_admin_user)):
    """Delete a draft invoice."""
    inv = await db.invoices.find_one({"id": invoice_id})
    if not inv:
        raise HTTPException(status_code=404, detail="Facture introuvable")
    if inv.get('status') not in ('draft', 'cancelled'):
        raise HTTPException(status_code=400, detail="Seules les factures brouillon ou annulees peuvent etre supprimees")

    await db.invoices.delete_one({"id": invoice_id})
    return {"message": "Facture supprimee"}
