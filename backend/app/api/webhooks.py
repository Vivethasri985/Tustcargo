import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Deal, Payment
from app.services.deal_flow import capture_payment, complete_payment
from app.services.paypal import PayPalClient, PayPalError, get_paypal

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/webhooks", tags=["webhooks"])


def order_id_from(resource: dict[str, Any]) -> str | None:
    related = resource.get("supplementary_data", {}).get("related_ids", {})
    return related.get("order_id")


@router.post("/paypal")
async def paypal_webhook(
    request: Request,
    db: Session = Depends(get_db),
    paypal: PayPalClient = Depends(get_paypal),
) -> dict[str, str]:
    event = await request.json()

    try:
        verified = paypal.verify_webhook(request.headers, event)
    except PayPalError as error:
        logger.error("PayPal webhook check failed: %s", error)
        raise HTTPException(502, "Webhook verification failed.") from error

    if not verified:
        raise HTTPException(400, "Invalid webhook signature.")

    event_type = event.get("event_type")
    resource = event.get("resource", {})

    if event_type == "CHECKOUT.ORDER.APPROVED":
        payment = db.scalar(select(Payment).where(Payment.order_id == resource.get("id")))
        if payment is not None:
            try:
                capture_payment(payment.deal, payment, paypal)
            except PayPalError as error:
                logger.error("Webhook capture failed: %s", error)
                raise HTTPException(502, "Capture failed.") from error

    elif event_type == "PAYMENT.CAPTURE.COMPLETED":
        payment = db.scalar(
            select(Payment).where(
                (Payment.capture_id == resource.get("id"))
                | (Payment.order_id == order_id_from(resource))
            )
        )
        if payment is not None:
            payment.capture_id = payment.capture_id or resource.get("id")
            complete_payment(payment.deal, payment)

    elif event_type == "PAYMENT.CAPTURE.REFUNDED":
        deal = db.scalar(select(Deal).where(Deal.refund_id == resource.get("id")))
        if deal is not None:
            deal.refund_status = resource.get("status", deal.refund_status)

    db.commit()
    return {"status": "received"}
