from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response

from app.models import Deal
from app.services import documents
from app.services.access import load_deal

router = APIRouter(prefix="/deals/{deal_id}/documents", tags=["documents"])


@router.get("/{kind}.pdf")
def download(kind: str, deal: Deal = Depends(load_deal)) -> Response:
    if kind not in {item.kind for item in documents.available(deal)}:
        raise HTTPException(404, "This document isn't available for the deal yet.")

    name, content = documents.render(deal, kind)
    return Response(
        content,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{name}"',
            "X-Content-Type-Options": "nosniff",
        },
    )
