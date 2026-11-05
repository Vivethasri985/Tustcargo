import logging
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.agents import verifier
from app.database import get_db
from app.models import Deal
from app.schemas.deal import DealOut
from app.services.deal_flow import add_evidence, load_deal, require_status
from app.services.paypal import PayPalClient, PayPalError, get_paypal
from app.services.storage import MAX_FILES

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/deals/{deal_id}/shipment", tags=["shipments"])


def mark_verified(deal: Deal, paypal: PayPalClient) -> None:
    deal.status = "shipment_verified"
    deposit = deal.payment("deposit")
    if deposit is None or deposit.capture_id is None or deal.tracking_added:
        return

    try:
        paypal.add_tracking(
            deposit.order_id,
            deposit.capture_id,
            deal.tracking_number or "",
            deal.carrier or "OTHER",
        )
        deal.tracking_added = True
    except PayPalError as error:
        logger.warning("PayPal tracking was not added: %s", error)


@router.post("", response_model=DealOut)
async def submit_proof(
    carrier: Annotated[str, Form(min_length=2, max_length=80)],
    tracking_number: Annotated[str, Form(min_length=3, max_length=120)],
    shipped_quantity: Annotated[int, Form(gt=0)],
    files: Annotated[list[UploadFile], File()],
    deal: Deal = Depends(load_deal),
    db: Session = Depends(get_db),
    paypal: PayPalClient = Depends(get_paypal),
) -> Deal:
    require_status(deal, "deposit_paid", "proof_review")
    if not 1 <= len(files) <= MAX_FILES:
        raise HTTPException(422, f"Upload between 1 and {MAX_FILES} files.")

    deal.carrier = carrier
    deal.tracking_number = tracking_number
    deal.shipped_quantity = shipped_quantity
    saved = await add_evidence(db, deal, "shipment", files)
    db.flush()

    deal.verification = verifier.verify(deal, saved)
    if deal.verification["matches"]:
        mark_verified(deal, paypal)
    else:
        deal.status = "proof_review"

    db.commit()
    return deal


@router.post("/accept", response_model=DealOut)
def accept_proof(
    deal: Deal = Depends(load_deal),
    db: Session = Depends(get_db),
    paypal: PayPalClient = Depends(get_paypal),
) -> Deal:
    require_status(deal, "proof_review")
    mark_verified(deal, paypal)
    db.commit()
    return deal
