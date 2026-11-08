from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse

from app.models import Deal
from app.services.access import load_deal
from app.services.storage import upload_path

router = APIRouter(prefix="/deals/{deal_id}/evidence", tags=["evidence"])


@router.get("/{evidence_id}")
def download_evidence(evidence_id: int, deal: Deal = Depends(load_deal)) -> FileResponse:
    item = next((entry for entry in deal.evidence if entry.id == evidence_id), None)
    if item is None:
        raise HTTPException(404, "File not found.")

    path = upload_path(item.stored_name)
    if not path.is_file():
        raise HTTPException(404, "This file is no longer stored on the server.")

    return FileResponse(
        path,
        media_type=item.content_type,
        filename=item.original_name,
        content_disposition_type="inline",
        headers={"X-Content-Type-Options": "nosniff", "Cache-Control": "private, max-age=300"},
    )
