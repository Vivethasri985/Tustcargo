import re

import pytest
from fastapi.testclient import TestClient

from app.services.paypal import CapturedPayment
from tests.conftest import FakePayPal

PDF = {"files": ("receipt.pdf", b"%PDF-1.4", "application/pdf")}
SELLER_OFFER = {
    "role": "seller",
    "product": "Silk sarees",
    "quantity": 100,
    "counterparty_email": "buyer@cape.test",
    "limit_cents": 2000,
    "days": 18,
}
BUYER_REPLY = {"limit_cents": 2500, "days": 21}


def open_deal(seller: TestClient, buyer: TestClient, reply: dict = BUYER_REPLY) -> dict:
    deal = seller.post("/api/deals", json=SELLER_OFFER).json()
    return buyer.post(f"/api/deals/{deal['id']}/accept", json=reply).json()


def create_approved(seller: TestClient, buyer: TestClient) -> dict:
    deal = open_deal(seller, buyer)
    buyer.post(f"/api/deals/{deal['id']}/approve")
    return seller.post(f"/api/deals/{deal['id']}/approve").json()


def pay(buyer: TestClient, deal_id: int, kind: str) -> dict:
    assert buyer.post(f"/api/deals/{deal_id}/payments/{kind}").status_code == 200
    return buyer.post(f"/api/deals/{deal_id}/payments/{kind}/capture").json()


def ship(seller: TestClient, deal_id: int, quantity: int = 100) -> dict:
    return seller.post(
        f"/api/deals/{deal_id}/shipment",
        data={"carrier": "DHL", "tracking_number": "1234567890", "shipped_quantity": quantity},
        files=PDF,
    ).json()


def deliver(seller: TestClient, deal_id: int) -> dict:
    deal = seller.get(f"/api/deals/{deal_id}").json()
    while not deal["delivered"]:
        deal = seller.post(f"/api/deals/{deal_id}/tracking/updates", json={"kind": "milestone"}).json()
    return deal


def to_balance_paid(seller: TestClient, buyer: TestClient) -> dict:
    deal = create_approved(seller, buyer)
    pay(buyer, deal["id"], "deposit")
    ship(seller, deal["id"])
    pay(buyer, deal["id"], "balance")
    return deliver(seller, deal["id"])


def kinds(deal: dict) -> list[str]:
    return [item["kind"] for item in deal["documents"]]


# Invitations and privacy


def test_invite_then_accept_runs_negotiation(seller: TestClient, buyer: TestClient) -> None:
    invited = seller.post("/api/deals", json=SELLER_OFFER).json()
    assert invited["status"] == "invited"
    assert invited["viewer_role"] == "seller"
    assert invited["next_actor"] == "buyer"

    seen = buyer.get("/api/deals").json()
    assert [deal["viewer_role"] for deal in seen] == ["invitee"]
    assert seen[0]["seller_min_cents"] is None
    assert seen[0]["seller_lead_days"] is None

    deal = buyer.post(f"/api/deals/{invited['id']}/accept", json=BUYER_REPLY).json()
    assert deal["status"] == "negotiated"
    assert deal["viewer_role"] == "buyer"
    assert deal["buyer_name"] == "Cape Retail"
    assert deal["unit_price_cents"] == 2200
    assert deal["deposit_cents"] == 66000


def test_each_side_sees_only_its_own_limit(seller: TestClient, buyer: TestClient) -> None:
    deal = open_deal(seller, buyer)

    as_buyer = buyer.get(f"/api/deals/{deal['id']}").json()
    as_seller = seller.get(f"/api/deals/{deal['id']}").json()

    assert as_buyer["buyer_max_cents"] == 2500
    assert as_buyer["seller_min_cents"] is None
    assert as_seller["seller_min_cents"] == 2000
    assert as_seller["buyer_max_cents"] is None


def test_strangers_cannot_see_or_act(seller: TestClient, buyer: TestClient, stranger: TestClient) -> None:
    deal = open_deal(seller, buyer)

    assert stranger.get(f"/api/deals/{deal['id']}").status_code == 404
    assert stranger.post(f"/api/deals/{deal['id']}/approve").status_code == 404
    assert stranger.get("/api/deals").json() == []


