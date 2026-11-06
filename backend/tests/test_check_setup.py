from scripts.check_setup import mask


def test_mask_never_shows_the_full_value() -> None:
    secret = "abcd1234secretvalue"

    shown = mask(secret)

    assert secret not in shown
    assert shown.startswith("set (19 characters")


def test_mask_reports_missing() -> None:
    assert mask("") == "missing"


def test_secret_start_can_be_hidden() -> None:
    assert mask("abcd1234", show_start=False) == "set (8 characters)"
