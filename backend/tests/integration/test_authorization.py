"""Cross-user authorization tests.

Broken object-level authorization is the likeliest real vulnerability in an
application shaped like this one, so it gets a dedicated test module. The key
assertion is that user B receives 404 — not 403 — for user A's resources: a 403
would confirm the identifier is real, which is itself a disclosure.

Referenced from docs/SECURITY.md.
"""

from fastapi.testclient import TestClient

from tests.conftest import DEMO_EMAIL, DEMO_PASSWORD, create_user, sign_in

# A plain domain: email-validator rejects the reserved .test and .example TLDs.
OTHER_EMAIL = "intruder@acme-holdings.io"
OTHER_PASSWORD = "another-valid-password"


def _first_zone_and_record(client: TestClient) -> tuple[str, str]:
    """Return a seeded zone identifier and one of its record identifiers."""
    zones = client.get("/api/v1/hosted-zones").json()["items"]
    zone_id = zones[0]["id"]
    records = client.get(f"/api/v1/hosted-zones/{zone_id}/records").json()["items"]
    return zone_id, records[0]["id"]


def test_other_user_gets_404_for_a_zone_they_do_not_own(api_client: TestClient) -> None:
    """A zone belonging to someone else is indistinguishable from a missing one."""
    sign_in(api_client, DEMO_EMAIL, DEMO_PASSWORD)
    zone_id, _ = _first_zone_and_record(api_client)

    create_user(api_client, OTHER_EMAIL, OTHER_PASSWORD)
    sign_in(api_client, OTHER_EMAIL, OTHER_PASSWORD)

    response = api_client.get(f"/api/v1/hosted-zones/{zone_id}")
    assert response.status_code == 404
    assert response.headers["content-type"].startswith("application/problem+json")


def test_other_user_gets_404_for_a_record_they_do_not_own(api_client: TestClient) -> None:
    """Records are unreachable without first proving ownership of their zone."""
    sign_in(api_client, DEMO_EMAIL, DEMO_PASSWORD)
    zone_id, record_id = _first_zone_and_record(api_client)

    create_user(api_client, OTHER_EMAIL, OTHER_PASSWORD)
    sign_in(api_client, OTHER_EMAIL, OTHER_PASSWORD)

    response = api_client.get(f"/api/v1/hosted-zones/{zone_id}/records/{record_id}")
    assert response.status_code == 404


def test_other_user_cannot_delete_another_users_zone(api_client: TestClient) -> None:
    """A write against someone else's zone fails the same way a read does."""
    sign_in(api_client, DEMO_EMAIL, DEMO_PASSWORD)
    zone_id, _ = _first_zone_and_record(api_client)

    create_user(api_client, OTHER_EMAIL, OTHER_PASSWORD)
    sign_in(api_client, OTHER_EMAIL, OTHER_PASSWORD)

    assert api_client.delete(f"/api/v1/hosted-zones/{zone_id}").status_code == 404

    # And the zone is untouched when its owner looks again.
    sign_in(api_client, DEMO_EMAIL, DEMO_PASSWORD)
    assert api_client.get(f"/api/v1/hosted-zones/{zone_id}").status_code == 200


def test_listing_shows_only_your_own_zones(api_client: TestClient) -> None:
    """A second account starts empty rather than seeing the demo user's data."""
    create_user(api_client, OTHER_EMAIL, OTHER_PASSWORD)
    sign_in(api_client, OTHER_EMAIL, OTHER_PASSWORD)

    body = api_client.get("/api/v1/hosted-zones").json()
    assert body["total"] == 0
    assert body["items"] == []


def test_unauthenticated_requests_are_rejected(api_client: TestClient) -> None:
    """Every resource endpoint requires a session."""
    for method, path in [
        ("get", "/api/v1/hosted-zones"),
        ("get", "/api/v1/auth/me"),
        ("post", "/api/v1/hosted-zones"),
    ]:
        response = getattr(api_client, method)(path)
        assert response.status_code == 401, f"{method} {path} returned {response.status_code}"


def test_login_does_not_reveal_whether_an_address_exists(api_client: TestClient) -> None:
    """A wrong password and an unknown address produce the same response."""
    unknown = api_client.post(
        "/api/v1/auth/login",
        json={"email": "nobody@acme-holdings.io", "password": "wrong-password"},
    )
    wrong_password = api_client.post(
        "/api/v1/auth/login", json={"email": DEMO_EMAIL, "password": "wrong-password"}
    )
    assert unknown.status_code == wrong_password.status_code == 401
    assert unknown.json()["detail"] == wrong_password.json()["detail"]
