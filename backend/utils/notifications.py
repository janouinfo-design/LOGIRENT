import uuid
import logging
from datetime import datetime
from database import db

logger = logging.getLogger(__name__)

NOTIFICATION_TYPES = {
    'reservation_confirmed': {'title_fr': 'Réservation confirmée', 'icon': 'checkmark-circle'},
    'reservation_cancelled': {'title_fr': 'Réservation annulée', 'icon': 'close-circle'},
    'reservation_active': {'title_fr': 'Réservation active', 'icon': 'car'},
    'reservation_completed': {'title_fr': 'Réservation terminée', 'icon': 'flag'},
    'payment_received': {'title_fr': 'Paiement reçu', 'icon': 'cash'},
    'new_reservation': {'title_fr': 'Nouvelle réservation', 'icon': 'calendar'},
    'payment_link_sent': {'title_fr': 'Lien de paiement envoyé', 'icon': 'link'},
}


async def create_notification(user_id: str, notif_type: str, message: str, reservation_id: str = None):
    meta = NOTIFICATION_TYPES.get(notif_type, {'title_fr': 'Notification', 'icon': 'notifications'})
    notif = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "reservation_id": reservation_id,
        "type": notif_type,
        "title": meta['title_fr'],
        "message": message,
        "icon": meta.get('icon', 'notifications'),
        "read": False,
        "created_at": datetime.utcnow(),
    }
    await db.notifications.insert_one(notif)
    return notif


async def notify_admins_of_agency(agency_id: str, notif_type: str, message: str, reservation_id: str = None):
    admins = await db.users.find({"agency_id": agency_id, "role": "admin"}).to_list(50)
    for admin in admins:
        await create_notification(admin['id'], notif_type, message, reservation_id)
