from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware

from fastapi import Request
from fastapi.responses import JSONResponse

from app.api import auth, claims, deals, documents, evidence, payments, shipments, tracking, webhooks
from app import models  # noqa: F401
from app.config import settings
from app.database import Base, SessionLocal, add_missing_columns, engine, get_db
from app.services.references import backfill_references
from app.services.storage import check_private_bucket


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    settings.validate_deployment()
    if settings.storage_backend == "supabase":
        check_private_bucket()
    Base.metadata.create_all(engine)
    add_missing_columns()
    with SessionLocal() as db:
        backfill_references(db)
    yield


app = FastAPI(title="TrustCargo API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


UNSAFE = {"POST", "PUT", "PATCH", "DELETE"}


@app.middleware("http")
async def check_origin(request: Request, call_next):
    """Refuse state-changing requests sent from another website."""
    origin = request.headers.get("origin")
    webhook = request.url.path.startswith("/api/webhooks/")
    if request.method in UNSAFE and origin and not webhook and origin.rstrip("/") != settings.frontend_url:
        return JSONResponse({"detail": "Request blocked: unexpected origin."}, status_code=403)
    return await call_next(request)


@app.get("/api/health")
def health(db: Session = Depends(get_db)) -> dict[str, str]:
    try:
        db.execute(text("SELECT 1"))
    except SQLAlchemyError:
        raise HTTPException(503, "Database unavailable.") from None
    return {"status": "ok"}


for module in (auth, deals, payments, shipments, tracking, evidence, documents, claims, webhooks):
    app.include_router(module.router, prefix="/api")
