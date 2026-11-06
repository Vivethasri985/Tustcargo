from scripts.sandbox_payment_test import read_amounts


def test_default_amounts() -> None:
    assert read_amounts([]) == ("1540.00", "176.00")


def test_small_payment_uses_half_as_refund() -> None:
    assert read_amounts(["10"]) == ("10.00", "5.00")


def test_custom_amounts() -> None:
    assert read_amounts(["10", "2"]) == ("10.00", "2.00")


def test_invalid_amounts() -> None:
    assert read_amounts(["abc"]) is None
    assert read_amounts(["10", "20"]) is None
    assert read_amounts(["0"]) is None
