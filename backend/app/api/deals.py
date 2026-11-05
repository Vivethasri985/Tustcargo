from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.agents import negotiator
from app.database import get_db
from app.models import Deal
from app.schemas.deal import ApprovalIn, DealCreate, DealOut
from app.seed.sample_data import SAMPLE_SUPPLIERS
from app.services.deal_flow import load_deal, require_status

router = APIRouter(tags=["deals"])


@router.get("/suppliers")
def list_suppliers() -> list[dict]:
    return SAMPLE_SUPPLIERS


@router.get("/deals", response_model=list[DealOut])
def list_deals(db: Session = Depends(get_db)) -> list[Deal]:
    return list(db.scalars(select(Deal).order_by(Deal.id.desc())))


@router.post("/deals", response_model=DealOut, status_code=201)
def create_deal(data: DealCreate, db: Session = Depends(get_db)) -> Deal:
    deal = Deal(**data.model_dump(), status="negotiating", transcript=[])
    outcome = negotiator.negotiate(deal)

    deal.transcript = outcome.transcript
    deal.ai_mode = outcome.mode
    if outcome.agreed:
        deal.unit_price_cents = outcome.unit_price_cents
        deal.delivery_days = deal.seller_lead_days
        deal.status = "negotiated"
    else:
        deal.status = "no_deal"

    db.add(deal)
    db.commit()
    return deal


@router.get("/deals/{deal_id}", response_model=DealOut)
def get_deal(deal: Deal = Depends(load_deal)) -> Deal:
    return deal


@router.post("/deals/{deal_id}/approve", response_model=DealOut)
def approve_deal(
    data: ApprovalIn,
    deal: Deal = Depends(load_deal),
    db: Session = Depends(get_db),
) -> Deal:
    require_status(deal, "negotiated")
    if data.party == "buyer":
        deal.buyer_approved = True
    else:
        deal.seller_approved = True

    if deal.buyer_approved and deal.seller_approved:
        deal.status = "approved"

    db.commit()
    return deal


@router.delete("/deals/{deal_id}", status_code=204)
def delete_deal(deal: Deal = Depends(load_deal), db: Session = Depends(get_db)) -> None:
    if deal.payments:
        raise HTTPException(409, "Deals with payments can't be deleted.")
    db.delete(deal)
    db.commit()
