"""Suppliers added to an empty database so a new deal can start quickly."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Supplier

DEFAULT_SUPPLIERS = [
    {
        "seller_name": "Chennai Silk House",
        "seller_country": "India",
        "product": "Silk sarees",
        "seller_min_cents": 2000,
        "seller_lead_days": 18,
    },
    {
        "seller_name": "Coimbatore Cotton Works",
        "seller_country": "India",
        "product": "Cotton fabric rolls",
        "seller_min_cents": 1200,
        "seller_lead_days": 14,
    },
]


def seed_suppliers(db: Session) -> None:
    if db.scalar(select(Supplier.id).limit(1)) is not None:
        return
    db.add_all(Supplier(**supplier) for supplier in DEFAULT_SUPPLIERS)
    db.commit()
