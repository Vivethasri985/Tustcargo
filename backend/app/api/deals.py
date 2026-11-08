from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.agents import negotiator
from app.database import get_db
from app.models import Deal, User
from app.schemas.deal import DealAccept, DealCreate, DealOut, PartnerOut
from app.services import email
from app.services.access import invited_role, load_deal, require_role, role_of
from app.services.auth import current_user
from app.services.deal_flow import log_activity, require_status
from app.services.references import new_reference
from app.services.views import view

router = APIRouter(tags=["deals"])


def my_deals(db: Session, user: User) -> list[Deal]:
    query = select(Deal).where(
        or_(
            Deal.buyer_id == user.id,
            Deal.seller_id == user.id,
            (Deal.status == "invited") & (Deal.invite_email == user.email),
        )
    )
    return list(db.scalars(query.order_by(Deal.id.desc())))


@router.get("/deals", response_model=list[DealOut])
def list_deals(user: User = Depends(current_user), db: Session = Depends(get_db)) -> list[DealOut]:
    return [view(deal, user) for deal in my_deals(db, user)]


@router.get("/partners", response_model=list[PartnerOut])
def list_partners(user: User = Depends(current_user), db: Session = Depends(get_db)) -> list[PartnerOut]:
    """People this user has traded with or invited, newest first."""
    partners: dict[str, PartnerOut] = {}
    for deal in my_deals(db, user):
        role = role_of(deal, user)
        if role not in ("buyer", "seller"):
            continue
        other_id = deal.seller_id if role == "buyer" else deal.buyer_id
        other = db.get(User, other_id) if other_id else None
        address = other.email if other else deal.invite_email
        if not address:
            continue
        if address in partners:
            partners[address].deals += 1
            continue
        partners[address] = PartnerOut(
            email=address,
            name=other.display_name if other else "",
            country=other.country if other else "",
            deals=1,
            last_product=deal.product,
            last_quantity=deal.quantity,
            last_role=role,
        )
    return list(partners.values())


@router.post("/deals", response_model=DealOut, status_code=201)
def create_deal(
    data: DealCreate,
    background: BackgroundTasks,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> DealOut:
    if data.counterparty_email == user.email:
        raise HTTPException(422, "Invite someone else. You can't trade with yourself.")

    deal = Deal(
        reference=new_reference(db),
        product=data.product,
        quantity=data.quantity,
        creator_role=data.role,
        created_by_id=user.id,
        invite_email=data.counterparty_email,
        invite_email_status="pending",
        status="invited",
        transcript=[],
        buyer_name="",
        buyer_country="",
        seller_name="",
        seller_country="",
        buyer_max_cents=0,
        seller_min_cents=0,
        buyer_deadline_days=0,
        seller_lead_days=0,
    )
    if data.role == "seller":
        deal.seller_id = user.id
        deal.seller_name, deal.seller_country = user.display_name, user.country
        deal.seller_min_cents, deal.seller_lead_days = data.limit_cents, data.days
    else:
        deal.buyer_id = user.id
        deal.buyer_name, deal.buyer_country = user.display_name, user.country
        deal.buyer_max_cents, deal.buyer_deadline_days = data.limit_cents, data.days

    log_activity(
        deal,
        data.role,
        f"Opened the deal for {deal.quantity} x {deal.product} and invited {data.counterparty_email}.",
    )
    db.add(deal)
    db.commit()
    background.add_task(email.send_invite, deal.id, user.display_name, invited_role(deal))
    return view(deal, user)


@router.get("/deals/{deal_id}", response_model=DealOut)
def get_deal(deal: Deal = Depends(load_deal), user: User = Depends(current_user)) -> DealOut:
    return view(deal, user)


@router.post("/deals/{deal_id}/accept", response_model=DealOut)
def accept_invite(
    data: DealAccept,
    deal: Deal = Depends(load_deal),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> DealOut:
    if role_of(deal, user) != "invitee":
        raise HTTPException(403, "Only the invited person can accept this deal.")
    require_status(deal, "invited")

    role = invited_role(deal)
    if role == "buyer":
        deal.buyer_id = user.id
        deal.buyer_name, deal.buyer_country = user.display_name, user.country
        deal.buyer_max_cents, deal.buyer_deadline_days = data.limit_cents, data.days
    else:
        deal.seller_id = user.id
        deal.seller_name, deal.seller_country = user.display_name, user.country
        deal.seller_min_cents, deal.seller_lead_days = data.limit_cents, data.days
    log_activity(deal, role, "Accepted the invitation and set a private limit.")

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

    db.commit()
    return view(deal, user)


@router.post("/deals/{deal_id}/decline", response_model=DealOut)
def decline_invite(
    deal: Deal = Depends(load_deal),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> DealOut:
    if role_of(deal, user) != "invitee":
        raise HTTPException(403, "Only the invited person can decline this deal.")
    require_status(deal, "invited")
    deal.status = "declined"
    deal.invite_email = None
    log_activity(deal, invited_role(deal), f"{user.email} declined the invitation.")
    db.commit()
    out = view(deal, user)
    return out.model_copy(update={"viewer_role": "invitee"})


@router.post("/deals/{deal_id}/approve", response_model=DealOut)
def approve_deal(
    deal: Deal = Depends(load_deal),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> DealOut:
    require_status(deal, "negotiated")
    role = role_of(deal, user)
    if role == "buyer" and not deal.buyer_approved:
        deal.buyer_approved = True
        log_activity(deal, "buyer", "Approved the deal terms.")
    elif role == "seller" and not deal.seller_approved:
        deal.seller_approved = True
        log_activity(deal, "seller", "Approved the deal terms.")
    elif role not in ("buyer", "seller"):
        raise HTTPException(403, "Only the buyer or seller can approve.")

    if deal.buyer_approved and deal.seller_approved:
        deal.status = "approved"

    db.commit()
    return view(deal, user)


@router.delete("/deals/{deal_id}", status_code=204)
def cancel_invite(
    deal: Deal = Depends(load_deal),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> None:
    if deal.created_by_id != user.id:
        raise HTTPException(403, "Only the person who opened the deal can cancel it.")
    require_status(deal, "invited")
    db.delete(deal)
    db.commit()


__all__ = ["router", "require_role"]
