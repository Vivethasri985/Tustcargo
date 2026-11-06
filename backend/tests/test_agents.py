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


def scripted_agents(monkeypatch: pytest.MonkeyPatch, buyer: list, seller: list) -> None:
    replies = {"buyer": iter(buyer), "seller": iter(seller)}

    def fake(system, content, schema):
        party = "buyer" if "represent the buyer" in system else "seller"
        return next(replies[party])

    monkeypatch.setattr(llm, "ask_json", fake)


def offer(dollars: float, accept: bool = False) -> dict:
    return {"message": "Offer", "offer_dollars": dollars, "accept": accept}


def check_rules(deal: Deal, transcript: list[dict]) -> None:
    buyer = [line["offer_cents"] for line in transcript if line["party"] == "buyer"]
    seller = [line["offer_cents"] for line in transcript if line["party"] == "seller"]
    assert all(cents <= deal.buyer_max_cents for cents in buyer)
    assert all(cents >= deal.seller_min_cents for cents in seller)
    assert buyer == sorted(buyer)
    assert seller == sorted(seller, reverse=True)


def test_agents_cannot_settle_on_the_first_move(monkeypatch: pytest.MonkeyPatch) -> None:
    deal = make_deal()
    scripted_agents(
        monkeypatch,
        buyer=[offer(20, accept=True)] + [offer(25, accept=True)] * 4,
        seller=[offer(20, accept=True)] + [offer(20, accept=True)] * 4,
    )

    outcome = negotiator.negotiate(deal)

    assert outcome.mode == "ai"
    assert len(outcome.transcript) >= 4
    assert outcome.transcript[0]["offer_cents"] == 2000
    assert outcome.transcript[1]["offer_cents"] == 2400
    check_rules(deal, outcome.transcript)


def test_agents_concede_in_small_steps(monkeypatch: pytest.MonkeyPatch) -> None:
    deal = make_deal()
    scripted_agents(
        monkeypatch,
        buyer=[offer(10), offer(99), offer(99), offer(99)],
        seller=[offer(99), offer(1), offer(1), offer(1)],
    )

    outcome = negotiator.negotiate(deal)

    first_buyer, second_buyer = outcome.transcript[0], outcome.transcript[2]
    assert second_buyer["offer_cents"] - first_buyer["offer_cents"] <= 200
    assert outcome.agreed
    assert deal.seller_min_cents <= outcome.unit_price_cents <= deal.buyer_max_cents
    check_rules(deal, outcome.transcript)


def test_acceptance_uses_the_other_sides_offer(monkeypatch: pytest.MonkeyPatch) -> None:
    scripted_agents(
        monkeypatch,
        buyer=[offer(19), offer(21), offer(22)],
        seller=[offer(24), offer(23, accept=False), offer(22, accept=True)],
    )

    outcome = negotiator.negotiate(make_deal())

    assert outcome.agreed
    assert outcome.unit_price_cents == 2200
    assert [line["round"] for line in outcome.transcript][:2] == [1, 1]


def test_offer_range_never_crosses_the_other_side() -> None:
    allowed = negotiator.offer_range(make_deal(), "buyer", 2100, 2150)

    assert allowed.high == 2150
    assert allowed.low <= allowed.high


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
