import asyncio
import hashlib
from io import BytesIO

import httpx
import pytest
from fastapi import HTTPException, UploadFile
from pydantic import SecretStr
from starlette.datastructures import Headers

from app.config import settings
from app.services import llm, storage
from tests.test_deal_flow import create_approved, deliver, pay, ship

PNG = b"\x89PNG\r\n\x1a\n" + b"test evidence"


@pytest.fixture
def remote_storage(monkeypatch, tmp_path):
    objects = {}
    requests = []
    monkeypatch.setattr(settings, "storage_backend", "supabase")
    monkeypatch.setattr(settings, "supabase_url", "https://storage.example.test")
    monkeypatch.setattr(settings, "supabase_secret_key", SecretStr("sb_secret_test"))
    monkeypatch.setattr(settings, "supabase_storage_bucket", "trustcargo-evidence")
    monkeypatch.setattr(settings, "upload_dir", str(tmp_path / "unused"))

    def handler(request):
        requests.append(request)
        assert request.headers["apikey"] == "sb_secret_test"
        assert "authorization" not in request.headers
        name = request.url.path.rsplit("/", 1)[-1]
        if request.method == "POST":
            assert request.headers["x-upsert"] == "false"
            assert name not in objects
            objects[name] = request.content
            return httpx.Response(200, json={"Key": name})
        assert "/object/authenticated/trustcargo-evidence/" in request.url.path
        return httpx.Response(200, content=objects[name]) if name in objects else httpx.Response(404)

    monkeypatch.setattr(storage, "_storage_client", lambda: httpx.Client(transport=httpx.MockTransport(handler)))
    return objects, requests


def upload(data=PNG, content_type="image/png"):
    file = UploadFile(BytesIO(data), filename="proof.png", headers=Headers({"content-type": content_type}))
    return asyncio.run(storage.save_upload(file))


def test_private_upload_round_trip_and_ai_bytes(remote_storage):
    stored = upload()
    assert stored.stored_name.startswith("supabase:")
    assert stored.sha256 == hashlib.sha256(PNG).hexdigest()
    assert stored.size_bytes == len(PNG)
    assert storage.read_upload(stored.stored_name) == PNG
    assert llm.file_bytes_block(storage.read_upload(stored.stored_name), "image/png")["type"] == "image_url"
    assert not storage.upload_path("unused").parent.exists()


def test_legacy_service_role_auth_header(remote_storage, monkeypatch):
    monkeypatch.setattr(settings, "supabase_secret_key", SecretStr("legacy.jwt.key"))
    def handler(request):
        assert request.headers["apikey"] == "legacy.jwt.key"
        assert request.headers["authorization"] == "Bearer legacy.jwt.key"
        return httpx.Response(200, content=PNG)
    monkeypatch.setattr(storage, "_storage_client", lambda: httpx.Client(transport=httpx.MockTransport(handler)))
    assert storage.read_upload("supabase:proof.png") == PNG


@pytest.mark.parametrize("status", [401, 403, 429, 500])
def test_storage_failure_is_sanitized_and_never_writes_locally(remote_storage, monkeypatch, status):
    monkeypatch.setattr(storage, "_storage_client", lambda: httpx.Client(transport=httpx.MockTransport(
        lambda request: httpx.Response(status, text="secret upstream details")
    )))
    with pytest.raises(HTTPException) as error:
        upload()
    assert error.value.status_code == 503
    assert "secret" not in error.value.detail
    assert not storage.upload_path("unused").parent.exists()


def test_remote_missing_file(remote_storage):
    with pytest.raises(HTTPException) as error:
        storage.read_upload("supabase:missing.png")
    assert error.value.status_code == 404


def test_supabase_wrapped_not_found(remote_storage, monkeypatch):
    monkeypatch.setattr(storage, "_storage_client", lambda: httpx.Client(transport=httpx.MockTransport(
        lambda request: httpx.Response(400, json={"statusCode": "404", "error": "not_found"})
    )))
    with pytest.raises(HTTPException) as error:
        storage.read_upload("supabase:missing.png")
    assert error.value.status_code == 404


