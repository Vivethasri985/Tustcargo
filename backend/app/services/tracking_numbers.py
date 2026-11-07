"""Validate and normalize carrier tracking numbers."""

import re

PATTERNS = {
    "DHL": (re.compile(r"^(\d{10}|JD\d{18})$"), "10 digits, such as 1234567890"),
    "FEDEX": (
        re.compile(r"^(\d{12}|\d{15}|\d{20}|\d{22})$"),
        "12, 15, 20 or 22 digits, such as 123456789012",
    ),
    "UPS": (re.compile(r"^1Z[0-9A-Z]{16}$"), "1Z followed by 16 letters or digits"),
}
OTHER_PATTERN = re.compile(r"^[A-Z0-9]{6,30}$")
CARRIER_NAME = re.compile(r"^[A-Za-z0-9 .&-]{2,80}$")


def normalize(carrier: str, tracking_number: str) -> tuple[str, str]:
    """Return a clean carrier and tracking number, or raise ValueError."""
    carrier = " ".join(carrier.split())
    number = re.sub(r"[\s-]", "", tracking_number).upper()

    known = carrier.upper().replace(" ", "")
    if known in PATTERNS:
        pattern, example = PATTERNS[known]
        if not pattern.fullmatch(number):
            raise ValueError(f"{known} tracking numbers are {example}.")
        return known, number

    if not CARRIER_NAME.fullmatch(carrier):
        raise ValueError("Enter a carrier name using letters, digits, spaces or . & -")
    if not OTHER_PATTERN.fullmatch(number):
        raise ValueError("Tracking numbers must be 6-30 letters or digits.")
    return carrier, number
