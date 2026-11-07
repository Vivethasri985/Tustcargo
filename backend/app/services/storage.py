"""Storage for uploaded evidence."""

import hashlib
from dataclasses import dataclass
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


@dataclass(frozen=True)
class StoredFile:
    stored_name: str
    content_type: str
    size_bytes: int
    sha256: str


def upload_path(stored_name: str) -> Path:
    return Path(settings.upload_dir) / stored_name


def detect_type(data: bytes) -> str | None:
    """Identify the file from its first bytes instead of trusting the browser."""
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    if data.startswith(b"%PDF-"):
        return "application/pdf"
    return None


async def save_upload(file: UploadFile) -> StoredFile:
    declared = file.content_type or ""
    if declared not in ALLOWED_TYPES:
        raise HTTPException(415, "Upload a JPG, PNG, WEBP or PDF file.")

    limit = settings.max_upload_mb * 1024 * 1024
    data = await file.read(limit + 1)
    if not data:
        raise HTTPException(422, f"{file.filename or 'This file'} is empty.")
    if len(data) > limit:
        raise HTTPException(413, f"Each file must be {settings.max_upload_mb} MB or less.")

    actual = detect_type(data)
    if actual is None or actual != declared:
        raise HTTPException(415, f"{file.filename or 'This file'} isn't a valid {declared} file.")

    stored_name = f"{uuid4().hex}{ALLOWED_TYPES[actual]}"
    target = upload_path(stored_name)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)
    return StoredFile(stored_name, actual, len(data), hashlib.sha256(data).hexdigest())
