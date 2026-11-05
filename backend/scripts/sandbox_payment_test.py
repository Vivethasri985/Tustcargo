"""Test a USD payment and partial refund in the PayPal sandbox.

Run from the backend folder:
    python -m scripts.sandbox_payment_test
"""

from app.config import settings
from app.services.paypal import PayPalClient, PayPalError

PAYMENT_AMOUNT = "1540.00"
REFUND_AMOUNT = "176.00"
PAGE_AFTER_PAYPAL = f"{settings.frontend_url}/dashboard"


def main() -> int:
    if "sandbox" not in settings.paypal_base_url:
        print("Stopped: this test only runs against the PayPal sandbox.")
        return 1

    paypal = PayPalClient()

    try:
        order = paypal.create_order(
            amount=PAYMENT_AMOUNT,
            description="TrustCargo sandbox balance payment",
            return_url=PAGE_AFTER_PAYPAL,
            cancel_url=PAGE_AFTER_PAYPAL,
        )
        print(f"\nOrder created: {order.id}")
        print("\nOpen this link and log in with the South Africa sandbox buyer:")
        print(order.approval_url)
        input("\nAfter approving the payment, press Enter here...")

        payment = paypal.capture_order(order.id)
        print(f"\nPayment status: {payment.status}")
        print(f"Capture ID: {payment.capture_id}")

        if payment.status != "COMPLETED":
            print(f"Payment is not complete. Reason: {payment.pending_reason}")
            print("Refund skipped. Paste this output into the chat.")
            return 1

        refund = paypal.refund_capture(payment.capture_id, REFUND_AMOUNT)
        print(f"\nRefund status: {refund.status}")
        print(f"Refund ID: {refund.id}")

        if refund.status != "COMPLETED":
            print("Refund is not complete yet. Paste this output into the chat.")
            return 1
    except PayPalError as error:
        print(f"\nTest failed: {error}")
        return 1

    print(f"\nPASS: ${PAYMENT_AMOUNT} paid and ${REFUND_AMOUNT} refunded.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