def test_only_the_invited_email_can_accept(seller: TestClient, stranger: TestClient) -> None:
    deal = seller.post("/api/deals", json=SELLER_OFFER).json()

    assert stranger.post(f"/api/deals/{deal['id']}/accept", json=BUYER_REPLY).status_code == 404
    assert seller.post(f"/api/deals/{deal['id']}/accept", json=BUYER_REPLY).status_code == 403


def test_buyer_can_start_a_deal(seller: TestClient, buyer: TestClient) -> None:
    request = {
        "role": "buyer",
        "product": "Silk sarees",
        "quantity": 100,
        "counterparty_email": "seller@silk.test",
        "limit_cents": 2500,
        "days": 21,
    }
    deal = buyer.post("/api/deals", json=request).json()
    assert deal["next_actor"] == "seller"

    accepted = seller.post(f"/api/deals/{deal['id']}/accept", json={"limit_cents": 2000, "days": 18}).json()

    assert accepted["viewer_role"] == "seller"
    assert accepted["status"] == "negotiated"


def test_decline_and_cancel(seller: TestClient, buyer: TestClient) -> None:
    first = seller.post("/api/deals", json=SELLER_OFFER).json()
    declined = buyer.post(f"/api/deals/{first['id']}/decline").json()
    assert declined["status"] == "declined"
    assert declined["seller_min_cents"] is None and declined["seller_lead_days"] is None
    assert seller.get(f"/api/deals/{first['id']}").json()["status"] == "declined"
    assert buyer.get(f"/api/deals/{first['id']}").status_code == 404

    second = seller.post("/api/deals", json=SELLER_OFFER).json()
    assert buyer.delete(f"/api/deals/{second['id']}").status_code == 403
    assert seller.delete(f"/api/deals/{second['id']}").status_code == 204


def test_cannot_invite_yourself(seller: TestClient) -> None:
    response = seller.post("/api/deals", json={**SELLER_OFFER, "counterparty_email": "SELLER@silk.test"})

    assert response.status_code == 422


def test_invite_email_status_is_recorded(seller: TestClient) -> None:
    deal = seller.post("/api/deals", json=SELLER_OFFER).json()

    assert seller.get(f"/api/deals/{deal['id']}").json()["invite_email_status"] == "not_configured"


def test_saved_trade_partners(seller: TestClient, buyer: TestClient) -> None:
    open_deal(seller, buyer)
    seller.post("/api/deals", json={**SELLER_OFFER, "counterparty_email": "new@partner.test"})

    partners = seller.get("/api/partners").json()

    assert [partner["email"] for partner in partners] == ["new@partner.test", "buyer@cape.test"]
    assert partners[1]["name"] == "Cape Retail"
    assert partners[1]["last_product"] == "Silk sarees"


def test_no_overlap_is_no_deal(seller: TestClient, buyer: TestClient) -> None:
    deal = open_deal(seller, buyer, {"limit_cents": 1500, "days": 21})

    assert deal["status"] == "no_deal"
    assert deal["unit_price_cents"] is None
    assert deal["documents"] == []


# Roles at each step


def test_each_person_approves_for_themselves(seller: TestClient, buyer: TestClient) -> None:
    deal = open_deal(seller, buyer)

    after_buyer = buyer.post(f"/api/deals/{deal['id']}/approve").json()
    assert after_buyer["buyer_approved"] and not after_buyer["seller_approved"]
    assert after_buyer["next_actor"] == "seller"
    assert buyer.post(f"/api/deals/{deal['id']}/payments/deposit").status_code == 409

    after_seller = seller.post(f"/api/deals/{deal['id']}/approve").json()
    assert after_seller["status"] == "approved"


@pytest.mark.parametrize(
    ("who", "path", "kwargs"),
    [
        ("seller", "/payments/deposit", {}),
        ("buyer", "/shipment", {"data": {"carrier": "DHL", "tracking_number": "1234567890", "shipped_quantity": 100}, "files": PDF}),
    ],
)
def test_wrong_role_is_refused(seller: TestClient, buyer: TestClient, who, path, kwargs) -> None:
    deal = create_approved(seller, buyer)
    if path == "/shipment":
        pay(buyer, deal["id"], "deposit")
    client = seller if who == "seller" else buyer

    response = client.post(f"/api/deals/{deal['id']}{path}", **kwargs)

    assert response.status_code == 403


