"""Who may see and act on a deal."""

from typing import Literal

from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Deal, User
from app.services.auth import current_user

Role = Literal["buyer", "seller", "invitee"]
LABEL = {"buyer": "buyer", "seller": "seller"}


def role_of(deal: Deal, user: User) -> Role | None:
    if deal.buyer_id == user.id:
        return "buyer"
    if deal.seller_id == user.id:
        return "seller"
    if deal.status == "invited" and deal.invite_email and deal.invite_email == user.email:
        return "invitee"
    return None


def load_deal(deal_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)) -> Deal:
    deal = db.get(Deal, deal_id)
    if deal is None or role_of(deal, user) is None:
        raise HTTPException(404, "Deal not found.")
    return deal


def require_role(deal: Deal, user: User, role: Literal["buyer", "seller"]) -> None:
    if role_of(deal, user) != role:
        raise HTTPException(403, f"Only the {LABEL[role]} can do this.")


def invited_role(deal: Deal) -> Literal["buyer", "seller"]:
    return "buyer" if deal.creator_role == "seller" else "seller"


def next_actor(deal: Deal) -> str | None:
    """Whose move it is: buyer, seller, both, or None when nothing is pending."""
    status = deal.status
    if status == "invited":
        return invited_role(deal)
    if status == "negotiated":
        if not deal.buyer_approved and not deal.seller_approved:
            return "both"
        return "seller" if deal.buyer_approved else "buyer"
    if status in ("approved", "shipment_verified"):
        return "buyer"
    if status == "deposit_paid":
        return "seller"
    if status == "proof_review":
        return "both"
    if status == "balance_paid":
        return "buyer" if deal.delivered else "seller"
    if status == "refund_suggested":
        return "seller"
    return None
