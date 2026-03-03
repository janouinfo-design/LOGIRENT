from fastapi import APIRouter, HTTPException, Depends, Request
from datetime import datetime
import logging

from database import db, STRIPE_API_KEY
from models import CheckoutRequest, PaymentTransaction
from deps import get_current_user
from utils.email import send_reservation_confirmation
from utils.notifications import create_notification, notify_admins_of_agency

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/payments/checkout")
async def create_checkout(request: Request, checkout_data: CheckoutRequest, user: dict = Depends(get_current_user)):
    from emergentintegrations.payments.stripe import StripeCheckout, CheckoutSessionRequest

    reservation = await db.reservations.find_one({"id": checkout_data.reservation_id, "user_id": user['id']})
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")

    if reservation['payment_status'] == 'paid':
        raise HTTPException(status_code=400, detail="Reservation already paid")

    host_url = checkout_data.origin_url.rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)

    success_url = f"{host_url}/payment-success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{host_url}/payment-cancel?reservation_id={reservation['id']}"

    metadata = {"user_id": user['id'], "reservation_id": reservation['id'], "user_email": user['email']}
    payment_methods = ['twint'] if checkout_data.payment_method_type == 'twint' else ['card']

    checkout_request = CheckoutSessionRequest(
        amount=float(reservation['total_price']),
        currency="chf",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata,
        payment_methods=payment_methods
    )

    session = await stripe_checkout.create_checkout_session(checkout_request)

    payment_transaction = PaymentTransaction(
        user_id=user['id'],
        reservation_id=reservation['id'],
        session_id=session.session_id,
        amount=float(reservation['total_price']),
        currency="chf",
        status="initiated",
        payment_status="pending",
        metadata=metadata
    )

    await db.payment_transactions.insert_one(payment_transaction.dict())
    await db.reservations.update_one(
        {"id": reservation['id']},
        {"$set": {"payment_session_id": session.session_id}}
    )

    return {"url": session.url, "session_id": session.session_id}


@router.get("/payments/status/{session_id}")
async def get_payment_status(session_id: str, user: dict = Depends(get_current_user)):
    from emergentintegrations.payments.stripe import StripeCheckout

    transaction = await db.payment_transactions.find_one({"session_id": session_id, "user_id": user['id']})
    if not transaction:
        raise HTTPException(status_code=404, detail="Payment not found")

    webhook_url = "https://placeholder.com/webhook"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)

    try:
        checkout_status = await stripe_checkout.get_checkout_status(session_id)

        if checkout_status.payment_status == 'paid' and transaction['status'] != 'paid':
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {"status": "paid", "payment_status": "paid", "updated_at": datetime.utcnow()}}
            )
            await db.reservations.update_one(
                {"id": transaction['reservation_id']},
                {"$set": {"status": "confirmed", "payment_status": "paid", "updated_at": datetime.utcnow()}}
            )

            try:
                reservation = await db.reservations.find_one({"id": transaction['reservation_id']})
                vehicle = await db.vehicles.find_one({"id": reservation['vehicle_id']})
                if reservation and vehicle:
                    await send_reservation_confirmation(user, vehicle, reservation)
                    # Notify client: payment success
                    vname = f"{vehicle['brand']} {vehicle['model']}"
                    await create_notification(
                        user['id'], 'payment_success',
                        f"Votre paiement de CHF {reservation['total_price']:.2f} pour {vname} a été confirmé.",
                        transaction['reservation_id']
                    )
                    # Notify agency admins: payment received
                    if reservation.get('agency_id'):
                        await notify_admins_of_agency(
                            reservation['agency_id'], 'payment_received',
                            f"Paiement de CHF {reservation['total_price']:.2f} reçu de {user['name']} pour {vname}.",
                            transaction['reservation_id']
                        )
            except Exception as email_error:
                logger.error(f"Failed to send confirmation email: {email_error}")

        return {
            "status": checkout_status.status,
            "payment_status": checkout_status.payment_status,
            "amount": checkout_status.amount_total / 100,
            "currency": checkout_status.currency
        }
    except Exception as e:
        logger.error(f"Error checking payment status: {e}")
        return {
            "status": transaction['status'],
            "payment_status": transaction['payment_status'],
            "amount": transaction['amount'],
            "currency": transaction['currency']
        }


@router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    logger.info("Received Stripe webhook")
    return {"received": True}
