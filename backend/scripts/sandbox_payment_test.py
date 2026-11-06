"""Test a USD payment and partial refund in the PayPal sandbox.

Run from the backend folder:
    python -m scripts.sandbox_payment_test
    python -m scripts.sandbox_payment_test 10 2
"""

import sys
from decimal import Decimal, InvalidOperation

from app.config import settings
from app.services.paypal import PayPalClient, PayPalError

DEFAULT_PAYMENT = "1540.00"
DEFAULT_REFUND = "176.00"
PAGE_AFTER_PAYPAL = f"{settings.frontend_url}/dashboard"


def read_amounts(args: list[str]) -> tuple[str, str] | None:
    try:
        payment = Decimal(args[0] if args else DEFAULT_PAYMENT)
        refund = Decimal(args[1] if len(args) > 1 else min(Decimal(DEFAULT_REFUND), payment / 2))
    except InvalidOperation:
        return None

    if payment <= 0 or refund <= 0 or refund > payment:
        return None
    return f"{payment:.2f}", f"{refund:.2f}"


def main() -> int:
    amounts = read_amounts(sys.argv[1:])
    if amounts is None:
        print("Use: python -m scripts.sandbox_payment_test PAYMENT REFUND")
        print("Both must be above 0, and the refund can't exceed the payment.")
        return 1
    payment_amount, refund_amount = amounts

    if "sandbox" not in settings.paypal_base_url:
        print("Stopped: this test only runs against the PayPal sandbox.")
        return 1

    paypal = PayPalClient()

    try:
        order = paypal.create_order(
            amount=payment_amount,
            description="TrustCargo sandbox balance payment",
            return_url=PAGE_AFTER_PAYPAL,
            cancel_url=PAGE_AFTER_PAYPAL,
        )
        print(f"\nOrder created: {order.id}")
        print(f"\nPayment: ${payment_amount}. Refund after capture: ${refund_amount}.")
        print("\nOpen this link and log in with the South Africa sandbox buyer:")
        print(order.approval_url)
        input("\nApprove the payment on PayPal until it returns to TrustCargo, then press Enter...")

        payment = paypal.capture_order(order.id)
        print(f"\nPayment status: {payment.status}")
        print(f"Capture ID: {payment.capture_id}")

        if payment.status != "COMPLETED":
            print(f"Payment is not complete. Reason: {payment.pending_reason}")
            print("Refund skipped. Paste this output into the chat.")
            return 1

        refund = paypal.refund_capture(payment.capture_id, refund_amount)
        print(f"\nRefund status: {refund.status}")
        print(f"Refund ID: {refund.id}")

        if refund.status != "COMPLETED":
            print("Refund is not complete yet. Paste this output into the chat.")
            return 1
    except PayPalError as error:
        print(f"\nTest failed: {error}")
        return 1

    print(f"\nPASS: ${payment_amount} paid and ${refund_amount} refunded.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
