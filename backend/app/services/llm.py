"""Groq chat completion calls."""

import base64
import json
import logging
from io import BytesIO
from pathlib import Path
from typing import Any

import httpx
from pypdf import PdfReader
from pypdf.errors import PyPdfError

from app.config import settings

logger = logging.getLogger(__name__)

TIMEOUT_SECONDS = 45
MAX_PDF_CHARACTERS = 6000
JSON_TYPES = {
    "string": str,
    "number": (int, float),
    "boolean": bool,
    "array": list,
}


def is_enabled() -> bool:
    return bool(settings.groq_api_key)


def file_block(path: Path, content_type: str) -> dict[str, Any]:
    return file_bytes_block(path.read_bytes(), content_type)


def file_bytes_block(data: bytes, content_type: str) -> dict[str, Any]:
    if content_type == "application/pdf":
        return {"type": "text", "text": _pdf_text(data)}

    encoded = base64.standard_b64encode(data).decode()
    return {
        "type": "image_url",
        "image_url": {"url": f"data:{content_type};base64,{encoded}"},
    }


def _pdf_text(data: bytes) -> str:
    try:
        pages = PdfReader(BytesIO(data)).pages
        text = "\n".join(page.extract_text() or "" for page in pages).strip()
    except (PyPdfError, OSError, ValueError):
        logger.warning("Could not read PDF evidence")
        text = ""

    if not text:
        return "Uploaded PDF: no readable text was found."
    return f"Uploaded PDF text:\n{text[:MAX_PDF_CHARACTERS]}"


def _matches_schema(data: Any, schema: dict[str, Any]) -> bool:
    if not isinstance(data, dict):
        return False

    for key in schema["required"]:
        expected = JSON_TYPES[schema["properties"][key]["type"]]
        value = data.get(key)
        if not isinstance(value, expected):
            return False
        if expected != bool and isinstance(value, bool):
            return False
    return True


def ask_json(
    system: str,
    content: list[dict[str, Any]],
    schema: dict[str, Any],
    http_client: httpx.Client | None = None,
) -> dict[str, Any] | None:
    """Return validated JSON, or None so the caller can use its rules."""
    if not is_enabled():
        return None

    has_image = any(block["type"] == "image_url" for block in content)
    model = settings.groq_vision_model if has_image else settings.groq_model
    instructions = (
        f"{system}\n\nReturn only a JSON object that matches this JSON schema:\n"
        f"{json.dumps(schema)}"
    )
    client = http_client or httpx.Client(timeout=TIMEOUT_SECONDS)

    try:
        response = client.post(
            f"{settings.groq_base_url}/chat/completions",
            headers={"Authorization": f"Bearer {settings.groq_api_key}"},
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": instructions},
                    {"role": "user", "content": content},
                ],
                "response_format": {"type": "json_object"},
                "temperature": 0.2,
                "max_completion_tokens": 1024,
            },
        )
        response.raise_for_status()
        data = json.loads(response.json()["choices"][0]["message"]["content"])
    except httpx.HTTPStatusError as error:
        logger.error("Groq returned %s: %s", error.response.status_code, error.response.text)
        return None
    except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError):
        logger.exception("Groq request failed")
        return None

    if not _matches_schema(data, schema):
        logger.error("Groq response did not match the expected format")
        return None
    return data
