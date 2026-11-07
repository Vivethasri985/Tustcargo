from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import claims, deals, documents, evidence, payments, shipments, tracking, webhooks
from app import models  # noqa: F401
from app.config import settings
from app.database import Base, SessionLocal, add_missing_columns, engine
from app.seed.sample_data import seed_suppliers
from app.services.references import backfill_references


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    Base.metadata.create_all(engine)
    add_missing_columns()
    with SessionLocal() as db:
        backfill_references(db)
        seed_suppliers(db)
    yield


app = FastAPI(title="TrustCargo API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


for module in (deals, payments, shipments, tracking, evidence, documents, claims, webhooks):
    app.include_router(module.router, prefix="/api")