def test_only_seller_updates_tracking_and_decides_refunds(seller: TestClient, buyer: TestClient) -> None:
    deal = create_approved(seller, buyer)
    pay(buyer, deal["id"], "deposit")
    ship(seller, deal["id"])
    assert buyer.post(f"/api/deals/{deal['id']}/tracking/updates", json={"kind": "milestone"}).status_code == 403

    pay(buyer, deal["id"], "balance")
    deliver(seller, deal["id"])
    assert seller.post(f"/api/deals/{deal['id']}/inspection", data={"received_quantity": 92}).status_code == 403
    buyer.post(f"/api/deals/{deal['id']}/inspection", data={"received_quantity": 92})

    assert buyer.post(f"/api/deals/{deal['id']}/claim/approve").status_code == 403
    assert seller.post(f"/api/deals/{deal['id']}/claim/approve").json()["status"] == "refunded"


def test_full_flow_with_refund(seller: TestClient, buyer: TestClient, paypal: FakePayPal) -> None:
    deal = to_balance_paid(seller, buyer)
    assert deal["status"] == "balance_paid"
    assert deal["next_actor"] == "buyer"
    assert paypal.orders == ["660.00", "1540.00"]
    assert paypal.tracking == ["1234567890"]

    inspected = buyer.post(
        f"/api/deals/{deal['id']}/inspection",
        data={"received_quantity": 92, "notes": "8 sarees missing"},
    ).json()
    assert inspected["status"] == "refund_suggested"
    assert inspected["refund_suggested_cents"] == 17600
    assert paypal.refunds == []

    refunded = seller.post(f"/api/deals/{deal['id']}/claim/approve").json()
    assert refunded["status"] == "refunded"
    assert paypal.refunds == [("CAPTURE-ORDER2", "176.00")]


def test_matching_goods_close_without_refund(seller: TestClient, buyer: TestClient) -> None:
    deal = to_balance_paid(seller, buyer)

    closed = buyer.post(f"/api/deals/{deal['id']}/inspection", data={"received_quantity": 100}).json()

    assert closed["status"] == "closed"
    assert closed["next_actor"] is None


def test_refund_cannot_be_sent_twice(seller: TestClient, buyer: TestClient, paypal: FakePayPal) -> None:
    deal = to_balance_paid(seller, buyer)
    buyer.post(f"/api/deals/{deal['id']}/inspection", data={"received_quantity": 92})

    seller.post(f"/api/deals/{deal['id']}/claim/approve")
    second = seller.post(f"/api/deals/{deal['id']}/claim/approve")

    assert second.status_code == 409
    assert len(paypal.refunds) == 1


def test_failed_refund_can_be_retried(seller: TestClient, buyer: TestClient, paypal: FakePayPal) -> None:
    deal = to_balance_paid(seller, buyer)
    buyer.post(f"/api/deals/{deal['id']}/inspection", data={"received_quantity": 92})

    paypal.fail_refund = True
    assert seller.post(f"/api/deals/{deal['id']}/claim/approve").status_code == 502

    paypal.fail_refund = False
    assert seller.post(f"/api/deals/{deal['id']}/claim/approve").json()["status"] == "refunded"


def test_short_shipment_needs_buyer_review(seller: TestClient, buyer: TestClient) -> None:
    deal = create_approved(seller, buyer)
    pay(buyer, deal["id"], "deposit")

    shipped = ship(seller, deal["id"], quantity=90)

    assert shipped["status"] == "proof_review"
    assert buyer.post(f"/api/deals/{deal['id']}/payments/balance").status_code == 409
    assert seller.post(f"/api/deals/{deal['id']}/shipment/accept").status_code == 403
    accepted = buyer.post(f"/api/deals/{deal['id']}/shipment/accept").json()
    assert accepted["status"] == "shipment_verified"


def test_rejected_refund_sends_no_money(seller: TestClient, buyer: TestClient, paypal: FakePayPal) -> None:
    deal = to_balance_paid(seller, buyer)
    buyer.post(f"/api/deals/{deal['id']}/inspection", data={"received_quantity": 92})

    rejected = seller.post(f"/api/deals/{deal['id']}/claim/reject").json()

    assert rejected["status"] == "claim_rejected"
    assert paypal.refunds == []


