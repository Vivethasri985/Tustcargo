from collections.abc import Iterator
from dataclasses import dataclass, field

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import database
from app.config import settings
from app.database import Base, get_db
from app.main import app
from app.services import auth
from app.services.paypal import CapturedPayment, CreatedOrder, PayPalError, Refund, get_paypal


@dataclass
class FakePayPal:
    refunds: list[tuple[str, str]] = field(default_factory=list)
    orders: list[str] = field(default_factory=list)
    order_ids: list[dict] = field(default_factory=list)
    tracking: list[str] = field(default_factory=list)
    expired: set[str] = field(default_factory=set)
    fail_refund: bool = False

    def create_order(self, amount, description, return_url, cancel_url, **ids):
        self.orders.append(amount)
        self.order_ids.append(ids)
        order_id = f"ORDER{len(self.orders)}"
        return CreatedOrder(order_id, "CREATED", f"https://pay.test/{order_id}")

    def get_order(self, order_id):
        if order_id in self.expired:
            raise PayPalError("not found")
        return {"id": order_id, "status": "PAYER_ACTION_REQUIRED"}

    def capture_order(self, order_id):
        return CapturedPayment(order_id, f"CAPTURE-{order_id}", "COMPLETED", None)

    def add_tracking(self, order_id, capture_id, tracking_number, carrier):
        self.tracking.append(tracking_number)

    def refund_capture(self, capture_id, amount, request_id=None):
        if self.fail_refund:
            raise PayPalError("failed")
        self.refunds.append((capture_id, amount))
        return Refund("REFUND1", "COMPLETED")

    def verify_webhook(self, headers, event):
        return headers.get("x-test-valid") == "yes"


@pytest.fixture
def paypal() -> FakePayPal:
    return FakePayPal()


@pytest.fixture
def make_client(paypal: FakePayPal, tmp_path, monkeypatch: pytest.MonkeyPatch) -> Iterator:
    monkeypatch.setattr(settings, "groq_api_key", "")
    monkeypatch.setattr(settings, "smtp_host", "")
    monkeypatch.setattr(settings, "upload_dir", str(tmp_path))
    monkeypatch.setattr(auth, "_failures", auth.defaultdict(auth.deque))
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine, expire_on_commit=False)
    monkeypatch.setattr(database, "SessionLocal", session)
    monkeypatch.setattr("app.services.email.SessionLocal", session)

    def db_override():
        with session() as db:
            yield db

    app.dependency_overrides[get_db] = db_override
    app.dependency_overrides[get_paypal] = lambda: paypal
    clients: list[TestClient] = []

    def factory() -> TestClient:
        client = TestClient(app, headers={"origin": settings.frontend_url})
        clients.append(client)
        return client

    yield factory
    app.dependency_overrides.clear()


def signup(client: TestClient, email: str, name: str, country: str) -> dict:
    response = client.post(
        "/api/auth/signup",
        json={"email": email, "password": "correct horse", "name": name, "business_name": name, "country": country},
    )
    assert response.status_code == 201, response.text
    return response.json()


@pytest.fixture
def seller(make_client) -> TestClient:
    client = make_client()
    signup(client, "seller@silk.test", "Chennai Silk House", "India")
    return client


@pytest.fixture
def buyer(make_client) -> TestClient:
    client = make_client()
    signup(client, "buyer@cape.test", "Cape Retail", "South Africa")
    return client


@pytest.fixture
def stranger(make_client) -> TestClient:
    client = make_client()
    signup(client, "someone@else.test", "Someone Else", "Kenya")
    return client
