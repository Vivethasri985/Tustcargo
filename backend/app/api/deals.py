from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.agents import negotiator
from app.database import get_db
from app.models import Deal, Supplier
from app.schemas.deal import ApprovalIn, DealCreate, DealOut, SupplierIn, SupplierOut
from app.services.deal_flow import load_deal, log_activity, require_status
from app.services.references import new_reference

router = APIRouter(tags=["deals"])


@router.get("/suppliers", response_model=list[SupplierOut])
def list_suppliers(db: Session = Depends(get_db)) -> list[Supplier]:
    return list(db.scalars(select(Supplier).order_by(Supplier.seller_name)))


@router.post("/suppliers", response_model=SupplierOut, status_code=201)
def add_supplier(data: SupplierIn, db: Session = Depends(get_db)) -> Supplier:
    supplier = Supplier(**data.model_dump())
    db.add(supplier)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(409, "A supplier with this name already exists.") from error
    return supplier


@router.get("/deals", response_model=list[DealOut])
def list_deals(db: Session = Depends(get_db)) -> list[Deal]:
    return list(db.scalars(select(Deal).order_by(Deal.id.desc())))


@router.post("/deals", response_model=DealOut, status_code=201)
def create_deal(data: DealCreate, db: Session = Depends(get_db)) -> Deal:
    deal = Deal(
        **data.model_dump(),
        reference=new_reference(db),
        status="negotiating",
        transcript=[],
    )
    log_activity(
        deal,
        "system",
        f"Deal opened for {deal.quantity} x {deal.product} between "
        f"{deal.seller_name} and {deal.buyer_name}.",
    )
    outcome = negotiator.negotiate(deal)

    deal.transcript = outcome.transcript
    deal.ai_mode = outcome.mode
    if outcome.agreed:
        deal.unit_price_cents = outcome.unit_price_cents
        deal.delivery_days = deal.seller_lead_days
        deal.status = "negotiated"
        log_activity(
            deal,
            "ai",
            f"Agents agreed on ${outcome.unit_price_cents / 100:.2f} per unit "
            f"after {len(outcome.transcript)} messages.",
        )
    else:
        deal.status = "no_deal"
        log_activity(deal, "ai", outcome.transcript[0]["message"])

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
    if data.party == "buyer" and not deal.buyer_approved:
        deal.buyer_approved = True
        log_activity(deal, "buyer", "Approved the deal terms.")
    elif data.party == "seller" and not deal.seller_approved:
        deal.seller_approved = True
        log_activity(deal, "seller", "Approved the deal terms.")

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
