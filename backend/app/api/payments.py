import logging
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import Deal, Payment
from app.schemas.deal import DealOut, PaymentLink
from app.models import User
from app.services.access import load_deal, require_role
from app.services.auth import current_user
from app.services.deal_flow import capture_payment, log_activity, require_status
from app.services.views import view
from app.services.paypal import PayPalClient, PayPalError, get_paypal

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/deals/{deal_id}/payments", tags=["payments"])

REQUIRED_STATUS = {"deposit": "approved", "balance": "shipment_verified"}
OPEN_ORDER_STATUSES = {"CREATED", "SAVED", "APPROVED", "PAYER_ACTION_REQUIRED"}


def check_kind(kind: str) -> str:
    if kind not in REQUIRED_STATUS:
        raise HTTPException(404, "Unknown payment type.")
    return kind


def order_is_open(payment: Payment, paypal: PayPalClient) -> bool:
    """Check whether an earlier PayPal order can still be approved."""
    try:
        status = paypal.get_order(payment.order_id).get("status")
    except PayPalError:
        return False
    payment.status = status or payment.status
    return status in OPEN_ORDER_STATUSES


@router.post("/{kind}", response_model=PaymentLink)
def start_payment(
    kind: str = Depends(check_kind),
    deal: Deal = Depends(load_deal),
    db: Session = Depends(get_db),
    paypal: PayPalClient = Depends(get_paypal),
    user: User = Depends(current_user),
) -> PaymentLink:
    require_role(deal, user, "buyer")
    require_status(deal, REQUIRED_STATUS[kind])
    existing = deal.payment(kind)
    if existing is not None and existing.status == "COMPLETED":
        raise HTTPException(409, "This payment is already complete.")
    if existing is not None and order_is_open(existing, paypal):
        db.commit()
        return PaymentLink(approval_url=existing.approval_url)

    amount = deal.deposit_cents if kind == "deposit" else deal.balance_cents
    page = f"{settings.frontend_url}/deals/{deal.id}"
    try:
        order = paypal.create_order(
            amount=f"{amount / 100:.2f}",
            description=f"TrustCargo {deal.reference} {kind}: {deal.quantity} x {deal.product}",
            return_url=f"{page}?paypal=return&kind={kind}",
            cancel_url=f"{page}?paypal=cancel",
            custom_id=deal.reference,
            invoice_id=f"{deal.reference}-{kind.upper()}-{uuid4().hex[:6].upper()}",
        )
    except PayPalError as error:
        logger.error("PayPal order failed: %s", error)
        raise HTTPException(502, "PayPal couldn't create this payment.") from error

    if existing is None:
        existing = Payment(deal=deal, kind=kind, amount_cents=amount)
        db.add(existing)
    existing.amount_cents = amount
    existing.order_id = order.id
    existing.approval_url = order.approval_url
    existing.status = order.status
    existing.capture_id = None
    log_activity(deal, "buyer", f"Started the ${amount / 100:.2f} {kind} payment on PayPal.")
    db.commit()
    return PaymentLink(approval_url=order.approval_url)


@router.post("/{kind}/capture", response_model=DealOut)
def capture(
    kind: str = Depends(check_kind),
    deal: Deal = Depends(load_deal),
    db: Session = Depends(get_db),
    paypal: PayPalClient = Depends(get_paypal),
    user: User = Depends(current_user),
) -> DealOut:
    require_role(deal, user, "buyer")
    payment = deal.payment(kind)
    if payment is None:
        raise HTTPException(404, "Start this payment first.")

    try:
        capture_payment(deal, payment, paypal)
    except PayPalError as error:
        logger.error("PayPal capture failed: %s", error)
        raise HTTPException(502, "PayPal couldn't complete this payment.") from error

    db.commit()
    return view(deal, user)
