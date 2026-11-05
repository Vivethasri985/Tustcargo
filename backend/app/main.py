from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import claims, deals, payments, shipments, webhooks
from app.config import settings

app = FastAPI(title="TrustCargo API", version="0.1.0")

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


for module in (deals, payments, shipments, claims, webhooks):
    app.include_router(module.router, prefix="/api")
