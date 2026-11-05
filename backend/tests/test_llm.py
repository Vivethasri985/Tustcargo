import json

import httpx
import pytest

from app.config import settings
from app.services import llm

SCHEMA = {
    "type": "object",
    "properties": {
        "accept": {"type": "boolean"},
        "offer_dollars": {"type": "number"},
    },
    "required": ["accept", "offer_dollars"],
}
TEXT = [{"type": "text", "text": "Offer"}]
IMAGE = [
    {"type": "text", "text": "Check this"},
    {"type": "image_url", "image_url": {"url": "data:image/png;base64,AA=="}},
]


def client_returning(content: str, requests: list | None = None) -> httpx.Client:
    def handler(request: httpx.Request) -> httpx.Response:
        if requests is not None:
            requests.append(json.loads(request.content))
        return httpx.Response(
            200,
            json={"choices": [{"message": {"content": content}}]},
        )

    return httpx.Client(transport=httpx.MockTransport(handler))


@pytest.fixture(autouse=True)
def api_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "groq_api_key", "key")


def test_valid_json_is_returned() -> None:
    result = llm.ask_json(
        "System",
        TEXT,
        SCHEMA,
        client_returning('{"accept": false, "offer_dollars": 22}'),
    )

    assert result == {"accept": False, "offer_dollars": 22}


@pytest.mark.parametrize(
    "content",
    [
        "not json",
        "[]",
        '{"accept": false}',
        '{"accept": "false", "offer_dollars": 22}',
        '{"accept": false, "offer_dollars": true}',
    ],
)
def test_invalid_output_returns_none(content: str) -> None:
    assert llm.ask_json("System", TEXT, SCHEMA, client_returning(content)) is None


def test_failed_request_returns_none() -> None:
    client = httpx.Client(
        transport=httpx.MockTransport(lambda request: httpx.Response(429, text="limit"))
    )

    assert llm.ask_json("System", TEXT, SCHEMA, client) is None


def test_missing_key_returns_none(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "groq_api_key", "")

    assert llm.ask_json("System", TEXT, SCHEMA) is None


def test_images_use_the_vision_model() -> None:
    requests: list = []
    llm.ask_json(
        "System",
        IMAGE,
        SCHEMA,
        client_returning('{"accept": true, "offer_dollars": 22}', requests),
    )

    assert requests[0]["model"] == settings.groq_vision_model
    assert requests[0]["response_format"] == {"type": "json_object"}
    assert "JSON schema" in requests[0]["messages"][0]["content"]


def test_text_uses_the_text_model() -> None:
    requests: list = []
    llm.ask_json(
        "System",
        TEXT,
        SCHEMA,
        client_returning('{"accept": true, "offer_dollars": 22}', requests),
    )

    assert requests[0]["model"] == settings.groq_model


def test_unreadable_pdf_becomes_a_note(tmp_path) -> None:
    path = tmp_path / "bad.pdf"
    path.write_bytes(b"not a pdf")

    block = llm.file_block(path, "application/pdf")

    assert block == {"type": "text", "text": "Uploaded PDF: no readable text was found."}
