"""Storage for uploaded evidence."""

from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile

from app.config import settings

ALLOWED_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "application/pdf": ".pdf",
}
MAX_FILES = 3


def upload_path(stored_name: str) -> Path:
    return Path(settings.upload_dir) / stored_name


async def save_upload(file: UploadFile) -> tuple[str, str]:
    content_type = file.content_type or ""
    extension = ALLOWED_TYPES.get(content_type)
    if extension is None:
        raise HTTPException(415, "Upload a JPG, PNG, WEBP or PDF file.")

    limit = settings.max_upload_mb * 1024 * 1024
    data = await file.read(limit + 1)
    if len(data) > limit:
        raise HTTPException(413, f"Each file must be {settings.max_upload_mb} MB or less.")

    stored_name = f"{uuid4().hex}{extension}"
    target = upload_path(stored_name)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)
    return stored_name, content_type
