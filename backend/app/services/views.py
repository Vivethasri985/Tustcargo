"""What each person may see of a deal."""

from app.models import Deal, User
from app.schemas.deal import DealOut
from app.services.access import next_actor, role_of


def view(deal: Deal, user: User) -> DealOut:
    """Return the deal as this user should see it.

    Each side sees only its own private price limit. Values the other side
    hasn't entered yet are returned as empty.
    """
    role = role_of(deal, user) or ""
    out = DealOut.model_validate(deal)
    hidden: dict[str, object] = {"viewer_role": role, "next_actor": next_actor(deal)}

    if role != "buyer":
        hidden["buyer_max_cents"] = None
    if role != "seller":
        hidden["seller_min_cents"] = None
    for field in ("buyer_max_cents", "seller_min_cents", "buyer_deadline_days", "seller_lead_days"):
        if getattr(out, field) == 0:
            hidden[field] = None
    if role != "buyer" and role != "seller":
        hidden["invite_email_status"] = None
        # Before joining, the invitee sees the order but not the creator's timing.
        hidden["buyer_deadline_days"] = None
        hidden["seller_lead_days"] = None
    return out.model_copy(update=hidden)
