"""Check the TrustCargo setup without printing any secrets.

Run from the backend folder:
    python -m scripts.check_setup
    python -m scripts.check_setup ORDER_ID [ORDER_ID ...]

Pass PayPal order IDs to compare a working order with a declined one.
"""

import importlib
import sys
from pathlib import Path
from typing import Any

from sqlalchemy import text

from app.config import settings

BACKEND = Path(__file__).resolve().parents[1]
FRONTEND = BACKEND.parent / "frontend"
REQUIRED_PACKAGES = ["fastapi", "uvicorn", "sqlalchemy", "httpx", "pypdf", "pydantic_settings"]
results: list[tuple[str, str]] = []


def report(status: str, name: str, detail: str = "") -> None:
    results.append((status, name))
    line = f"[{status}] {name}"
    print(f"{line}: {detail}" if detail else line)


def mask(value: str, show_start: bool = True) -> str:
    if not value:
        return "missing"
    start = f", starts {value[:4]}..." if show_start else ""
    return f"set ({len(value)} characters{start})"


def check_value(name: str, value: str, show_start: bool = True) -> None:
    if not value:
        report("FAIL", name, "missing")
    elif value != value.strip() or value[:1] in "\"'":
        report("FAIL", name, "remove the quotes or spaces around the value")
    else:
        report("OK", name, mask(value, show_start))


def check_files() -> None:
    print("\n1. Files and packages")
    version = sys.version_info
    status = "OK" if version >= (3, 11) else "FAIL"
    report(status, "Python", f"{version.major}.{version.minor}.{version.micro}")

    for package in REQUIRED_PACKAGES:
        try:
            importlib.import_module(package)
            report("OK", f"Package {package}")
        except ImportError:
            report("FAIL", f"Package {package}", "run: python -m pip install -r requirements.txt")

    env = BACKEND / ".env"
    if env.exists():
        report("OK", "backend/.env", "found")
    elif (BACKEND / ".env.txt").exists():
        report("FAIL", "backend/.env", "found .env.txt, rename it to .env")
    else:
        report("FAIL", "backend/.env", "missing, copy .env.example to .env")

    frontend_env = FRONTEND / ".env.local"
    status = "OK" if frontend_env.exists() else "WARN"
    report(status, "frontend/.env.local", "found" if frontend_env.exists() else "missing")


def check_settings() -> None:
    print("\n2. Settings")
    check_value("PAYPAL_CLIENT_ID", settings.paypal_client_id)
    check_value("PAYPAL_CLIENT_SECRET", settings.paypal_client_secret, show_start=False)
    check_value("GROQ_API_KEY", settings.groq_api_key, show_start=False)

    sandbox = "sandbox" in settings.paypal_base_url
    report("OK" if sandbox else "FAIL", "PAYPAL_BASE_URL", settings.paypal_base_url)
    report("OK", "FRONTEND_URL", settings.frontend_url)


def describe_order(order: dict[str, Any]) -> None:
    unit = order.get("purchase_units", [{}])[0]
    payee = unit.get("payee", {})
    payer = order.get("payer", {})
    amount = unit.get("amount", {})
    shipping = unit.get("shipping", {}).get("address", {})

    print(f"     Status: {order.get('status')}")
    print(f"     Amount: {amount.get('value')} {amount.get('currency_code')}")
    print(f"     Seller: {payee.get('email_address')} ({payee.get('merchant_id')})")
    print(f"     Buyer:  {payer.get('email_address', 'not approved yet')}")
    country = payer.get("address", {}).get("country_code") or shipping.get("country_code")
    print(f"     Buyer country: {country or 'not shown'}")


def check_paypal(order_ids: list[str]) -> None:
    print("\n3. PayPal sandbox")
    if not settings.paypal_client_id or not settings.paypal_client_secret:
        report("SKIP", "PayPal checks", "PayPal keys are missing")
        return

    from app.services.paypal import PayPalClient, PayPalError

    paypal = PayPalClient()
    try:
        paypal._access_token()
        report("OK", "PayPal login", "the Client ID and Secret work")
    except PayPalError as error:
        report("FAIL", "PayPal login", str(error)[:300])
        return

    try:
        order = paypal.create_order(
            amount="10.00",
            description="TrustCargo setup check",
            return_url=f"{settings.frontend_url}/dashboard",
            cancel_url=f"{settings.frontend_url}/dashboard",
        )
        report("OK", "Create test order", order.id)
        describe_order(paypal.get_order(order.id))
        print("     This order was created only for checking. You don't need to pay it.")
    except PayPalError as error:
        report("FAIL", "Create test order", str(error)[:300])

    for order_id in order_ids:
        try:
            report("OK", f"Order {order_id}")
            describe_order(paypal.get_order(order_id))
        except PayPalError as error:
            report("FAIL", f"Order {order_id}", str(error)[:300])


def check_groq() -> None:
    print("\n4. Groq AI")
    if not settings.groq_api_key:
        report("WARN", "Groq", "no key, so the app uses rule-based demo mode")
        return

    from app.services import llm

    result = llm.ask_json(
        "Return a short setup test result.",
        [{"type": "text", "text": "Return ok as true."}],
        {"type": "object", "properties": {"ok": {"type": "boolean"}}, "required": ["ok"]},
    )
    if result == {"ok": True}:
        report("OK", "Groq", f"model {settings.groq_model} replied")
    else:
        report("FAIL", "Groq", "no valid reply, check the key and the error above")


def check_storage() -> None:
    print("\n5. Database and uploads")
    from app.database import Base, engine
    from app import models  # noqa: F401

    try:
        Base.metadata.create_all(engine)
        with engine.connect() as connection:
            count = connection.execute(text("SELECT COUNT(*) FROM deals")).scalar_one()
        report("OK", "Database", f"{count} deals saved")
    except Exception as error:  # noqa: BLE001
        report("FAIL", "Database", str(error)[:300])

    uploads = Path(settings.upload_dir)
    if not uploads.is_absolute():
        uploads = Path.cwd() / uploads
    try:
        uploads.mkdir(parents=True, exist_ok=True)
        probe = uploads / ".write-test"
        probe.write_text("ok")
        probe.unlink()
        report("OK", "Uploads folder", str(uploads))
    except OSError as error:
        report("FAIL", "Uploads folder", str(error))


def main() -> int:
    print("TrustCargo setup check (no secrets are printed)")
    check_files()
    check_settings()
    check_paypal(sys.argv[1:])
    check_groq()
    check_storage()

    failed = [name for status, name in results if status == "FAIL"]
    print("\nSummary")
    if failed:
        print(f"{len(failed)} problem(s): " + ", ".join(failed))
        return 1
    print("No setup problems found.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
