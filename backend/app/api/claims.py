import json
import logging
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.agents import judge
from app.database import get_db
from app.models import Deal
from app.schemas.deal import DealOut, InspectionIn
from app.models import User
from app.services.access import load_deal, require_role
from app.services.auth import current_user
from app.services.deal_flow import add_evidence, log_activity, require_status
from app.services.views import view
from app.services.paypal import PayPalClient, PayPalError, get_paypal
from app.services.storage import MAX_FILES

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/deals/{deal_id}", tags=["claims"])


@router.post("/inspection", response_model=DealOut)
async def submit_inspection(
    received_quantity: Annotated[int, Form()],
    damaged_quantity: Annotated[int, Form()] = 0,
    notes: Annotated[str, Form()] = "",
    files: Annotated[list[UploadFile] | None, File()] = None,
    deal: Deal = Depends(load_deal),
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
) -> DealOut:
    require_role(deal, user, "buyer")
    require_status(deal, "balance_paid")
    if not deal.delivered:
        raise HTTPException(409, "Wait until the Watcher shows the shipment as delivered.")
    try:
        data = InspectionIn(
            received_quantity=received_quantity,
            damaged_quantity=damaged_quantity,
            notes=notes,
        )
    except ValidationError as error:
        raise HTTPException(422, json.loads(error.json())[0]["msg"]) from error

    files = files or []
    if len(files) > MAX_FILES:
        raise HTTPException(422, f"Upload up to {MAX_FILES} files.")

    deal.received_quantity = data.received_quantity
    deal.damaged_quantity = data.damaged_quantity
    deal.inspection_notes = data.notes
    saved = await add_evidence(db, deal, "claim", files)
    db.flush()
    log_activity(
        deal,
        "buyer",
        f"Inspected the goods: {data.received_quantity} received, "
        f"{data.damaged_quantity} damaged, {len(saved)} photo(s).",
    )

    if data.received_quantity >= deal.quantity and data.damaged_quantity == 0:
        deal.status = "closed"
        log_activity(deal, "system", "Goods matched the order. Deal closed.")
        db.commit()
        return view(deal, user)

    balance = deal.payment("balance")
    deal.refund_suggested_cents, deal.claim = judge.review(
        deal,
        balance.amount_cents if balance else 0,
        saved,
    )
    deal.status = "refund_suggested"
    log_activity(
        deal,
        "ai",
        f"Suggested a ${deal.refund_suggested_cents / 100:.2f} refund: "
        f"{deal.claim['reasoning']}",
    )
    db.commit()
    return view(deal, user)


@router.post("/claim/approve", response_model=DealOut)
def approve_refund(
    deal: Deal = Depends(load_deal),
    db: Session = Depends(get_db),
    paypal: PayPalClient = Depends(get_paypal),
    user: User = Depends(current_user),
) -> DealOut:
    require_role(deal, user, "seller")
    require_status(deal, "refund_suggested")
    amount = deal.refund_suggested_cents or 0
    if amount == 0:
        deal.status = "closed"
        log_activity(deal, "seller", "Approved a $0 refund. Deal closed.")
        db.commit()
        return view(deal, user)

    balance = deal.payment("balance")
    if balance is None or balance.capture_id is None or balance.status != "COMPLETED":
        raise HTTPException(409, "The balance payment isn't complete.")

    try:
        refund = paypal.refund_capture(
            balance.capture_id,
            f"{amount / 100:.2f}",
            request_id=f"refund-{deal.reference}-{balance.capture_id}",
        )
    except PayPalError as error:
        logger.error("PayPal refund failed: %s", error)
        raise HTTPException(502, "PayPal couldn't send this refund.") from error

    deal.refund_id = refund.id
    deal.refund_status = refund.status
    deal.status = "refunded"
    log_activity(deal, "seller", f"Approved the ${amount / 100:.2f} refund.")
    log_activity(deal, "paypal", f"Refund {refund.id} is {refund.status}.")
    db.commit()
    return view(deal, user)


@router.post("/claim/reject", response_model=DealOut)
def reject_refund(
    deal: Deal = Depends(load_deal),
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
) -> DealOut:
    require_role(deal, user, "seller")
    require_status(deal, "refund_suggested")
    deal.status = "claim_rejected"
    log_activity(deal, "seller", "Rejected the suggested refund. No money was returned.")
    db.commit()
    return view(deal, user)
