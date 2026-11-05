"""PayPal orders, captures and refunds."""

from collections.abc import Mapping
from dataclasses import dataclass
from decimal import Decimal
from typing import Any
from uuid import uuid4

import httpx

from app.config import settings

TIMEOUT_SECONDS = 30
KNOWN_CARRIERS = {"DHL", "FEDEX", "UPS"}


class PayPalError(Exception):
    """Raised when PayPal rejects a request."""


@dataclass(frozen=True)
class CreatedOrder:
    id: str
    status: str
    approval_url: str


@dataclass(frozen=True)
class CapturedPayment:
    order_id: str
    capture_id: str
    status: str
    pending_reason: str | None


@dataclass(frozen=True)
class Refund:
    id: str
    status: str


def _money(amount: Decimal | str) -> str:
    return f"{Decimal(str(amount)):.2f}"


class PayPalClient:
    def __init__(self, http_client: httpx.Client | None = None) -> None:
        self._client = http_client or httpx.Client(
            base_url=settings.paypal_base_url,
            timeout=TIMEOUT_SECONDS,
        )

    def _access_token(self) -> str:
        if not settings.paypal_client_id or not settings.paypal_client_secret:
            raise PayPalError(
                "Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET to backend/.env."
            )

        response = self._client.post(
            "/v1/oauth2/token",
            auth=(settings.paypal_client_id, settings.paypal_client_secret),
            data={"grant_type": "client_credentials"},
        )
        return self._json(response)["access_token"]

    def _post(
        self,
        path: str,
        body: dict[str, Any],
        request_id: str | None = None,
    ) -> dict[str, Any]:
        response = self._client.post(
            path,
            json=body,
            headers={
                "Authorization": f"Bearer {self._access_token()}",
                "PayPal-Request-Id": request_id or str(uuid4()),
                "Prefer": "return=representation",
            },
        )
        return self._json(response)

    @staticmethod
    def _json(response: httpx.Response) -> dict[str, Any]:
        if response.is_error:
            debug_id = response.headers.get("paypal-debug-id", "not provided")
            raise PayPalError(
                f"PayPal returned {response.status_code} "
                f"(debug ID {debug_id}): {response.text}"
            )
        return response.json()

    def create_order(
        self,
        amount: Decimal | str,
        description: str,
        return_url: str,
        cancel_url: str,
        currency: str = "USD",
    ) -> CreatedOrder:
        order = self._post(
            "/v2/checkout/orders",
            {
                "intent": "CAPTURE",
                "purchase_units": [
                    {
                        "description": description,
                        "amount": {
                            "currency_code": currency,
                            "value": _money(amount),
                        },
                    }
                ],
                "payment_source": {
                    "paypal": {
                        "experience_context": {
                            "return_url": return_url,
                            "cancel_url": cancel_url,
                            "shipping_preference": "NO_SHIPPING",
                            "user_action": "PAY_NOW",
                        }
                    }
                },
            },
        )
        links = {link["rel"]: link["href"] for link in order.get("links", [])}
        approval_url = links.get("payer-action") or links.get("approve")
        if not approval_url:
            raise PayPalError(f"PayPal order {order['id']} has no approval link.")

        return CreatedOrder(order["id"], order["status"], approval_url)

    def capture_order(self, order_id: str) -> CapturedPayment:
        order = self._post(
            f"/v2/checkout/orders/{order_id}/capture",
            {},
            request_id=f"capture-{order_id}",
        )
        capture = order["purchase_units"][0]["payments"]["captures"][0]

        return CapturedPayment(
            order_id=order["id"],
            capture_id=capture["id"],
            status=capture["status"],
            pending_reason=capture.get("status_details", {}).get("reason"),
        )

    def refund_capture(
        self,
        capture_id: str,
        amount: Decimal | str,
        currency: str = "USD",
        request_id: str | None = None,
    ) -> Refund:
        refund = self._post(
            f"/v2/payments/captures/{capture_id}/refund",
            {"amount": {"currency_code": currency, "value": _money(amount)}},
            request_id=request_id,
        )
        return Refund(refund["id"], refund["status"])

    def add_tracking(
        self,
        order_id: str,
        capture_id: str,
        tracking_number: str,
        carrier: str,
    ) -> None:
        body: dict[str, Any] = {
            "capture_id": capture_id,
            "tracking_number": tracking_number,
            "carrier": carrier if carrier in KNOWN_CARRIERS else "OTHER",
            "notify_payer": False,
        }
        if body["carrier"] == "OTHER":
            body["carrier_name_other"] = carrier
        self._post(f"/v2/checkout/orders/{order_id}/track", body)

    def verify_webhook(self, headers: Mapping[str, str], event: dict[str, Any]) -> bool:
        if not settings.paypal_webhook_id:
            return False

        result = self._post(
            "/v1/notifications/verify-webhook-signature",
            {
                "auth_algo": headers.get("paypal-auth-algo"),
                "cert_url": headers.get("paypal-cert-url"),
                "transmission_id": headers.get("paypal-transmission-id"),
                "transmission_sig": headers.get("paypal-transmission-sig"),
                "transmission_time": headers.get("paypal-transmission-time"),
                "webhook_id": settings.paypal_webhook_id,
                "webhook_event": event,
            },
        )
        return result.get("verification_status") == "SUCCESS"


def get_paypal() -> PayPalClient:
    return PayPalClient()
