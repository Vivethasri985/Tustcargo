from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.agents import watcher
from app.database import get_db
from app.models import Deal
from app.schemas.deal import DealOut, TrackingUpdateIn
from app.services.deal_flow import load_deal, log_activity, require_status

router = APIRouter(prefix="/deals/{deal_id}/tracking", tags=["tracking"])
TRACKING_STATUSES = ("shipment_verified", "balance_paid")


@router.post("/updates", response_model=DealOut)
def add_update(
    data: TrackingUpdateIn,
    deal: Deal = Depends(load_deal),
    db: Session = Depends(get_db),
) -> Deal:
    require_status(deal, *TRACKING_STATUSES)
    if deal.delivered:
        raise HTTPException(409, "The shipment has already been delivered.")
    if not deal.events:
        watcher.start(deal)

    note = data.note.strip() or None
    if data.kind == "milestone":
        title = watcher.advance(deal, note)
        log_activity(deal, "carrier", f"{title}." + (f" {note}" if note else ""))
    else:
        if deal.delay_days + data.delay_days > watcher.MAX_TOTAL_DELAY_DAYS:
            raise HTTPException(
                409, f"Total delay can't exceed {watcher.MAX_TOTAL_DELAY_DAYS} days."
            )
        watcher.delay(deal, data.delay_days, note)
        log_activity(
            deal,
            "carrier",
            f"Reported a {data.delay_days}-day delay." + (f" {note}" if note else ""),
        )

    log_activity(deal, "ai", f"Watcher: {deal.watcher['summary']}")
    db.commit()
    return deal
