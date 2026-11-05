import json

import httpx
import pytest

from app.config import settings
from app.services.paypal import PayPalClient, PayPalError


def make_client(routes: dict[str, httpx.Response]) -> tuple[PayPalClient, list]:
    calls: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        if request.url.path == "/v1/oauth2/token":
            return httpx.Response(200, json={"access_token": "token"})
        return routes[request.url.path]

    client = httpx.Client(
        base_url="https://paypal.test",
        transport=httpx.MockTransport(handler),
    )
    return PayPalClient(client), calls


@pytest.fixture(autouse=True)
def credentials(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "paypal_client_id", "id")
    monkeypatch.setattr(settings, "paypal_client_secret", "secret")


def test_create_order_returns_approval_url() -> None:
    client, calls = make_client(
        {
            "/v2/checkout/orders": httpx.Response(
                200,
                json={
                    "id": "ORDER1",
                    "status": "PAYER_ACTION_REQUIRED",
                    "links": [{"rel": "payer-action", "href": "https://pay.test"}],
                },
            )
        }
    )

    order = client.create_order("1540", "Balance", "https://a.test", "https://b.test")

    body = json.loads(calls[-1].content)
    assert order.approval_url == "https://pay.test"
    assert body["purchase_units"][0]["amount"]["value"] == "1540.00"


def test_capture_returns_capture_id() -> None:
    client, _ = make_client(
        {
            "/v2/checkout/orders/ORDER1/capture": httpx.Response(
                201,
                json={
                    "id": "ORDER1",
                    "purchase_units": [
                        {
                            "payments": {
                                "captures": [
                                    {
                                        "id": "CAPTURE1",
                                        "status": "PENDING",
                                        "status_details": {"reason": "OTHER"},
                                    }
                                ]
                            }
                        }
                    ],
                },
            )
        }
    )

    payment = client.capture_order("ORDER1")

    assert payment.capture_id == "CAPTURE1"
    assert payment.pending_reason == "OTHER"


def test_refund_sends_partial_amount() -> None:
    client, calls = make_client(
        {
            "/v2/payments/captures/CAPTURE1/refund": httpx.Response(
                201,
                json={"id": "REFUND1", "status": "COMPLETED"},
            )
        }
    )

    refund = client.refund_capture("CAPTURE1", "176")

    body = json.loads(calls[-1].content)
    assert refund.status == "COMPLETED"
    assert body["amount"] == {"currency_code": "USD", "value": "176.00"}


def test_paypal_error_is_raised() -> None:
    client, _ = make_client(
        {
            "/v2/checkout/orders/ORDER1/capture": httpx.Response(
                422,
                headers={"paypal-debug-id": "debug1"},
                json={"name": "UNPROCESSABLE_ENTITY"},
            )
        }
    )

    with pytest.raises(PayPalError, match="debug1"):
        client.capture_order("ORDER1")