# Payments and webhooks


def test_webhook_rejects_invalid_signature(seller: TestClient) -> None:
    response = seller.post("/api/webhooks/paypal", json={"event_type": "PAYMENT.CAPTURE.COMPLETED", "resource": {}})

    assert response.status_code == 400


def test_webhook_completes_pending_payment(
    seller: TestClient, buyer: TestClient, paypal: FakePayPal, monkeypatch: pytest.MonkeyPatch
) -> None:
    deal = create_approved(seller, buyer)
    monkeypatch.setattr(
        paypal,
        "capture_order",
        lambda order_id: CapturedPayment(order_id, "CAP1", "PENDING", "OTHER"),
    )
    assert pay(buyer, deal["id"], "deposit")["status"] == "approved"

    seller.post(
        "/api/webhooks/paypal",
        headers={"x-test-valid": "yes"},
        json={"event_type": "PAYMENT.CAPTURE.COMPLETED", "resource": {"id": "CAP1"}},
    )

    assert buyer.get(f"/api/deals/{deal['id']}").json()["status"] == "deposit_paid"


def test_deal_has_reference_and_paypal_ids(seller: TestClient, buyer: TestClient, paypal: FakePayPal) -> None:
    deal = create_approved(seller, buyer)
    pay(buyer, deal["id"], "deposit")

    assert re.fullmatch(r"TC-[A-Z2-9]{8}", deal["reference"])
    assert paypal.order_ids[0]["custom_id"] == deal["reference"]
    assert paypal.order_ids[0]["invoice_id"].startswith(f"{deal['reference']}-DEPOSIT-")


def test_expired_order_is_replaced(seller: TestClient, buyer: TestClient, paypal: FakePayPal) -> None:
    deal = create_approved(seller, buyer)
    first = buyer.post(f"/api/deals/{deal['id']}/payments/deposit").json()
    paypal.expired.add("ORDER1")

    second = buyer.post(f"/api/deals/{deal['id']}/payments/deposit").json()

    assert first["approval_url"].endswith("ORDER1")
    assert second["approval_url"].endswith("ORDER2")


def test_open_order_is_reused(seller: TestClient, buyer: TestClient, paypal: FakePayPal) -> None:
    deal = create_approved(seller, buyer)

    buyer.post(f"/api/deals/{deal['id']}/payments/deposit")
    buyer.post(f"/api/deals/{deal['id']}/payments/deposit")

    assert len(paypal.orders) == 1


# Shipping, tracking and evidence


def test_inspection_waits_for_delivery(seller: TestClient, buyer: TestClient) -> None:
    deal = create_approved(seller, buyer)
    pay(buyer, deal["id"], "deposit")
    shipped = ship(seller, deal["id"])
    assert len(shipped["events"]) == 1
    pay(buyer, deal["id"], "balance")

    early = buyer.post(f"/api/deals/{deal['id']}/inspection", data={"received_quantity": 100})

    assert early.status_code == 409


def test_watcher_reports_a_late_shipment(seller: TestClient, buyer: TestClient) -> None:
    deal = create_approved(seller, buyer)
    pay(buyer, deal["id"], "deposit")
    ship(seller, deal["id"])

    delayed = seller.post(
        f"/api/deals/{deal['id']}/tracking/updates",
        json={"kind": "delay", "delay_days": 4, "note": "Customs inspection"},
    ).json()

    assert delayed["delay_days"] == 4
    assert delayed["watcher"]["level"] == "late"
    assert delayed["events"][-1]["kind"] == "delay"


def test_tracking_stops_after_delivery(seller: TestClient, buyer: TestClient) -> None:
    deal = to_balance_paid(seller, buyer)

    response = seller.post(f"/api/deals/{deal['id']}/tracking/updates", json={"kind": "milestone"})

    assert response.status_code == 409


def test_delay_limits(seller: TestClient, buyer: TestClient) -> None:
    deal = create_approved(seller, buyer)
    pay(buyer, deal["id"], "deposit")
    ship(seller, deal["id"])
    url = f"/api/deals/{deal['id']}/tracking/updates"

    too_long = seller.post(url, json={"kind": "delay", "delay_days": 15})
    zero = seller.post(url, json={"kind": "delay", "delay_days": 0})
    for _ in range(4):
        seller.post(url, json={"kind": "delay", "delay_days": 14})
    over_total = seller.post(url, json={"kind": "delay", "delay_days": 14})

    assert too_long.status_code == 422
    assert zero.status_code == 422
    assert over_total.status_code == 409


