from datetime import UTC, datetime
from typing import Any

from sqlalchemy import JSON, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def utc_now() -> datetime:
    return datetime.now(UTC)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(300))
    name: Mapped[str] = mapped_column(String(120))
    business_name: Mapped[str] = mapped_column(String(120))
    country: Mapped[str] = mapped_column(String(80))
    created_at: Mapped[datetime] = mapped_column(default=utc_now)

    @property
    def display_name(self) -> str:
        return self.business_name or self.name


class UserSession(Base):
    __tablename__ = "sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(default=utc_now)
    expires_at: Mapped[datetime] = mapped_column()

    user: Mapped[User] = relationship()


class Deal(Base):
    __tablename__ = "deals"

    id: Mapped[int] = mapped_column(primary_key=True)
    reference: Mapped[str | None] = mapped_column(String(20), unique=True, index=True)
    buyer_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    seller_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    created_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    creator_role: Mapped[str | None] = mapped_column(String(10), nullable=True)
    invite_email: Mapped[str | None] = mapped_column(String(254), nullable=True, index=True)
    invite_email_status: Mapped[str | None] = mapped_column(String(30), nullable=True)
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
    updated_at: Mapped[datetime | None] = mapped_column(default=utc_now, onupdate=utc_now)

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
    activity: Mapped[list["DealActivity"]] = relationship(
        back_populates="deal",
        cascade="all, delete-orphan",
        order_by="DealActivity.id",
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

    @property
    def documents(self) -> list:
        from app.services.documents import available

        return available(self)

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
    created_at: Mapped[datetime | None] = mapped_column(default=utc_now)
    updated_at: Mapped[datetime | None] = mapped_column(default=utc_now, onupdate=utc_now)

    deal: Mapped[Deal] = relationship(back_populates="payments")


class Evidence(Base):
    __tablename__ = "evidence"

    id: Mapped[int] = mapped_column(primary_key=True)
    deal_id: Mapped[int] = mapped_column(ForeignKey("deals.id"), index=True)
    stage: Mapped[str] = mapped_column(String(20))
    original_name: Mapped[str] = mapped_column(String(255))
    stored_name: Mapped[str] = mapped_column(String(120))
    content_type: Mapped[str] = mapped_column(String(80))
    size_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sha256: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(default=utc_now)

    deal: Mapped[Deal] = relationship(back_populates="evidence")

    @property
    def url(self) -> str:
        return f"/api/deals/{self.deal_id}/evidence/{self.id}"


class ShipmentEvent(Base):
    __tablename__ = "shipment_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    deal_id: Mapped[int] = mapped_column(ForeignKey("deals.id"), index=True)
    stage: Mapped[int] = mapped_column(Integer)
    kind: Mapped[str] = mapped_column(String(20))
    title: Mapped[str] = mapped_column(String(120))
    location: Mapped[str] = mapped_column(String(200))
    day: Mapped[int] = mapped_column(Integer)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(default=utc_now)

    deal: Mapped[Deal] = relationship(back_populates="events")


class DealActivity(Base):
    __tablename__ = "deal_activity"

    id: Mapped[int] = mapped_column(primary_key=True)
    deal_id: Mapped[int] = mapped_column(ForeignKey("deals.id"), index=True)
    actor: Mapped[str] = mapped_column(String(20))
    message: Mapped[str] = mapped_column(String(300))
    created_at: Mapped[datetime] = mapped_column(default=utc_now)

    deal: Mapped[Deal] = relationship(back_populates="activity")
