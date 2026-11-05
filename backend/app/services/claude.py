"""Claude API calls."""

import base64
import logging
from pathlib import Path
from typing import Any

import anthropic

from app.config import settings

logger = logging.getLogger(__name__)


def is_enabled() -> bool:
    return bool(settings.anthropic_api_key)


def file_block(path: Path, content_type: str) -> dict[str, Any]:
    data = base64.standard_b64encode(path.read_bytes()).decode()
    block_type = "document" if content_type == "application/pdf" else "image"
    return {
        "type": block_type,
        "source": {"type": "base64", "media_type": content_type, "data": data},
    }


def ask_json(
    system: str,
    content: list[dict[str, Any]],
    tool_name: str,
    schema: dict[str, Any],
) -> dict[str, Any] | None:
    """Return structured Claude output, or None so the caller can use its rules."""
    if not is_enabled():
        return None

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    try:
        response = client.messages.create(
            model=settings.anthropic_model,
            max_tokens=1024,
            system=system,
            messages=[{"role": "user", "content": content}],
            tools=[
                {
                    "name": tool_name,
                    "description": "Return the structured result.",
                    "input_schema": schema,
                }
            ],
            tool_choice={"type": "tool", "name": tool_name},
        )
    except anthropic.AnthropicError:
        logger.exception("Claude request failed")
        return None

    for block in response.content:
        if block.type == "tool_use":
            return dict(block.input)
    return None
