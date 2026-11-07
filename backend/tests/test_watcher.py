import sqlite3

import pytest
from sqlalchemy import create_engine, inspect

from app import database
from app.agents import watcher
from app.models import Deal
from app.services import llm


@pytest.fixture(autouse=True)
def no_ai(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(llm, "ask_json", lambda *args: None)


def make_deal() -> Deal:
    return Deal(
        product="Silk sarees",
        quantity=100,
        buyer_name="Cape Retail",
        buyer_country="South Africa",
        seller_name="Chennai Silk House",
        seller_country="India",
        buyer_max_cents=2500,
        seller_min_cents=2000,
        buyer_deadline_days=21,
        seller_lead_days=18,
        delivery_days=18,
        delay_days=0,
        delivered=False,
        events=[],
    )


def test_route_ends_with_delivery() -> None:
    deal = make_deal()
    watcher.start(deal)

    for _ in range(watcher.LAST_STAGE + 3):
        watcher.advance(deal)

    assert deal.delivered
    assert [event.stage for event in deal.events] == list(range(watcher.LAST_STAGE + 1))
    assert deal.events[-1].day == 18
    assert deal.watcher["level"] == "delivered"


def test_small_delay_is_at_risk() -> None:
    deal = make_deal()
    deal.buyer_deadline_days = 25
    watcher.start(deal)

    watcher.delay(deal, 4)

    assert deal.watcher["level"] == "at_risk"
    assert deal.watcher["projected_day"] == 22


def test_delay_past_deadline_is_late() -> None:
    deal = make_deal()
    watcher.start(deal)

    watcher.delay(deal, 4)
    watcher.advance(deal)

    assert deal.watcher["level"] == "late"
    assert deal.events[-1].day == watcher._planned_day(deal, 1) + 4


def test_ai_text_cannot_change_the_risk_level(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        llm,
        "ask_json",
        lambda *args: {
            "summary": "All fine",
            "buyer_message": "Fine",
            "seller_message": "Fine",
            "action": "None",
        },
    )
    deal = make_deal()
    watcher.start(deal)

    watcher.delay(deal, 4)

    assert deal.watcher["level"] == "late"
    assert deal.watcher["mode"] == "ai"


def test_old_database_gets_new_columns(tmp_path, monkeypatch: pytest.MonkeyPatch) -> None:
    path = tmp_path / "old.db"
    with sqlite3.connect(path) as connection:
        connection.execute("CREATE TABLE deals (id INTEGER PRIMARY KEY, product TEXT)")
        connection.execute("INSERT INTO deals (id, product) VALUES (1, 'Sarees')")
    engine = create_engine(f"sqlite:///{path}")
    monkeypatch.setattr(database, "engine", engine)

    database.add_missing_columns()

    columns = {column["name"] for column in inspect(engine).get_columns("deals")}
    assert {"delay_days", "delivered", "watcher"} <= columns
    with sqlite3.connect(path) as connection:
        row = connection.execute("SELECT delay_days, delivered FROM deals").fetchone()
    assert row == (0, 0)


def test_delay_is_reported_on_the_current_day() -> None:
    deal = make_deal()
    watcher.start(deal)
    watcher.advance(deal)

    watcher.delay(deal, 4)

    assert deal.events[-1].day == deal.events[-2].day
    assert deal.events[-1].kind == "delay"


def test_late_delivery_is_explained() -> None:
    deal = make_deal()
    watcher.start(deal)
    watcher.delay(deal, 4)

    while not deal.delivered:
        watcher.advance(deal)

    assert deal.watcher["level"] == "delivered"
    assert deal.watcher["missed_deadline"] is True
    assert "after the buyer's deadline" in deal.watcher["summary"]
