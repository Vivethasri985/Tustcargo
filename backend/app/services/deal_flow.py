"""Shared deal state changes."""

from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Deal, Evidence, Payment
from app.services.paypal import PayPalClient
from app.services.storage import save_upload


def load_deal(deal_id: int, db: Session = Depends(get_db)) -> Deal:
    deal = db.get(Deal, deal_id)
    if deal is None:
        raise HTTPException(404, "Deal not found.")
    return deal


def require_status(deal: Deal, *allowed: str) -> None:
    if deal.status not in allowed:
        raise HTTPException(409, f"This action isn't available while the deal is {deal.status}.")


def complete_payment(deal: Deal, payment: Payment) -> None:
    payment.status = "COMPLETED"
    if payment.kind == "deposit" and deal.status == "approved":
        deal.status = "deposit_paid"
    elif payment.kind == "balance" and deal.status == "shipment_verified":
        deal.status = "balance_paid"


def capture_payment(deal: Deal, payment: Payment, paypal: PayPalClient) -> None:
    if payment.status == "COMPLETED":
        return

    captured = paypal.capture_order(payment.order_id)
    payment.capture_id = captured.capture_id
    payment.status = captured.status
    if captured.status == "COMPLETED":
        complete_payment(deal, payment)


async def add_evidence(db: Session, deal: Deal, stage: str, files: list) -> list[Evidence]:
    saved = []
    for file in files:
        stored_name, content_type = await save_upload(file)
        item = Evidence(
            deal=deal,
            stage=stage,
            original_name=(file.filename or "upload")[:255],
            stored_name=stored_name,
            content_type=content_type,
        )
        db.add(item)
        saved.append(item)
    return saved
