import os

import pytest
from sqlalchemy import create_engine, create_mock_engine, text

from app.config import Settings
from app.database import Base


def production(**overrides):
    values = dict(app_env="production", database_url="postgresql://user:placeholder@localhost/postgres?sslmode=require",
                  frontend_url="https://web.example.test", storage_backend="supabase",
                  supabase_url="https://project.example.test", supabase_secret_key="sb_secret_test")
    return Settings(_env_file=None, **(values | overrides))


@pytest.mark.parametrize("scheme", ["postgres", "postgresql", "postgresql+psycopg"])
def test_postgres_url_normalization(scheme):
    settings = production(database_url=f"{scheme}://user:placeholder@localhost/postgres?sslmode=require")
    assert settings.database_url.startswith("postgresql+psycopg://")
    settings.validate_deployment()


@pytest.mark.parametrize("overrides", [
    {"database_url": "sqlite:///./preserved.db"},
    {"database_url": "postgresql://user@localhost/db"},
    {"database_url": "postgresql://user@localhost/db?sslmode=disable"},
    {"storage_backend": "local"}, {"supabase_secret_key": ""},
    {"supabase_url": "http://project.example.test"}, {"frontend_url": "http://web.example.test"},
])
def test_production_rejects_unsafe_configuration(overrides):
    with pytest.raises(ValueError):
        production(**overrides).validate_deployment()


def test_postgresql_schema_compiles_without_sqlite_features():
    statements = []
    engine = create_mock_engine("postgresql+psycopg://", lambda sql, *args, **kwargs: statements.append(str(sql.compile(dialect=engine.dialect))))
    Base.metadata.create_all(engine)
    assert len([sql for sql in statements if "CREATE TABLE" in sql]) == 7
    assert any("FOREIGN KEY" in sql for sql in statements)
    assert any("JSON" in sql for sql in statements)


def test_startup_initializes_schema_without_replacing_records(monkeypatch):
    from fastapi.testclient import TestClient
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy.pool import StaticPool
    from app import main
    from app.models import User
    from app.services.auth import hash_password

    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    sessions = sessionmaker(engine)
    with sessions() as db:
        db.add(User(email="preserved@example.test", password_hash=hash_password("test password"),
                    name="Preserved", business_name="Preserved", country="India"))
        db.commit()
    monkeypatch.setattr(main, "engine", engine)
    monkeypatch.setattr(main, "SessionLocal", sessions)
    monkeypatch.setattr("app.database.engine", engine)
    monkeypatch.setattr(main.settings, "app_env", "development")
    with TestClient(main.app):
        with sessions() as db:
            assert db.scalar(text("SELECT email FROM users")) == "preserved@example.test"
    engine.dispose()


@pytest.mark.skipif(os.environ.get("TRUSTCARGO_TEST_SUPABASE_READ_ONLY") != "1", reason="Supabase live read-only check not enabled")
def test_live_storage_bucket_is_private(monkeypatch):
    from app.config import settings
    from app.services.storage import check_private_bucket
    cloud = Settings()
    monkeypatch.setattr(settings, "supabase_url", cloud.supabase_url)
    monkeypatch.setattr(settings, "supabase_secret_key", cloud.supabase_secret_key)
    monkeypatch.setattr(settings, "supabase_storage_bucket", cloud.supabase_storage_bucket)
    try:
        check_private_bucket()
    except Exception:
        pytest.fail("Supabase integration check failed; inspect configuration privately.", pytrace=False)


@pytest.mark.skipif(not os.environ.get("TRUSTCARGO_TEST_POSTGRES_URL"), reason="No dedicated PostgreSQL test connection configured")
def test_live_postgresql_connection_is_tls_read_only():
    settings = production(database_url=os.environ["TRUSTCARGO_TEST_POSTGRES_URL"])
    settings.validate_deployment()
    engine = create_engine(settings.database_url, hide_parameters=True)
    try:
        with engine.connect() as connection:
            connection.execute(text("SET TRANSACTION READ ONLY"))
            assert connection.scalar(text("SELECT 1")) == 1
            assert connection.connection.driver_connection.pgconn.ssl_in_use
    except Exception:
        pytest.fail("PostgreSQL integration check failed; inspect connectivity privately.", pytrace=False)
    finally:
        engine.dispose()


def test_cloud_check_skips_local_database_without_connecting(monkeypatch, capsys):
    from scripts import check_cloud
    monkeypatch.setattr(check_cloud.settings, "app_env", "development")
    monkeypatch.setattr(check_cloud.settings, "database_url", "sqlite:///./preserved.db")
    def forbidden(*args, **kwargs):
        raise AssertionError("Local database must not be connected by the cloud check")
    monkeypatch.setattr(check_cloud, "create_engine", forbidden)
    assert check_cloud.main() == 1
    output = capsys.readouterr().out
    assert "UNVERIFIED" in output
    assert "preserved.db" not in output
