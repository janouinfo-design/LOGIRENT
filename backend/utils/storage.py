import os
import uuid
import logging
import requests

logger = logging.getLogger(__name__)

STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "logirent"
LOCAL_UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")

storage_key = None
use_local = False


def init_storage():
    global storage_key, use_local
    if storage_key:
        return storage_key
    if not EMERGENT_KEY:
        logger.info("No EMERGENT_LLM_KEY, using local file storage")
        use_local = True
        os.makedirs(LOCAL_UPLOAD_DIR, exist_ok=True)
        return None
    try:
        resp = requests.post(
            f"{STORAGE_URL}/init",
            json={"emergent_key": EMERGENT_KEY},
            timeout=10,
        )
        resp.raise_for_status()
        storage_key = resp.json()["storage_key"]
        logger.info("Object storage initialized successfully")
        return storage_key
    except Exception as e:
        logger.warning(f"Object storage unavailable ({e}), falling back to local storage")
        use_local = True
        os.makedirs(LOCAL_UPLOAD_DIR, exist_ok=True)
        return None


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    if use_local:
        local_path = os.path.join(LOCAL_UPLOAD_DIR, path)
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        with open(local_path, "wb") as f:
            f.write(data)
        logger.info(f"Saved locally: {local_path}")
        return {"path": path}
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data,
        timeout=120,
    )
    resp.raise_for_status()
    return resp.json()


def get_object(path: str) -> tuple:
    key = init_storage()
    if use_local:
        local_path = os.path.join(LOCAL_UPLOAD_DIR, path)
        if not os.path.exists(local_path):
            raise FileNotFoundError(f"File not found: {local_path}")
        ext = path.rsplit(".", 1)[-1].lower()
        ct_map = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp", "gif": "image/gif", "pdf": "application/pdf"}
        content_type = ct_map.get(ext, "application/octet-stream")
        with open(local_path, "rb") as f:
            return f.read(), content_type
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key},
        timeout=60,
    )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


def get_public_url(path: str) -> str:
    key = init_storage()
    if use_local:
        return f"/api/vehicles/photo/{path}"
    return f"{STORAGE_URL}/objects/{path}?key={key}"


def generate_storage_path(vehicle_id: str, filename: str) -> str:
    ext = filename.rsplit(".", 1)[-1] if "." in filename else "bin"
    return f"{APP_NAME}/vehicles/{vehicle_id}/{uuid.uuid4()}.{ext}"
