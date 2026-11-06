from datetime import UTC, datetime
from typing import Any

from sqlalchemy import JSON, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def utc_now() -> datetime:
    return datetime.now(UTC)


class Deal(Base):
    __tablename__ = "deals"

    id: Mapped[int] = mapped_column(primary_key=True)
    product: Mapped[str] = mapped_column(String(200))
    quantity: Mapped[int] = mapped_column(Integer)
    buyer_name: Mapped[str] = mapped_column(String(120))
    buyer_country: Mapped[str] = mapped_column(String(80))
    seller_name: Mapped[str] = mapped_column(String(120))
    seller_country: Mapped[str] = mapped_column(String(80))
    buyer_max_cents: Mapped[int] = mapped_column(Integer)
    seller_min_cents: Mapped[int] = mapped_column(Integer)
    buyer_deadline_days: Mapped[int] = mapped_column(Integer)
    seller_lead_days: Mapped[int] = mapped_column(Integer)
    deposit_percent: Mapped[int] = mapped_column(Integer, default=30)

    status: Mapped[str] = mapped_column(String(40), index=True)
    ai_mode: Mapped[str] = mapped_column(String(20), default="rule_based")
    unit_price_cents: Mapped[int | None] = mapped_column(Integer, nullable=True)
    delivery_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    transcript: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    buyer_approved: Mapped[bool] = mapped_column(default=False)
    seller_approved: Mapped[bool] = mapped_column(default=False)

    carrier: Mapped[str | None] = mapped_column(String(80), nullable=True)
    tracking_number: Mapped[str | None] = mapped_column(String(120), nullable=True)
    shipped_quantity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    verification: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    tracking_added: Mapped[bool] = mapped_column(default=False)
    delay_days: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    delivered: Mapped[bool] = mapped_column(default=False, server_default="0")
    watcher: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)

    received_quantity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    damaged_quantity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    inspection_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    claim: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    refund_suggested_cents: Mapped[int | None] = mapped_column(Integer, nullable=True)
    refund_id: Mapped[str | None] = mapped_column(String(80), nullable=True)
    refund_status: Mapped[str | None] = mapped_column(String(40), nullable=True)

    created_at: Mapped[datetime] = mapped_column(default=utc_now)

    payments: Mapped[list["Payment"]] = relationship(
        back_populates="deal",
        cascade="all, delete-orphan",
    )
    evidence: Mapped[list["Evidence"]] = relationship(
        back_populates="deal",
        cascade="all, delete-orphan",
    )
    events: Mapped[list["ShipmentEvent"]] = relationship(
        back_populates="deal",
        cascade="all, delete-orphan",
        order_by="ShipmentEvent.id",
    )

    @property
    def total_cents(self) -> int | None:
        if self.unit_price_cents is None:
            return None
        return self.unit_price_cents * self.quantity

    @property
    def deposit_cents(self) -> int | None:
        total = self.total_cents
        return None if total is None else round(total * self.deposit_percent / 100)

    @property
    def balance_cents(self) -> int | None:
        total = self.total_cents
        return None if total is None else total - (self.deposit_cents or 0)

    def payment(self, kind: str) -> "Payment | None":
        return next((item for item in self.payments if item.kind == kind), None)


class Payment(Base):
    __tablename__ = "payments"
    __table_args__ = (UniqueConstraint("deal_id", "kind"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    deal_id: Mapped[int] = mapped_column(ForeignKey("deals.id"), index=True)
    kind: Mapped[str] = mapped_column(String(20))
    amount_cents: Mapped[int] = mapped_column(Integer)
    order_id: Mapped[str] = mapped_column(String(80), unique=True)
    capture_id: Mapped[str | None] = mapped_column(String(80), nullable=True, index=True)
    approval_url: Mapped[str] = mapped_column(String(500))
    status: Mapped[str] = mapped_column(String(40), default="CREATED")

    deal: Mapped[Deal] = relationship(back_populates="payments")


class Evidence(Base):
    __tablename__ = "evidence"

    id: Mapped[int] = mapped_column(primary_key=True)
    deal_id: Mapped[int] = mapped_column(ForeignKey("deals.id"), index=True)
    stage: Mapped[str] = mapped_column(String(20))
    original_name: Mapped[str] = mapped_column(String(255))
    stored_name: Mapped[str] = mapped_column(String(120))
    content_type: Mapped[str] = mapped_column(String(80))

    deal: Mapped[Deal] = relationship(back_populates="evidence")


class ShipmentEvent(Base):
    __tablename__ = "shipment_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    deal_id: Mapped[int] = mapped_column(ForeignKey("deals.id"), index=True)
    stage: Mapped[int] = mapped_column(Integer)
    kind: Mapped[str] = mapped_column(String(20))
    title: Mapped[str] = mapped_column(String(120))
    location: Mapped[str] = mapped_column(String(200))
    day: Mapped[int] = mapped_column(Integer)

    deal: Mapped[Deal] = relationship(back_populates="events")
