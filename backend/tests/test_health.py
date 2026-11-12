from fastapi.testclient import TestClient

from app.main import app


def test_health(make_client) -> None:
    response = make_client().get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_health_hides_database_errors() -> None:
    from sqlalchemy.exc import SQLAlchemyError
    from app.database import get_db

    class Unavailable:
        def execute(self, statement):
            raise SQLAlchemyError("private connection details")

    app.dependency_overrides[get_db] = lambda: Unavailable()
    try:
        response = TestClient(app).get("/api/health")
        assert response.status_code == 503
        assert response.json() == {"detail": "Database unavailable."}
    finally:
        app.dependency_overrides.pop(get_db, None)
