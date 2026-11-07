"""Human-readable deal references, such as TC-7K2M9QXA."""

import secrets

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Deal

ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
LENGTH = 8


def new_reference(db: Session) -> str:
    while True:
        reference = "TC-" + "".join(secrets.choice(ALPHABET) for _ in range(LENGTH))
        if db.scalar(select(Deal.id).where(Deal.reference == reference)) is None:
            return reference


def backfill_references(db: Session) -> None:
    for deal in db.scalars(select(Deal).where(Deal.reference.is_(None))):
        deal.reference = new_reference(db)
    db.commit()
