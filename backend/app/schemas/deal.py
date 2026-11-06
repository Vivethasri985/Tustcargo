from typing import Any

from pydantic import BaseModel, ConfigDict, Field, model_validator


class DealCreate(BaseModel):
    product: str = Field(min_length=2, max_length=200)
    quantity: int = Field(gt=0, le=100_000)
    buyer_name: str = Field(min_length=1, max_length=120)
    buyer_country: str = Field(min_length=1, max_length=80)
    seller_name: str = Field(min_length=1, max_length=120)
    seller_country: str = Field(min_length=1, max_length=80)
    buyer_max_cents: int = Field(gt=0)
    seller_min_cents: int = Field(gt=0)
    buyer_deadline_days: int = Field(gt=0, le=365)
    seller_lead_days: int = Field(gt=0, le=365)


class ApprovalIn(BaseModel):
    party: str = Field(pattern="^(buyer|seller)$")


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


class ShipmentEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    stage: int
    kind: str
    title: str
    location: str
    day: int


class DealOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product: str
    quantity: int
    buyer_name: str
    buyer_country: str
    seller_name: str
    seller_country: str
    buyer_max_cents: int
    seller_min_cents: int
    buyer_deadline_days: int
    seller_lead_days: int
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


class PaymentLink(BaseModel):
    approval_url: str
