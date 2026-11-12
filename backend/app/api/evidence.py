from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from urllib.parse import quote

from app.models import Deal
from app.services.access import load_deal
from app.services.storage import read_upload

router = APIRouter(prefix="/deals/{deal_id}/evidence", tags=["evidence"])


@router.get("/{evidence_id}")
def download_evidence(evidence_id: int, deal: Deal = Depends(load_deal)) -> Response:
    item = next((entry for entry in deal.evidence if entry.id == evidence_id), None)
    if item is None:
        raise HTTPException(404, "File not found.")

    return Response(
        read_upload(item.stored_name),
        media_type=item.content_type,
        headers={
            "Content-Disposition": f"inline; filename*=UTF-8''{quote(item.original_name, safe='')}",
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "private, max-age=300",
        },
    )
