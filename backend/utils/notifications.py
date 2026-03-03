import uuid
import logging
import httpx
from datetime import datetime
from database import db

logger = logging.getLogger(__name__)

NOTIFICATION_TYPES = {
    'reservation_confirmed': {'title_fr': 'Réservation confirmée', 'icon': 'checkmark-circle'},
    'reservation_cancelled': {'title_fr': 'Réservation annulée', 'icon': 'close-circle'},
    'reservation_active': {'title_fr': 'Réservation active', 'icon': 'car'},
    'reservation_completed': {'title_fr': 'Réservation terminée', 'icon': 'flag'},
    'payment_received': {'title_fr': 'Paiement reçu', 'icon': 'cash'},
    'payment_success': {'title_fr': 'Paiement réussi', 'icon': 'checkmark-done-circle'},
    'new_reservation': {'title_fr': 'Nouvelle réservation', 'icon': 'calendar'},
    'reservation_created': {'title_fr': 'Réservation créée', 'icon': 'calendar-outline'},
    'reservation_reminder': {'title_fr': 'Rappel de réservation', 'icon': 'alarm'},
    'client_cancelled': {'title_fr': 'Annulation client', 'icon': 'close-circle'},
    'payment_link_sent': {'title_fr': 'Lien de paiement envoyé', 'icon': 'link'},
    'late_return': {'title_fr': 'Retour en retard', 'icon': 'warning'},
    'status_changed': {'title_fr': 'Statut modifié', 'icon': 'refresh-circle'},
    'new_message': {'title_fr': 'Nouveau message', 'icon': 'chatbubble'},
}

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


async def send_expo_push(tokens: list, title: str, body: str, data: dict = None):
    """Send push notification via Expo Push API"""
    if not tokens:
        return
    messages = []
    for token in tokens:
        if not token or not token.startswith("ExponentPushToken"):
            continue
        msg = {"to": token, "sound": "default", "title": title, "body": body}
        if data:
            msg["data"] = data
        messages.append(msg)

    if not messages:
        return

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                EXPO_PUSH_URL,
                json=messages,
                headers={"Content-Type": "application/json"},
                timeout=10,
            )
            if resp.status_code != 200:
                logger.error(f"Expo push error: {resp.status_code} {resp.text}")
    except Exception as e:
        logger.error(f"Expo push send failed: {e}")


async def get_user_push_tokens(user_id: str) -> list:
    """Get all push tokens for a user"""
    tokens = await db.push_tokens.find(
        {"user_id": user_id}, {"_id": 0, "token": 1}
    ).to_list(10)
    return [t["token"] for t in tokens]


async def create_notification(user_id: str, notif_type: str, message: str, reservation_id: str = None):
    meta = NOTIFICATION_TYPES.get(notif_type, {'title_fr': 'Notification', 'icon': 'notifications'})
    title = meta['title_fr']
    notif = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "reservation_id": reservation_id,
        "type": notif_type,
        "title": title,
        "message": message,
        "icon": meta.get('icon', 'notifications'),
        "read": False,
        "created_at": datetime.utcnow(),
    }
    await db.notifications.insert_one(notif)

    # Send push notification
    try:
        tokens = await get_user_push_tokens(user_id)
        if tokens:
            data = {"type": notif_type}
            if reservation_id:
                data["reservation_id"] = reservation_id
            await send_expo_push(tokens, title, message, data)
    except Exception as e:
        logger.error(f"Push notification failed for user {user_id}: {e}")

    return notif


async def notify_admins_of_agency(agency_id: str, notif_type: str, message: str, reservation_id: str = None):
    admins = await db.users.find({"agency_id": agency_id, "role": "admin"}).to_list(50)
    for admin in admins:
        await create_notification(admin['id'], notif_type, message, reservation_id)
