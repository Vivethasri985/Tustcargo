"""Invitation emails over SMTP."""

import logging
import smtplib
from email.message import EmailMessage
from html import escape

from app.config import settings
from app.database import SessionLocal
from app.models import Deal

logger = logging.getLogger(__name__)
TIMEOUT_SECONDS = 20


def _message(deal: Deal, inviter_name: str, role: str) -> EmailMessage:
    link = f"{settings.frontend_url}/deals/{deal.id}"
    subject = f"{inviter_name} invited you to a TrustCargo deal"
    text = (
        f"{inviter_name} has invited you to join a deal on TrustCargo as the {role}.\n\n"
        f"Goods: {deal.quantity} x {deal.product}\n"
        f"Deal: {deal.reference}\n\n"
        f"Sign up or log in with this email address, then open the deal:\n{link}\n\n"
        "You'll set your own private price limit. The other side never sees it."
    )
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:560px;color:#1f2a2c">
      <p style="color:#a85a17;font-weight:bold">TrustCargo</p>
      <h2 style="margin:0 0 12px">{escape(inviter_name)} invited you to a deal</h2>
      <p>You've been invited as the <b>{escape(role)}</b> for
      <b>{deal.quantity} x {escape(deal.product)}</b> (deal {escape(deal.reference or "")}).</p>
      <p>Sign up or log in with this email address, then open the deal to set your own
      private price limit. The other side never sees it.</p>
      <p><a href="{escape(link)}" style="background:#a85a17;color:#fff;padding:10px 18px;
      border-radius:6px;text-decoration:none;display:inline-block">Open the deal</a></p>
    </div>"""
    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = settings.email_from
    message["To"] = deal.invite_email or ""
    message.set_content(text)
    message.add_alternative(html, subtype="html")
    return message


def send_invite(deal_id: int, inviter_name: str, role: str) -> None:
    """Send the invite and record the result. Runs after the response is sent."""
    with SessionLocal() as db:
        deal = db.get(Deal, deal_id)
        if deal is None or not deal.invite_email:
            return
        if not settings.email_enabled:
            deal.invite_email_status = "not_configured"
            db.commit()
            return
        try:
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=TIMEOUT_SECONDS) as smtp:
                if settings.smtp_use_tls:
                    smtp.starttls()
                if settings.smtp_username:
                    smtp.login(settings.smtp_username, settings.smtp_password)
                smtp.send_message(_message(deal, inviter_name, role))
            deal.invite_email_status = "sent"
        except (smtplib.SMTPException, OSError):
            logger.exception("Invite email failed for deal %s", deal_id)
            deal.invite_email_status = "failed"
        db.commit()
