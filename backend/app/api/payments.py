import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import Deal, Payment
from app.schemas.deal import DealOut, PaymentLink
from app.services.deal_flow import capture_payment, load_deal, require_status
from app.services.paypal import PayPalClient, PayPalError, get_paypal

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/deals/{deal_id}/payments", tags=["payments"])

REQUIRED_STATUS = {"deposit": "approved", "balance": "shipment_verified"}


def check_kind(kind: str) -> str:
    if kind not in REQUIRED_STATUS:
        raise HTTPException(404, "Unknown payment type.")
    return kind


@router.post("/{kind}", response_model=PaymentLink)
def start_payment(
    kind: str = Depends(check_kind),
    deal: Deal = Depends(load_deal),
    db: Session = Depends(get_db),
    paypal: PayPalClient = Depends(get_paypal),
) -> PaymentLink:
    require_status(deal, REQUIRED_STATUS[kind])
    existing = deal.payment(kind)
    if existing is not None:
        return PaymentLink(approval_url=existing.approval_url)

    amount = deal.deposit_cents if kind == "deposit" else deal.balance_cents
    page = f"{settings.frontend_url}/deals/{deal.id}"
    try:
        order = paypal.create_order(
            amount=f"{amount / 100:.2f}",
            description=f"TrustCargo deal {deal.id} {kind}",
            return_url=f"{page}?paypal=return&kind={kind}",
            cancel_url=f"{page}?paypal=cancel",
        )
    except PayPalError as error:
        logger.error("PayPal order failed: %s", error)
        raise HTTPException(502, "PayPal couldn't create this payment.") from error

    db.add(
        Payment(
            deal=deal,
            kind=kind,
            amount_cents=amount,
            order_id=order.id,
            approval_url=order.approval_url,
            status=order.status,
        )
    )
    db.commit()
    return PaymentLink(approval_url=order.approval_url)


@router.post("/{kind}/capture", response_model=DealOut)
def capture(
    kind: str = Depends(check_kind),
    deal: Deal = Depends(load_deal),
    db: Session = Depends(get_db),
    paypal: PayPalClient = Depends(get_paypal),
) -> Deal:
    payment = deal.payment(kind)
    if payment is None:
        raise HTTPException(404, "Start this payment first.")

    try:
        capture_payment(deal, payment, paypal)
    except PayPalError as error:
        logger.error("PayPal capture failed: %s", error)
        raise HTTPException(502, "PayPal couldn't complete this payment.") from error

    db.commit()
    return deal
