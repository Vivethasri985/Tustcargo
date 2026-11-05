from collections.abc import Iterator
from dataclasses import dataclass, field

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import settings
from app.database import Base, get_db
from app.main import app
from app.services.paypal import CapturedPayment, CreatedOrder, PayPalError, Refund, get_paypal

DEAL = {
    "product": "Silk sarees",
    "quantity": 100,
    "buyer_name": "Cape Retail",
    "buyer_country": "South Africa",
    "seller_name": "Chennai Silk House",
    "seller_country": "India",
    "buyer_max_cents": 2500,
    "seller_min_cents": 2000,
    "buyer_deadline_days": 21,
    "seller_lead_days": 18,
}
PDF = {"files": ("receipt.pdf", b"%PDF-1.4", "application/pdf")}


@dataclass
class FakePayPal:
    refunds: list[tuple[str, str]] = field(default_factory=list)
    orders: list[str] = field(default_factory=list)
    tracking: list[str] = field(default_factory=list)
    fail_refund: bool = False

    def create_order(self, amount, description, return_url, cancel_url):
        self.orders.append(amount)
        order_id = f"ORDER{len(self.orders)}"
        return CreatedOrder(order_id, "CREATED", f"https://pay.test/{order_id}")

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
def client(
    paypal: FakePayPal,
    tmp_path,
    monkeypatch: pytest.MonkeyPatch,
) -> Iterator[TestClient]:
    monkeypatch.setattr(settings, "groq_api_key", "")
    monkeypatch.setattr(settings, "upload_dir", str(tmp_path))
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine, expire_on_commit=False)

    def db_override():
        with session() as db:
            yield db

    app.dependency_overrides[get_db] = db_override
    app.dependency_overrides[get_paypal] = lambda: paypal
    yield TestClient(app)
    app.dependency_overrides.clear()


def create_approved(client: TestClient) -> dict:
    deal = client.post("/api/deals", json=DEAL).json()
    client.post(f"/api/deals/{deal['id']}/approve", json={"party": "buyer"})
    return client.post(f"/api/deals/{deal['id']}/approve", json={"party": "seller"}).json()


def pay(client: TestClient, deal_id: int, kind: str) -> dict:
    assert client.post(f"/api/deals/{deal_id}/payments/{kind}").status_code == 200
    return client.post(f"/api/deals/{deal_id}/payments/{kind}/capture").json()


def ship(client: TestClient, deal_id: int, quantity: int = 100) -> dict:
    return client.post(
        f"/api/deals/{deal_id}/shipment",
        data={"carrier": "DHL", "tracking_number": "TRACK123", "shipped_quantity": quantity},
        files=PDF,
    ).json()


def to_balance_paid(client: TestClient) -> dict:
    deal = create_approved(client)
    pay(client, deal["id"], "deposit")
    ship(client, deal["id"])
    return pay(client, deal["id"], "balance")


def test_negotiation_matches_the_example(client: TestClient) -> None:
    deal = client.post("/api/deals", json=DEAL).json()

    assert deal["status"] == "negotiated"
    assert deal["unit_price_cents"] == 2200
    assert deal["total_cents"] == 220000
    assert deal["deposit_cents"] == 66000
    assert deal["balance_cents"] == 154000


def test_no_overlap_is_no_deal(client: TestClient) -> None:
    deal = client.post("/api/deals", json={**DEAL, "seller_min_cents": 3000}).json()

    assert deal["status"] == "no_deal"
    assert deal["unit_price_cents"] is None


def test_both_people_must_approve(client: TestClient) -> None:
    deal = client.post("/api/deals", json=DEAL).json()

    one = client.post(f"/api/deals/{deal['id']}/approve", json={"party": "buyer"}).json()

    assert one["status"] == "negotiated"
    assert client.post(f"/api/deals/{deal['id']}/payments/deposit").status_code == 409


