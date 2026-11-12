"""Storage for uploaded evidence."""

import hashlib
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import quote
from uuid import uuid4

import httpx
from fastapi import HTTPException, UploadFile
from starlette.concurrency import run_in_threadpool

from app.config import settings

ALLOWED_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "application/pdf": ".pdf",
}
MAX_FILES = 3
REMOTE_PREFIX = "supabase:"


@dataclass(frozen=True)
class StoredFile:
    stored_name: str
    content_type: str
    size_bytes: int
    sha256: str


def upload_path(stored_name: str) -> Path:
    if not stored_name or "/" in stored_name or "\\" in stored_name or stored_name in {".", ".."}:
        raise HTTPException(404, "File not found.")
    return Path(settings.upload_dir) / stored_name


def _storage_client() -> httpx.Client:
    return httpx.Client(timeout=30, follow_redirects=False)


def _storage_headers() -> dict[str, str]:
    secret = settings.supabase_secret_key.get_secret_value()
    if not settings.supabase_url.startswith("https://") or not secret:
        raise HTTPException(503, "Evidence storage is not configured.")
    headers = {"apikey": secret}
    # Legacy service_role keys are JWTs; modern sb_secret keys use apikey only.
    if not secret.startswith("sb_secret_"):
        headers["Authorization"] = f"Bearer {secret}"
    return headers


def check_private_bucket() -> None:
    """Read-only check: never create a bucket or change its access policies."""
    headers = _storage_headers()
    bucket = quote(settings.supabase_storage_bucket, safe="")
    try:
        with _storage_client() as client:
            response = client.get(f"{settings.supabase_url.rstrip('/')}/storage/v1/bucket/{bucket}", headers=headers)
            if not response.is_success:
                raise HTTPException(503, "Evidence bucket is unavailable; check server configuration.")
            if response.json().get("public") is not False:
                raise HTTPException(503, "Evidence bucket must be private.")
    except (httpx.HTTPError, ValueError, AttributeError):
        raise HTTPException(503, "Evidence bucket could not be verified.") from None


def _remote_request(method: str, object_name: str, data: bytes | None = None, content_type: str = "") -> bytes:
    """Use the private Storage API; never return keys or upstream errors to callers."""
    headers = _storage_headers()
    if content_type:
        headers.update({"Content-Type": content_type, "x-upsert": "false"})
    bucket = quote(settings.supabase_storage_bucket, safe="")
    name = quote(object_name, safe="")
    route = "object/authenticated" if method == "GET" else "object"
    url = f"{settings.supabase_url.rstrip('/')}/storage/v1/{route}/{bucket}/{name}"
    try:
        with _storage_client() as client:
            with client.stream(method, url, headers=headers, content=data) as response:
                if response.status_code == 404:
                    raise HTTPException(404, "File not found.")
                if method == "GET" and response.status_code == 400:
                    response.read()
                    try:
                        missing = str(response.json().get("statusCode")) == "404"
                    except (ValueError, AttributeError):
                        missing = False
                    if missing:
                        raise HTTPException(404, "File not found.")
                if not response.is_success:
                    raise HTTPException(503, "Evidence storage is temporarily unavailable.")
                result = bytearray()
                for chunk in response.iter_bytes():
                    result.extend(chunk)
                    if len(result) > settings.max_upload_mb * 1024 * 1024:
                        raise HTTPException(502, "Stored evidence exceeds the file size limit.")
                return bytes(result)
    except httpx.HTTPError:
        raise HTTPException(503, "Evidence storage is temporarily unavailable.") from None


def read_upload(stored_name: str) -> bytes:
    if stored_name.startswith(REMOTE_PREFIX):
        name = stored_name.removeprefix(REMOTE_PREFIX)
        upload_path(name)  # Validate the object name without reading the local disk.
        return _remote_request("GET", name)
    try:
        with upload_path(stored_name).open("rb") as file:
            data = file.read(settings.max_upload_mb * 1024 * 1024 + 1)
    except FileNotFoundError:
        raise HTTPException(404, "This file is no longer stored on the server.") from None
    if len(data) > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(502, "Stored evidence exceeds the file size limit.")
    return data


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
    if settings.storage_backend == "supabase":
        await run_in_threadpool(_remote_request, "POST", stored_name, data, actual)
        stored_name = REMOTE_PREFIX + stored_name
    else:
        target = upload_path(stored_name)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
    return StoredFile(stored_name, actual, len(data), hashlib.sha256(data).hexdigest())
