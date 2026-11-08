from fastapi.testclient import TestClient

from tests.conftest import signup


def test_signup_login_logout(make_client) -> None:
    client = make_client()
    user = signup(client, "Asha@Example.test", "Asha", "India")
    assert user["email"] == "asha@example.test"
    assert client.get("/api/auth/me").json()["name"] == "Asha"

    assert client.post("/api/auth/logout").status_code == 204
    assert client.get("/api/auth/me").status_code == 401

    logged_in = client.post("/api/auth/login", json={"email": "asha@example.test", "password": "correct horse"})
    assert logged_in.status_code == 200
    assert client.get("/api/auth/me").status_code == 200


def test_session_cookie_is_http_only(make_client) -> None:
    client = make_client()
    response = client.post(
        "/api/auth/signup",
        json={"email": "a@b.test", "password": "correct horse", "name": "A", "country": "India"},
    )

    cookie = response.headers["set-cookie"].lower()
    assert "httponly" in cookie
    assert "samesite=lax" in cookie


def test_duplicate_email_is_refused(make_client) -> None:
    client = make_client()
    signup(client, "a@b.test", "A", "India")

    again = make_client().post(
        "/api/auth/signup",
        json={"email": "A@B.test", "password": "another one", "name": "B", "country": "India"},
    )

    assert again.status_code == 409


def test_weak_or_bad_signups_are_refused(make_client) -> None:
    client = make_client()

    short = client.post("/api/auth/signup", json={"email": "a@b.test", "password": "short", "name": "A", "country": "IN"})
    bad_email = client.post("/api/auth/signup", json={"email": "nope", "password": "long enough", "name": "A", "country": "IN"})

    assert short.status_code == 422
    assert bad_email.status_code == 422


def test_wrong_password_and_lockout(make_client) -> None:
    client = make_client()
    signup(client, "a@b.test", "A", "India")
    other = make_client()

    for _ in range(5):
        assert other.post("/api/auth/login", json={"email": "a@b.test", "password": "wrong"}).status_code == 401
    locked = other.post("/api/auth/login", json={"email": "a@b.test", "password": "correct horse"})

    assert locked.status_code == 429


def test_password_is_not_stored_plainly(make_client) -> None:
    from app.services.auth import hash_password, verify_password

    stored = hash_password("correct horse")

    assert "correct horse" not in stored
    assert verify_password("correct horse", stored)
    assert not verify_password("wrong", stored)


def test_requests_need_a_session(make_client) -> None:
    client: TestClient = make_client()

    assert client.get("/api/deals").status_code == 401
    assert client.post("/api/deals", json={}).status_code == 401


def test_other_sites_cannot_post(make_client) -> None:
    client = make_client()
    signup(client, "a@b.test", "A", "India")

    response = client.post("/api/auth/logout", headers={"origin": "https://evil.test"})

    assert response.status_code == 403
