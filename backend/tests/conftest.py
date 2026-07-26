"""Shared test fixtures.

Integration tests run against a real temporary SQLite file rather than an
in-memory database, so WAL journal mode and the foreign-key pragma are genuinely
exercised — an in-memory database would prove neither.
"""

import os
from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

DEMO_EMAIL = "demo@route53clone.dev"
DEMO_PASSWORD = "test-demo-password"

# Settings are read at import time, so the environment must be populated before
# anything under `app` is imported by a fixture.
os.environ.update(
    ENVIRONMENT="development",
    SESSION_SECRET="test-secret-value-at-least-32-characters-long",
    DEMO_USER_EMAIL=DEMO_EMAIL,
    DEMO_USER_PASSWORD=DEMO_PASSWORD,
    CORS_ORIGINS="http://localhost:3000",
    # slowapi's counters are process-wide and every test signs in, so the
    # production limit would exhaust part-way through the suite. The limit
    # itself is exercised by test_login_rate_limit.py, which runs its own app.
    LOGIN_RATE_LIMIT="1000/minute",
)


@pytest.fixture
def api_client(tmp_path: Path) -> Iterator[TestClient]:
    """Yield a client bound to a fresh database, seeded with the demo account."""
    _rebind_engine(tmp_path / "test.db")

    from app.main import create_app

    with TestClient(create_app()) as client:
        yield client


@pytest.fixture
def demo_client(api_client: TestClient) -> TestClient:
    """Yield a client already signed in as the seeded demo user."""
    sign_in(api_client, DEMO_EMAIL, DEMO_PASSWORD)
    return api_client


def sign_in(client: TestClient, email: str, password: str) -> str:
    """Log in, store the session cookie on the client, and return the CSRF token."""
    response = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, response.text
    token: str = response.json()["csrf_token"]
    client.headers["X-CSRF-Token"] = token
    return token


def create_user(client: TestClient, email: str, password: str) -> None:
    """Register a second account directly, since there is no signup endpoint.

    Multi-user tests need one; the application deliberately exposes no public
    registration, so the test reaches past the API to create it.
    """
    from app.core.database import SessionLocal
    from app.core.security import hash_password
    from app.repositories.sqlalchemy.identity import SqlAlchemyUserRepository

    with SessionLocal() as session:
        SqlAlchemyUserRepository(session).create(email, hash_password(password))
        session.commit()


def _rebind_engine(database_path: Path) -> None:
    """Point the application's engine at a throwaway database file."""
    from app.core import database
    from app.core.config import get_settings

    os.environ["DATABASE_URL"] = f"sqlite:///{database_path.as_posix()}"
    get_settings.cache_clear()

    database.engine.dispose()
    database.engine = database.build_engine()
    database.SessionLocal.configure(bind=database.engine)