def test_full_flow_with_refund(client: TestClient, paypal: FakePayPal) -> None:
    deal = to_balance_paid(client)
    assert deal["status"] == "balance_paid"
    assert paypal.orders == ["660.00", "1540.00"]
    assert paypal.tracking == ["TRACK123"]

    inspected = client.post(
        f"/api/deals/{deal['id']}/inspection",
        data={"received_quantity": 92, "notes": "8 sarees missing"},
    ).json()
    assert inspected["status"] == "refund_suggested"
    assert inspected["refund_suggested_cents"] == 17600
    assert paypal.refunds == []

    refunded = client.post(f"/api/deals/{deal['id']}/claim/approve").json()
    assert refunded["status"] == "refunded"
    assert paypal.refunds == [("CAPTURE-ORDER2", "176.00")]


def test_matching_goods_close_without_refund(client: TestClient) -> None:
    deal = to_balance_paid(client)

    closed = client.post(
        f"/api/deals/{deal['id']}/inspection",
        data={"received_quantity": 100},
    ).json()

    assert closed["status"] == "closed"


def test_refund_cannot_be_sent_twice(client: TestClient, paypal: FakePayPal) -> None:
    deal = to_balance_paid(client)
    client.post(f"/api/deals/{deal['id']}/inspection", data={"received_quantity": 92})

    client.post(f"/api/deals/{deal['id']}/claim/approve")
    second = client.post(f"/api/deals/{deal['id']}/claim/approve")

    assert second.status_code == 409
    assert len(paypal.refunds) == 1


def test_failed_refund_can_be_retried(client: TestClient, paypal: FakePayPal) -> None:
    deal = to_balance_paid(client)
    client.post(f"/api/deals/{deal['id']}/inspection", data={"received_quantity": 92})

    paypal.fail_refund = True
    assert client.post(f"/api/deals/{deal['id']}/claim/approve").status_code == 502

    paypal.fail_refund = False
    assert client.post(f"/api/deals/{deal['id']}/claim/approve").json()["status"] == "refunded"


def test_short_shipment_needs_buyer_review(client: TestClient) -> None:
    deal = create_approved(client)
    pay(client, deal["id"], "deposit")

    shipped = ship(client, deal["id"], quantity=90)

    assert shipped["status"] == "proof_review"
    assert client.post(f"/api/deals/{deal['id']}/payments/balance").status_code == 409
    accepted = client.post(f"/api/deals/{deal['id']}/shipment/accept").json()
    assert accepted["status"] == "shipment_verified"


def test_rejected_refund_sends_no_money(client: TestClient, paypal: FakePayPal) -> None:
    deal = to_balance_paid(client)
    client.post(f"/api/deals/{deal['id']}/inspection", data={"received_quantity": 92})

    rejected = client.post(f"/api/deals/{deal['id']}/claim/reject").json()

    assert rejected["status"] == "claim_rejected"
    assert paypal.refunds == []


def test_bad_upload_type_is_rejected(client: TestClient) -> None:
    deal = create_approved(client)
    pay(client, deal["id"], "deposit")

    response = client.post(
        f"/api/deals/{deal['id']}/shipment",
        data={"carrier": "DHL", "tracking_number": "TRACK123", "shipped_quantity": 100},
        files={"files": ("run.exe", b"bad", "application/octet-stream")},
    )

    assert response.status_code == 415


def test_webhook_rejects_invalid_signature(client: TestClient) -> None:
    response = client.post(
        "/api/webhooks/paypal",
        json={"event_type": "PAYMENT.CAPTURE.COMPLETED", "resource": {}},
    )

    assert response.status_code == 400


def test_webhook_completes_pending_payment(
    client: TestClient,
    paypal: FakePayPal,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    deal = create_approved(client)
    monkeypatch.setattr(
        paypal,
        "capture_order",
        lambda order_id: CapturedPayment(order_id, "CAP1", "PENDING", "OTHER"),
    )
    pending = pay(client, deal["id"], "deposit")
    assert pending["status"] == "approved"

    client.post(
        "/api/webhooks/paypal",
        headers={"x-test-valid": "yes"},
        json={"event_type": "PAYMENT.CAPTURE.COMPLETED", "resource": {"id": "CAP1"}},
    )

    assert client.get(f"/api/deals/{deal['id']}").json()["status"] == "deposit_paid"
