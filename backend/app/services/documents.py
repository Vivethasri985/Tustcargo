"""PDF documents for each deal: agreement, invoices, refund note, statement."""

from dataclasses import dataclass
from datetime import UTC, datetime
from io import BytesIO
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.models import Deal, Payment

INK = colors.HexColor("#1f2a2c")
MUTED = colors.HexColor("#5d6967")
LINE = colors.HexColor("#d8ccb4")
ACCENT = {
    "agreement": colors.HexColor("#a85a17"),
    "deposit": colors.HexColor("#2f5fd0"),
    "balance": colors.HexColor("#1f7a5c"),
    "refund": colors.HexColor("#c4503a"),
    "statement": colors.HexColor("#1f7a5c"),
}
SETTLED = {"refunded", "claim_rejected", "closed"}
AFTER_BALANCE_DUE = {"shipment_verified", "balance_paid", "refund_suggested"} | SETTLED


@dataclass(frozen=True)
class DocumentInfo:
    kind: str
    title: str
    url: str


def _paid(payment: Payment | None) -> bool:
    return payment is not None and payment.status == "COMPLETED"


def available(deal: Deal) -> list[DocumentInfo]:
    """Return the documents this deal has reached, in the order they happen."""
    found: list[tuple[str, str]] = []
    if deal.unit_price_cents is not None:
        signed = deal.buyer_approved and deal.seller_approved
        found.append(("agreement", "Trade agreement" if signed else "Draft agreement"))
    if deal.status != "negotiated" and deal.unit_price_cents is not None and deal.status != "no_deal":
        found.append(("deposit", "Deposit receipt" if _paid(deal.payment("deposit")) else "Deposit invoice"))
    if deal.status in AFTER_BALANCE_DUE:
        found.append(("balance", "Balance receipt" if _paid(deal.payment("balance")) else "Balance invoice"))
    if deal.refund_id:
        found.append(("refund", "Refund note"))
    if deal.status in SETTLED:
        found.append(("statement", "Closing statement"))
    return [
        DocumentInfo(kind, title, f"/api/deals/{deal.id}/documents/{kind}.pdf")
        for kind, title in found
    ]


def _money(cents: int | None) -> str:
    return "-" if cents is None else f"${cents / 100:,.2f}"


def _styles(accent: colors.Color) -> dict[str, ParagraphStyle]:
    return {
        "brand": ParagraphStyle("brand", fontName="Helvetica-Bold", fontSize=11, textColor=accent),
        "title": ParagraphStyle("title", fontName="Helvetica-Bold", fontSize=22, leading=26, textColor=INK),
        "meta": ParagraphStyle("meta", fontName="Helvetica", fontSize=9, leading=13, textColor=MUTED),
        "h2": ParagraphStyle("h2", fontName="Helvetica-Bold", fontSize=11, leading=14, textColor=INK, spaceBefore=6),
        "body": ParagraphStyle("body", fontName="Helvetica", fontSize=9.5, leading=13.5, textColor=INK),
        "small": ParagraphStyle("small", fontName="Helvetica", fontSize=8, leading=11, textColor=MUTED),
        "cell": ParagraphStyle("cell", fontName="Helvetica", fontSize=9.5, leading=12.5, textColor=INK),
        "cellb": ParagraphStyle("cellb", fontName="Helvetica-Bold", fontSize=9.5, leading=12.5, textColor=INK),
        "cellr": ParagraphStyle("cellr", fontName="Helvetica", fontSize=9.5, leading=12.5, textColor=INK, alignment=2),
        "cellbr": ParagraphStyle("cellbr", fontName="Helvetica-Bold", fontSize=9.5, leading=12.5, textColor=INK, alignment=2),
    }


def _p(text: object, style: ParagraphStyle) -> Paragraph:
    return Paragraph(escape(str(text)), style)


def _table(rows: list[list[object]], widths: list[float], styles: dict, accent, total_row: bool = False) -> Table:
    last = len(rows) - 1
    def style(index: int, column: int, width: int) -> ParagraphStyle:
        bold = index == 0 or (total_row and index == last)
        right = column == width - 1 and column > 0
        return styles[("cellb" if bold else "cell") + ("r" if right else "")] if not (bold and right) else styles["cellbr"]

    data = [
        [_p(cell, style(index, column, len(row))) for column, cell in enumerate(row)]
        for index, row in enumerate(rows)
    ]
    table = Table(data, colWidths=widths)
    commands = [
        ("LINEBELOW", (0, 0), (-1, 0), 1.2, accent),
        ("LINEBELOW", (0, 1), (-1, -1), 0.4, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("ALIGN", (-1, 0), (-1, -1), "RIGHT"),
    ]
    if total_row:
        commands.append(("LINEABOVE", (0, -1), (-1, -1), 1.2, INK))
    table.setStyle(TableStyle(commands))
    return table


def _parties(deal: Deal, styles: dict) -> Table:
    data = [
        [_p("Seller", styles["small"]), _p("Buyer", styles["small"])],
        [_p(deal.seller_name, styles["cellb"]), _p(deal.buyer_name, styles["cellb"])],
        [_p(deal.seller_country, styles["cell"]), _p(deal.buyer_country, styles["cell"])],
    ]
    table = Table(data, colWidths=[85 * mm, 85 * mm])
    table.setStyle(TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 0), ("TOPPADDING", (0, 0), (-1, -1), 1)]))
    return table


