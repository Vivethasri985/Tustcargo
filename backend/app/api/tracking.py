from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.agents import watcher
from app.database import get_db
from app.models import Deal
from app.schemas.deal import DealOut
from app.services.deal_flow import load_deal, require_status

router = APIRouter(prefix="/deals/{deal_id}/tracking", tags=["tracking"])
TRACKING_STATUSES = ("shipment_verified", "balance_paid")


def check_in_transit(deal: Deal) -> None:
    require_status(deal, *TRACKING_STATUSES)
    if deal.delivered:
        raise HTTPException(409, "The shipment has already been delivered.")
    if not deal.events:
        watcher.start(deal)


@router.post("/advance", response_model=DealOut)
def simulate_update(deal: Deal = Depends(load_deal), db: Session = Depends(get_db)) -> Deal:
    check_in_transit(deal)
    watcher.advance(deal)
    db.commit()
    return deal


@router.post("/delay", response_model=DealOut)
def simulate_delay(deal: Deal = Depends(load_deal), db: Session = Depends(get_db)) -> Deal:
    check_in_transit(deal)
    watcher.delay(deal)
    db.commit()
    return deal
