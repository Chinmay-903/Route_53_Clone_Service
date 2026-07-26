"""Integration tests for the zone and record lifecycle.

These exercise the full request-to-database path, so they also prove the
schema-level constraints and the foreign-key pragma are doing their jobs.
"""

from fastapi.testclient import TestClient


def _zone_id(client: TestClient, name: str = "example.com.") -> str:
    """Return the identifier of a seeded zone by name."""
    zones = client.get("/api/v1/hosted-zones?limit=100").json()["items"]
    return next(zone["id"] for zone in zones if zone["name"] == name)


class TestZoneCreation:
    """Zone creation and its generated records."""

    def test_creates_soa_and_apex_ns_records(self, demo_client: TestClient) -> None:
        response = demo_client.post(
            "/api/v1/hosted-zones", json={"name": "newzone.test", "type": "Public"}
        )
        assert response.status_code == 201
        zone = response.json()
        assert zone["name"] == "newzone.test."
        assert zone["record_count"] == 2

        records = demo_client.get(f"/api/v1/hosted-zones/{zone['id']}/records").json()["items"]
        by_type = {record["type"]: record for record in records}
        assert set(by_type) == {"SOA", "NS"}
        assert all(record["is_system"] for record in records)
        # Route 53 delegates a new public zone to four name servers.
        assert len(by_type["NS"]["values"]) == 4
        assert by_type["NS"]["name"] == "newzone.test."

    def test_rejects_a_duplicate_zone_name(self, demo_client: TestClient) -> None:
        demo_client.post("/api/v1/hosted-zones", json={"name": "dup.test"})
        second = demo_client.post("/api/v1/hosted-zones", json={"name": "DUP.test"})
        assert second.status_code == 409

    def test_rejects_an_invalid_domain_name(self, demo_client: TestClient) -> None:
        response = demo_client.post("/api/v1/hosted-zones", json={"name": "-bad-.test"})
        assert response.status_code == 422


class TestSystemRecordImmutability:
    """The generated SOA and apex NS records resist every write."""

    def test_system_records_cannot_be_deleted(self, demo_client: TestClient) -> None:
        zone_id = _zone_id(demo_client)
        records = demo_client.get(f"/api/v1/hosted-zones/{zone_id}/records?limit=100").json()
        soa = next(r for r in records["items"] if r["type"] == "SOA")

        response = demo_client.delete(f"/api/v1/hosted-zones/{zone_id}/records/{soa['id']}")
        assert response.status_code == 409
        assert "cannot be deleted" in response.json()["detail"]

    def test_system_records_cannot_be_edited(self, demo_client: TestClient) -> None:
        zone_id = _zone_id(demo_client)
        records = demo_client.get(f"/api/v1/hosted-zones/{zone_id}/records?limit=100").json()
        ns = next(r for r in records["items"] if r["type"] == "NS")

        response = demo_client.put(
            f"/api/v1/hosted-zones/{zone_id}/records/{ns['id']}",
            json={"type": "NS", "name": "@", "values": ["ns9.example.com."], "ttl": 300},
        )
        assert response.status_code == 409


class TestCnameRules:
    """The two rules that make CNAME special."""

    def test_cname_is_rejected_at_the_zone_apex(self, demo_client: TestClient) -> None:
        zone_id = _zone_id(demo_client)
        response = demo_client.post(
            f"/api/v1/hosted-zones/{zone_id}/records",
            json={"type": "CNAME", "name": "@", "values": ["elsewhere.test."]},
        )
        assert response.status_code == 409
        assert "apex" in response.json()["detail"]

    def test_cname_cannot_be_added_beside_an_existing_record(self, demo_client: TestClient) -> None:
        zone_id = _zone_id(demo_client)
        demo_client.post(
            f"/api/v1/hosted-zones/{zone_id}/records",
            json={"type": "A", "name": "shared", "values": ["192.0.2.1"]},
        )
        response = demo_client.post(
            f"/api/v1/hosted-zones/{zone_id}/records",
            json={"type": "CNAME", "name": "shared", "values": ["target.test."]},
        )
        assert response.status_code == 409

    def test_record_cannot_be_added_beside_an_existing_cname(self, demo_client: TestClient) -> None:
        """The coexistence rule holds in both directions."""
        zone_id = _zone_id(demo_client)
        response = demo_client.post(
            f"/api/v1/hosted-zones/{zone_id}/records",
            json={"type": "A", "name": "www", "values": ["192.0.2.1"]},
        )
        assert response.status_code == 409


