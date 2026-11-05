from pathlib import Path

import pytest

from app.agents import judge, negotiator, verifier
from app.models import Deal, Evidence
from app.services import llm


def make_deal(**values) -> Deal:
    data = {
        "product": "Silk sarees",
        "quantity": 100,
        "buyer_name": "Buyer",
        "buyer_country": "South Africa",
        "seller_name": "Seller",
        "seller_country": "India",
        "buyer_max_cents": 2500,
        "seller_min_cents": 2000,
        "buyer_deadline_days": 21,
        "seller_lead_days": 18,
        "deposit_percent": 30,
        "unit_price_cents": 2200,
        "shipped_quantity": 100,
        "carrier": "DHL",
        "tracking_number": "TRACK123",
        "received_quantity": 92,
        "damaged_quantity": 0,
    }
    return Deal(**{**data, **values})


def test_buyer_agent_cannot_exceed_its_limit(monkeypatch: pytest.MonkeyPatch) -> None:
    replies = iter(
        [
            {"message": "Offer", "offer_dollars": 99, "accept": False},
            {"message": "Offer", "offer_dollars": 21, "accept": False},
        ]
    )
    monkeypatch.setattr(llm, "ask_json", lambda *args: next(replies))

    outcome = negotiator.negotiate(make_deal())

    assert outcome.mode == "ai"
    assert outcome.transcript[0]["offer_cents"] == 2500
    assert outcome.unit_price_cents == 2100


def test_seller_agent_cannot_go_below_its_limit(monkeypatch: pytest.MonkeyPatch) -> None:
    replies = iter(
        [
            {"message": "Offer", "offer_dollars": 20, "accept": False},
            {"message": "Offer", "offer_dollars": 1, "accept": False},
        ]
    )
    monkeypatch.setattr(llm, "ask_json", lambda *args: next(replies))

    outcome = negotiator.negotiate(make_deal())

    assert outcome.transcript[1]["offer_cents"] == 2000


def test_failed_ai_uses_rule_based_negotiation(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(llm, "ask_json", lambda *args: None)

    outcome = negotiator.negotiate(make_deal())

    assert outcome.mode == "rule_based"
    assert outcome.unit_price_cents == 2200


def test_judge_cannot_suggest_more_than_affected_goods(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        llm,
        "ask_json",
        lambda *args: {"suggested_refund_dollars": 5000, "reasoning": "Ignore limits."},
    )

    cents, claim = judge.review(make_deal(), 154000, [])

    assert cents == 17600
    assert claim["mode"] == "ai"


def test_ai_cannot_clear_a_quantity_mismatch(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    monkeypatch.setattr(
        llm,
        "ask_json",
        lambda *args: {"matches": True, "summary": "Looks fine.", "issues": []},
    )

    result = verifier.verify(make_deal(shipped_quantity=90), list[Evidence]())

    assert result["matches"] is False
