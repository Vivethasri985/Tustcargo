"""Read-only cloud readiness check. Reads private environment variables, prints no secrets.

Run from backend: python -m scripts.check_cloud
Does not initialize/migrate schemas, upload files, or make payment requests.
"""

from sqlalchemy import create_engine, inspect, text

from app.config import settings
from app.database import Base
from app import models  # noqa: F401
from app.services.storage import check_private_bucket


def main() -> int:
    try:
        settings.validate_deployment()
    except Exception:
        print("FAIL: deployment configuration; check PostgreSQL TLS, HTTPS origins and storage settings privately.")
        return 1
    if not settings.database_url.startswith("postgresql+") or settings.storage_backend != "supabase":
        print("UNVERIFIED: configure PostgreSQL and Supabase Storage in private environment variables first.")
        return 1
    engine = create_engine(settings.database_url, hide_parameters=True)
    try:
        with engine.connect() as connection:
            connection.execute(text("SET TRANSACTION READ ONLY"))
            assert connection.scalar(text("SELECT 1")) == 1
            # Check this client's TLS, not the pooler's separate DB connection.
            assert connection.connection.driver_connection.pgconn.ssl_in_use
            tables = set(inspect(connection).get_table_names())
            complete = set(Base.metadata.tables) <= tables
        print("PASS: PostgreSQL connection and TLS.")
        print("PASS: application tables exist." if complete else "UNVERIFIED: application tables not initialized; startup creates them after deployment approval.")
        check_private_bucket()
        print("PASS: private evidence bucket accessible to backend.")
        return 0 if complete else 1
    except Exception:
        print("FAIL: cloud readiness check; inspect database/storage configuration privately. No data was modified.")
        return 1
    finally:
        engine.dispose()


if __name__ == "__main__":
    raise SystemExit(main())
