import math
from datetime import datetime
from config import db


def haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371000
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

def calculate_duration(clock_in: datetime, clock_out: datetime, break_start: datetime = None, break_end: datetime = None) -> tuple:
    if not clock_in or not clock_out:
        return 0.0, 0.0
    total_seconds = (clock_out - clock_in).total_seconds()
    break_seconds = 0.0
    if break_start and break_end:
        break_seconds = (break_end - break_start).total_seconds()
    work_seconds = total_seconds - break_seconds
    work_hours = max(0, work_seconds / 3600)
    break_hours = break_seconds / 3600
    return round(work_hours, 2), round(break_hours, 2)

async def create_notification(user_id: str, title: str, message: str, notif_type: str = "info"):
    await db.notifications.insert_one({
        'user_id': user_id,
        'title': title,
        'message': message,
        'type': notif_type,
        'read': False,
        'created_at': datetime.utcnow()
    })

async def create_audit_log(user_id: str, action: str, entity: str, entity_id: str = None, details: str = None, ip_address: str = None):
    await db.audit_logs.insert_one({
        'user_id': user_id,
        'action': action,
        'entity': entity,
        'entity_id': entity_id,
        'details': details,
        'ip_address': ip_address,
        'timestamp': datetime.utcnow()
    })