@pytest.mark.parametrize("public", [True, None, False])
def test_bucket_privacy_check(remote_storage, monkeypatch, public):
    monkeypatch.setattr(storage, "_storage_client", lambda: httpx.Client(transport=httpx.MockTransport(
        lambda request: httpx.Response(200, json={"public": public})
    )))
    if public is False:
        storage.check_private_bucket()
    else:
        with pytest.raises(HTTPException, match="private"):
            storage.check_private_bucket()


def test_remote_timeout_is_sanitized(remote_storage, monkeypatch):
    def timeout(request):
        raise httpx.ReadTimeout("private upstream details", request=request)
    monkeypatch.setattr(storage, "_storage_client", lambda: httpx.Client(transport=httpx.MockTransport(timeout)))
    with pytest.raises(HTTPException) as error:
        storage.read_upload("supabase:proof.png")
    assert error.value.status_code == 503
    assert "upstream" not in error.value.detail


def test_oversized_remote_read_is_rejected(remote_storage, monkeypatch):
    remote_storage[0]["proof.png"] = PNG
    monkeypatch.setattr(settings, "max_upload_mb", 0)
    with pytest.raises(HTTPException) as error:
        storage.read_upload("supabase:proof.png")
    assert error.value.status_code == 502


def test_oversized_upload_never_reaches_storage(remote_storage, monkeypatch):
    monkeypatch.setattr(settings, "max_upload_mb", 0)
    with pytest.raises(HTTPException) as error:
        upload()
    assert error.value.status_code == 413
    assert remote_storage[1] == []


def test_upload_validation_precedes_remote_write(remote_storage):
    for data, content_type, status in [(b"", "image/png", 422), (b"not png", "image/png", 415), (PNG, "text/plain", 415)]:
        with pytest.raises(HTTPException) as error:
            upload(data, content_type)
        assert error.value.status_code == status
    assert remote_storage[1] == []


def test_local_records_remain_readable_after_switching_storage(remote_storage, tmp_path):
    path = storage.upload_path("old.png")
    path.parent.mkdir(parents=True)
    path.write_bytes(PNG)
    assert storage.read_upload("old.png") == PNG
    assert remote_storage[1] == []


@pytest.mark.parametrize("name", ["../secret", "..\\secret", "supabase:../secret"])
def test_invalid_object_names_are_rejected(remote_storage, name):
    with pytest.raises(HTTPException) as error:
        storage.read_upload(name)
    assert error.value.status_code == 404
    assert remote_storage[1] == []


def test_remote_evidence_flow_and_authorization(seller, buyer, stranger, remote_storage, monkeypatch):
    # Real API + ORM + storage adapter, with only external HTTP/PayPal mocked.
    observed = []
    original = llm.file_bytes_block
    def inspect_bytes(data, content_type):
        observed.append((data, content_type))
        return original(data, content_type)
    monkeypatch.setattr(llm, "file_bytes_block", inspect_bytes)
    deal = create_approved(seller, buyer)
    pay(buyer, deal["id"], "deposit")
    shipped = ship(seller, deal["id"])
    assert shipped["status"] == "shipment_verified"
    evidence = shipped["evidence"][0]
    url = evidence["url"]
    request_count = len(remote_storage[1])
    assert stranger.get(url).status_code == 404
    stranger.cookies.clear()
    assert stranger.get(url).status_code == 401
    assert len(remote_storage[1]) == request_count
    response = buyer.get(url)
    assert response.status_code == 200
    assert response.content == b"%PDF-1.4"
    assert response.headers["content-type"] == "application/pdf"
    assert response.headers["content-disposition"].startswith("inline;")
    assert "sb_secret" not in response.text
    pay(buyer, deal["id"], "balance")
    deliver(seller, deal["id"])
    claim = buyer.post(f"/api/deals/{deal['id']}/inspection", data={"received_quantity": 90},
                       files={"files": ("damage.png", PNG, "image/png")})
    assert claim.status_code == 200
    assert claim.json()["status"] == "refund_suggested"
    assert (b"%PDF-1.4", "application/pdf") in observed
    assert (PNG, "image/png") in observed
    assert len(remote_storage[0]) == 2
