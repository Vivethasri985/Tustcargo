from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.schemas.auth import clean_email


class DealCreate(BaseModel):
    role: Literal["buyer", "seller"]
    product: str = Field(min_length=2, max_length=200)
    quantity: int = Field(gt=0, le=100_000)
    counterparty_email: str
    limit_cents: int = Field(gt=0, le=100_000_000)
    days: int = Field(gt=0, le=365)

    _email = field_validator("counterparty_email")(clean_email)

    @field_validator("product")
    @classmethod
    def strip(cls, value: str) -> str:
        return " ".join(value.split())


class DealAccept(BaseModel):
    limit_cents: int = Field(gt=0, le=100_000_000)
    days: int = Field(gt=0, le=365)


class PartnerOut(BaseModel):
    email: str
    name: str
    country: str
    deals: int
    last_product: str
    last_quantity: int
    last_role: str


class TrackingUpdateIn(BaseModel):
    kind: Literal["milestone", "delay"]
    delay_days: int = Field(default=0, ge=0, le=14)
    note: str = Field(default="", max_length=300)

    @model_validator(mode="after")
    def delay_needs_days(self) -> "TrackingUpdateIn":
        if self.kind == "delay" and self.delay_days < 1:
            raise ValueError("A delay must be between 1 and 14 days.")
        return self


class InspectionIn(BaseModel):
    received_quantity: int = Field(ge=0)
    damaged_quantity: int = Field(default=0, ge=0)
    notes: str = Field(default="", max_length=2000)

    @model_validator(mode="after")
    def damaged_within_received(self) -> "InspectionIn":
        if self.damaged_quantity > self.received_quantity:
            raise ValueError("Damaged quantity cannot exceed received quantity.")
        return self


class PaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    kind: str
    amount_cents: int
    order_id: str
    capture_id: str | None
    status: str


class EvidenceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    stage: str
    original_name: str
    content_type: str
    size_bytes: int | None
    url: str


class ShipmentEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    stage: int
    kind: str
    title: str
    location: str
    day: int
    note: str | None


class DocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    kind: str
    title: str
    url: str


class ActivityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    actor: str
    message: str
    created_at: datetime


class DealOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    reference: str | None
    viewer_role: str = ""
    next_actor: str | None = None
    creator_role: str | None
    invite_email: str | None
    invite_email_status: str | None
    created_at: datetime
    updated_at: datetime | None
    product: str
    quantity: int
    buyer_name: str
    buyer_country: str
    seller_name: str
    seller_country: str
    buyer_max_cents: int | None
    seller_min_cents: int | None
    buyer_deadline_days: int | None
    seller_lead_days: int | None
    deposit_percent: int
    status: str
    ai_mode: str
    unit_price_cents: int | None
    delivery_days: int | None
    total_cents: int | None
    deposit_cents: int | None
    balance_cents: int | None
    transcript: list[dict[str, Any]]
    buyer_approved: bool
    seller_approved: bool
    carrier: str | None
    tracking_number: str | None
    shipped_quantity: int | None
    verification: dict[str, Any] | None
    tracking_added: bool
    delay_days: int
    delivered: bool
    watcher: dict[str, Any] | None
    events: list[ShipmentEventOut]
    received_quantity: int | None
    damaged_quantity: int | None
    inspection_notes: str | None
    claim: dict[str, Any] | None
    refund_suggested_cents: int | None
    refund_id: str | None
    refund_status: str | None
    payments: list[PaymentOut]
    evidence: list[EvidenceOut]
    activity: list[ActivityOut]
    documents: list[DocumentOut]


class PaymentLink(BaseModel):
    approval_url: str