def _header(deal: Deal, title: str, status: str, styles: dict) -> list:
    issued = datetime.now(UTC).strftime("%d %b %Y, %H:%M UTC")
    return [
        _p("TrustCargo", styles["brand"]),
        Spacer(1, 4 * mm),
        _p(title, styles["title"]),
        Spacer(1, 1.5 * mm),
        _p(f"Deal {deal.reference}   |   {status}   |   Issued {issued}", styles["meta"]),
        Spacer(1, 7 * mm),
        _parties(deal, styles),
        Spacer(1, 7 * mm),
    ]


def _footer(styles: dict, extra: str = "") -> list:
    text = (
        "Payments are processed through PayPal. This prototype uses the PayPal sandbox, "
        "so no real money moved. This document is not a tax invoice."
    )
    return [Spacer(1, 10 * mm), _p(f"{extra} {text}".strip(), styles["small"])]


def _goods(deal: Deal) -> list[object]:
    return [f"{deal.product}", str(deal.quantity), _money(deal.unit_price_cents), _money(deal.total_cents)]


def _agreement(deal: Deal, styles: dict, accent) -> tuple[str, list]:
    signed = deal.buyer_approved and deal.seller_approved
    story = _header(deal, "Trade agreement", "Signed by both" if signed else "Awaiting signatures", styles)
    story += [
        _table(
            [["Goods", "Quantity", "Unit price", "Total"], _goods(deal)],
            [80 * mm, 25 * mm, 30 * mm, 35 * mm],
            styles,
            accent,
        ),
        Spacer(1, 6 * mm),
        _p("Terms", styles["h2"]),
        _table(
            [
                ["Term", "Value"],
                [f"Deposit due after both sign ({deal.deposit_percent}%)", _money(deal.deposit_cents)],
                ["Balance due after shipping proof is checked", _money(deal.balance_cents)],
                ["Seller ships within", f"{deal.delivery_days} days"],
                ["Buyer needs the goods within", f"{deal.buyer_deadline_days} days"],
                ["Missing or damaged goods", "Refund from the balance, approved by the seller"],
            ],
            [110 * mm, 60 * mm],
            styles,
            accent,
        ),
        Spacer(1, 6 * mm),
        _p("Signatures", styles["h2"]),
        _table(
            [
                ["Party", "Status"],
                [f"Buyer: {deal.buyer_name}", "Approved" if deal.buyer_approved else "Not yet approved"],
                [f"Seller: {deal.seller_name}", "Approved" if deal.seller_approved else "Not yet approved"],
            ],
            [110 * mm, 60 * mm],
            styles,
            accent,
        ),
        Spacer(1, 4 * mm),
        _p(f"Price agreed by AI negotiation ({deal.ai_mode.replace('_', '-')}).", styles["small"]),
    ]
    return f"{deal.reference}-agreement.pdf", story + _footer(styles)


def _invoice(deal: Deal, kind: str, styles: dict, accent) -> tuple[str, list]:
    payment = deal.payment(kind)
    paid = _paid(payment)
    amount = deal.deposit_cents if kind == "deposit" else deal.balance_cents
    label = "Deposit" if kind == "deposit" else "Balance"
    title = f"{label} {'receipt' if paid else 'invoice'}"
    story = _header(deal, title, "Paid" if paid else "Payment due", styles)
    rows = [["Item", "Amount"], [f"Order total: {deal.quantity} x {deal.product}", _money(deal.total_cents)]]
    if kind == "deposit":
        rows.append([f"Deposit ({deal.deposit_percent}% of the total)", _money(amount)])
    else:
        rows.append(["Less deposit already paid", f"-{_money(deal.deposit_cents)}"])
    rows.append([f"{label} {'paid' if paid else 'due'}", _money(amount)])
    story += [_table(rows, [130 * mm, 40 * mm], styles, accent, total_row=True), Spacer(1, 6 * mm)]
    story += [
        _p("PayPal", styles["h2"]),
        _table(
            [
                ["Detail", "Value"],
                ["Order ID", payment.order_id if payment else "Created when the buyer pays"],
                ["Capture ID", (payment.capture_id or "-") if payment else "-"],
                ["Status", payment.status if payment else "Not started"],
                ["Invoice reference", f"{deal.reference}-{kind.upper()}"],
            ],
            [60 * mm, 110 * mm],
            styles,
            accent,
        ),
    ]
    if kind == "balance" and deal.tracking_number:
        story += [Spacer(1, 4 * mm), _p(f"Shipped with {deal.carrier}, tracking {deal.tracking_number}.", styles["body"])]
    return f"{deal.reference}-{kind}-{'receipt' if paid else 'invoice'}.pdf", story + _footer(styles)