class TestRecordLifecycle:
    """Create, replace, and delete, with the zone's record count tracking along."""

    def test_full_lifecycle_maintains_the_record_count(self, demo_client: TestClient) -> None:
        zone_id = _zone_id(demo_client, "status-page.io.")
        before = demo_client.get(f"/api/v1/hosted-zones/{zone_id}").json()["record_count"]

        created = demo_client.post(
            f"/api/v1/hosted-zones/{zone_id}/records",
            json={"type": "A", "name": "app", "values": ["192.0.2.20"], "ttl": 60},
        )
        assert created.status_code == 201
        record = created.json()
        assert record["name"] == "app.status-page.io."

        after_create = demo_client.get(f"/api/v1/hosted-zones/{zone_id}").json()["record_count"]
        assert after_create == before + 1

        replaced = demo_client.put(
            f"/api/v1/hosted-zones/{zone_id}/records/{record['id']}",
            json={
                "type": "A",
                "name": "app",
                "values": ["192.0.2.21", "192.0.2.22"],
                "ttl": 120,
            },
        )
        assert replaced.status_code == 200
        assert replaced.json()["values"] == ["192.0.2.21", "192.0.2.22"]
        assert replaced.json()["ttl"] == 120

        assert (
            demo_client.delete(f"/api/v1/hosted-zones/{zone_id}/records/{record['id']}").status_code
            == 204
        )
        after_delete = demo_client.get(f"/api/v1/hosted-zones/{zone_id}").json()["record_count"]
        assert after_delete == before

    def test_duplicate_record_set_is_rejected(self, demo_client: TestClient) -> None:
        zone_id = _zone_id(demo_client)
        body = {"type": "A", "name": "dupe", "values": ["192.0.2.30"]}
        path = f"/api/v1/hosted-zones/{zone_id}/records"
        assert demo_client.post(path, json=body).status_code == 201
        assert demo_client.post(path, json=body).status_code == 409

    def test_relative_names_are_qualified_against_the_zone(self, demo_client: TestClient) -> None:
        # This zone has no seeded TXT records, so each name below is free.
        zone_id = _zone_id(demo_client, "status-page.io.")
        for supplied, expected in [
            ("api", "api.status-page.io."),
            ("@", "status-page.io."),
            ("deep.api", "deep.api.status-page.io."),
        ]:
            response = demo_client.post(
                f"/api/v1/hosted-zones/{zone_id}/records",
                json={"type": "TXT", "name": supplied, "values": [f'"{supplied}"']},
            )
            assert response.status_code == 201, response.text
            assert response.json()["name"] == expected


class TestZoneDeletion:
    """A zone may only be deleted once its own records are gone."""

    def test_zone_with_records_cannot_be_deleted(self, demo_client: TestClient) -> None:
        zone_id = _zone_id(demo_client)
        response = demo_client.delete(f"/api/v1/hosted-zones/{zone_id}")
        assert response.status_code == 409

    def test_zone_with_only_system_records_can_be_deleted(self, demo_client: TestClient) -> None:
        created = demo_client.post("/api/v1/hosted-zones", json={"name": "empty.test"}).json()
        assert demo_client.delete(f"/api/v1/hosted-zones/{created['id']}").status_code == 204
        assert demo_client.get(f"/api/v1/hosted-zones/{created['id']}").status_code == 404

    def test_deleting_a_zone_cascades_to_its_records(self, demo_client: TestClient) -> None:
        """Proves PRAGMA foreign_keys=ON is actually in force.

        Without the pragma SQLite accepts the parent delete and silently leaves
        orphaned child rows behind.
        """
        from sqlalchemy import func, select

        from app.core.database import SessionLocal
        from app.models.dns import RecordSet

        created = demo_client.post("/api/v1/hosted-zones", json={"name": "cascade.test"}).json()
        demo_client.delete(f"/api/v1/hosted-zones/{created['id']}")

        with SessionLocal() as session:
            orphans = session.scalar(
                select(func.count()).select_from(RecordSet).where(RecordSet.name == "cascade.test.")
            )
        assert orphans == 0


class TestListingAndFiltering:
    """Query parameters backing the console's table controls."""

    def test_search_filters_by_name(self, demo_client: TestClient) -> None:
        body = demo_client.get("/api/v1/hosted-zones?search=status").json()
        assert body["total"] == 1
        assert body["items"][0]["name"] == "status-page.io."

    def test_pagination_reports_a_next_token(self, demo_client: TestClient) -> None:
        body = demo_client.get("/api/v1/hosted-zones?limit=2&offset=0").json()
        assert len(body["items"]) == 2
        assert body["total"] == 3
        assert body["next_token"] == "2"

        last = demo_client.get("/api/v1/hosted-zones?limit=2&offset=2").json()
        assert last["next_token"] is None

    def test_record_type_filter(self, demo_client: TestClient) -> None:
        zone_id = _zone_id(demo_client)
        body = demo_client.get(f"/api/v1/hosted-zones/{zone_id}/records?type=MX").json()
        assert body["total"] == 1
        assert body["items"][0]["type"] == "MX"

    def test_unknown_sort_column_is_rejected(self, demo_client: TestClient) -> None:
        """Sort values are an allowlist, so nothing arbitrary reaches ORDER BY."""
        response = demo_client.get("/api/v1/hosted-zones?sort=password_hash")
        assert response.status_code == 422