@pytest.mark.parametrize(
    ("carrier", "number", "status"),
    [
        ("DHL", "TRACK123", 422),
        ("DHL", "12345 67890", 200),
        ("UPS", "1Z999AA10123456784", 200),
        ("FEDEX", "1234", 422),
        ("Blue Dart", "BD12345678", 200),
    ],
)
def test_tracking_numbers_are_checked(seller: TestClient, buyer: TestClient, carrier, number, status) -> None:
    deal = create_approved(seller, buyer)
    pay(buyer, deal["id"], "deposit")

    response = seller.post(
        f"/api/deals/{deal['id']}/shipment",
        data={"carrier": carrier, "tracking_number": number, "shipped_quantity": 100},
        files=PDF,
    )

    assert response.status_code == status


def test_upload_rules(seller: TestClient, buyer: TestClient) -> None:
    deal = create_approved(seller, buyer)
    pay(buyer, deal["id"], "deposit")
    url = f"/api/deals/{deal['id']}/shipment"
    form = {"carrier": "DHL", "tracking_number": "1234567890", "shipped_quantity": 100}

    wrong_type = seller.post(url, data=form, files={"files": ("run.exe", b"bad", "application/octet-stream")})
    fake_png = seller.post(url, data=form, files={"files": ("photo.png", b"%PDF-1.4", "image/png")})

    assert wrong_type.status_code == 415
    assert fake_png.status_code == 415


def test_evidence_is_private_to_the_deal(seller: TestClient, buyer: TestClient, stranger: TestClient) -> None:
    deal = create_approved(seller, buyer)
    pay(buyer, deal["id"], "deposit")
    item = ship(seller, deal["id"])["evidence"][0]

    for client in (seller, buyer):
        response = client.get(item["url"])
        assert response.status_code == 200
        assert response.content == b"%PDF-1.4"
        assert response.headers["x-content-type-options"] == "nosniff"
    assert stranger.get(item["url"]).status_code == 404


def test_activity_records_each_step(seller: TestClient, buyer: TestClient) -> None:
    deal = to_balance_paid(seller, buyer)
    buyer.post(f"/api/deals/{deal['id']}/inspection", data={"received_quantity": 92})
    done = seller.post(f"/api/deals/{deal['id']}/claim/approve").json()

    actors = {entry["actor"] for entry in done["activity"]}
    messages = " ".join(entry["message"] for entry in done["activity"])
    assert {"buyer", "seller", "paypal", "ai", "carrier"} <= actors
    assert "Approved the $176.00 refund." in messages


# Documents


def test_documents_follow_the_deal(seller: TestClient, buyer: TestClient, stranger: TestClient) -> None:
    invited = seller.post("/api/deals", json={**SELLER_OFFER, "counterparty_email": "other@cape.test"}).json()
    assert invited["documents"] == []

    negotiated = open_deal(seller, buyer)
    assert kinds(negotiated) == ["agreement"]
    assert negotiated["documents"][0]["title"] == "Draft agreement"

    deal = to_balance_paid(seller, buyer)
    assert [item["title"] for item in deal["documents"]] == ["Trade agreement", "Deposit receipt", "Balance receipt"]

    buyer.post(f"/api/deals/{deal['id']}/inspection", data={"received_quantity": 92})
    done = seller.post(f"/api/deals/{deal['id']}/claim/approve").json()
    assert kinds(done) == ["agreement", "deposit", "balance", "refund", "statement"]

    for item in done["documents"]:
        for client in (seller, buyer):
            response = client.get(item["url"])
            assert response.status_code == 200
            assert response.content.startswith(b"%PDF")
        assert stranger.get(item["url"]).status_code == 404


def test_closed_deal_statement(seller: TestClient, buyer: TestClient) -> None:
    deal = to_balance_paid(seller, buyer)
    closed = buyer.post(f"/api/deals/{deal['id']}/inspection", data={"received_quantity": 100}).json()

    assert "statement" in kinds(closed)
    assert "refund" not in kinds(closed)