def _refund(deal: Deal, styles: dict, accent) -> tuple[str, list]:
    received = deal.received_quantity or 0
    damaged = deal.damaged_quantity or 0
    affected = max(deal.quantity - received, 0) + damaged
    story = _header(deal, "Refund note", deal.refund_status or "Pending", styles)
    story += [
        _table(
            [
                ["Inspection", "Units"],
                ["Ordered", deal.quantity],
                ["Received", received],
                ["Damaged", damaged],
                ["Affected units", affected],
            ],
            [130 * mm, 40 * mm],
            styles,
            accent,
        ),
        Spacer(1, 6 * mm),
        _table(
            [
                ["Refund", "Amount"],
                [f"{affected} units x {_money(deal.unit_price_cents)}", _money(affected * (deal.unit_price_cents or 0))],
                ["Refund approved by the seller", _money(deal.refund_suggested_cents)],
            ],
            [130 * mm, 40 * mm],
            styles,
            accent,
            total_row=True,
        ),
        Spacer(1, 5 * mm),
        _p(f"Reason: {(deal.claim or {}).get('reasoning', '-')}", styles["body"]),
        Spacer(1, 3 * mm),
        _p(f"PayPal refund ID: {deal.refund_id}. Status: {deal.refund_status}.", styles["body"]),
    ]
    return f"{deal.reference}-refund-note.pdf", story + _footer(styles)


def _statement(deal: Deal, styles: dict, accent) -> tuple[str, list]:
    deposit = deal.payment("deposit")
    balance = deal.payment("balance")
    received = (deposit.amount_cents if _paid(deposit) else 0) + (balance.amount_cents if _paid(balance) else 0)
    refund = deal.refund_suggested_cents if deal.refund_status == "COMPLETED" else 0
    outcome = {
        "refunded": "Refund sent",
        "claim_rejected": "Claim rejected",
        "closed": "Closed with no claim",
    }[deal.status]
    story = _header(deal, "Closing statement", outcome, styles)
    rows = [
        ["Money movement", "Amount"],
        ["Deposit received through PayPal", _money(deposit.amount_cents if _paid(deposit) else 0)],
        ["Balance received through PayPal", _money(balance.amount_cents if _paid(balance) else 0)],
    ]
    if refund:
        rows.append(["Refund returned to the buyer", f"-{_money(refund)}"])
    rows.append(["Seller keeps", _money(received - (refund or 0))])
    story += [_table(rows, [130 * mm, 40 * mm], styles, accent, total_row=True), Spacer(1, 6 * mm)]
    watcher = deal.watcher or {}
    story += [
        _table(
            [
                ["Delivery", "Value"],
                ["Carrier and tracking", f"{deal.carrier or '-'} {deal.tracking_number or ''}".strip()],
                ["Agreed delivery", f"Day {watcher.get('agreed_day', deal.delivery_days)}"],
                ["Delivered", f"Day {watcher.get('projected_day', '-')}"],
                ["Buyer's deadline", f"Day {deal.buyer_deadline_days}"],
                ["Received / damaged", f"{deal.received_quantity} / {deal.damaged_quantity}"],
            ],
            [90 * mm, 80 * mm],
            styles,
            accent,
        ),
        Spacer(1, 6 * mm),
        _p("Activity", styles["h2"]),
    ]
    for entry in deal.activity[-15:]:
        when = entry.created_at.strftime("%d %b %H:%M") if entry.created_at else ""
        story.append(_p(f"{when}  {entry.actor.capitalize()}: {entry.message}", styles["small"]))
    return f"{deal.reference}-closing-statement.pdf", story + _footer(styles)


def render(deal: Deal, kind: str) -> tuple[str, bytes]:
    """Return the file name and PDF bytes for one of the deal's documents."""
    accent = ACCENT[kind]
    styles = _styles(accent)
    if kind == "agreement":
        name, story = _agreement(deal, styles, accent)
    elif kind in ("deposit", "balance"):
        name, story = _invoice(deal, kind, styles, accent)
    elif kind == "refund":
        name, story = _refund(deal, styles, accent)
    else:
        name, story = _statement(deal, styles, accent)

    buffer = BytesIO()
    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        title=name.removesuffix(".pdf"),
        author="TrustCargo",
    )
    document.build(story)
    return name, buffer.getvalue()
