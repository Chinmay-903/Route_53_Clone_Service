"""Integration tests for zone-file import/export and bulk record deletion."""

from fastapi.testclient import TestClient


def _zone_id(client: TestClient, name: str = "status-page.io.") -> str:
    """Return the identifier of a seeded zone by name."""
    zones = client.get("/api/v1/hosted-zones?limit=100").json()["items"]
    return next(zone["id"] for zone in zones if zone["name"] == name)


def _upload(client: TestClient, zone_id: str, text: str, filename: str = "example.zone"):
    """POST a zone file to the import endpoint."""
    return client.post(
        f"/api/v1/hosted-zones/{zone_id}/import",
        files={"file": (filename, text.encode("utf-8"), "text/plain")},
    )


class TestImportSecurity:
    """The import endpoint is the application's highest-risk input surface."""

    def test_include_directive_rejects_the_whole_upload(self, demo_client: TestClient) -> None:
        zone_id = _zone_id(demo_client)
        response = _upload(demo_client, zone_id, "$INCLUDE /etc/passwd\n")

        assert response.status_code == 422
        assert "$INCLUDE is not permitted" in response.json()["detail"]

    def test_binary_upload_is_rejected(self, demo_client: TestClient) -> None:
        """A gzip archive is not decodable text, so it never reaches the parser."""
        zone_id = _zone_id(demo_client)
        response = demo_client.post(
            f"/api/v1/hosted-zones/{zone_id}/import",
            files={"file": ("zone.gz", b"\x1f\x8b\x08\x00\x00\x00\x00\x00", "text/plain")},
        )
        assert response.status_code == 422
        assert "UTF-8" in response.json()["detail"]

    def test_unsupported_content_type_is_rejected(self, demo_client: TestClient) -> None:
        zone_id = _zone_id(demo_client)
        response = demo_client.post(
            f"/api/v1/hosted-zones/{zone_id}/import",
            files={"file": ("zone.zip", b"PK\x03\x04", "application/zip")},
        )
        assert response.status_code == 422

    def test_traversal_in_filename_is_rejected(self, demo_client: TestClient) -> None:
        zone_id = _zone_id(demo_client)
        response = _upload(demo_client, zone_id, "www 300 IN A 192.0.2.1\n", "../../etc/passwd")
        assert response.status_code == 422

    def test_import_requires_a_csrf_token(self, demo_client: TestClient) -> None:
        zone_id = _zone_id(demo_client)
        demo_client.headers.pop("X-CSRF-Token", None)
        response = _upload(demo_client, zone_id, "www 300 IN A 192.0.2.1\n")
        assert response.status_code == 403

    def test_other_users_zone_returns_404(self, api_client: TestClient) -> None:
        from tests.conftest import DEMO_EMAIL, DEMO_PASSWORD, create_user, sign_in

        sign_in(api_client, DEMO_EMAIL, DEMO_PASSWORD)
        zone_id = _zone_id(api_client)

        create_user(api_client, "other@acme-holdings.io", "another-valid-password")
        sign_in(api_client, "other@acme-holdings.io", "another-valid-password")

        assert _upload(api_client, zone_id, "www 300 IN A 192.0.2.1\n").status_code == 404


class TestImport:
    """Importing real zone-file content."""

    def test_creates_records_and_updates_the_count(self, demo_client: TestClient) -> None:
        zone_id = _zone_id(demo_client)
        before = demo_client.get(f"/api/v1/hosted-zones/{zone_id}").json()["record_count"]

        zone_file = (
            "$ORIGIN status-page.io.\n"
            "$TTL 600\n"
            "docs 300 IN A 198.51.100.10\n"
            "     300 IN A 198.51.100.11\n"
            "@ 3600 IN MX 10 mail.status-page.io.\n"
        )
        response = _upload(demo_client, zone_id, zone_file)

        assert response.status_code == 200
        assert response.json()["created"] == 2

        after = demo_client.get(f"/api/v1/hosted-zones/{zone_id}").json()["record_count"]
        assert after == before + 2

        records = demo_client.get(f"/api/v1/hosted-zones/{zone_id}/records?limit=100").json()
        docs = next(r for r in records["items"] if r["name"] == "docs.status-page.io.")
        assert docs["values"] == ["198.51.100.10", "198.51.100.11"]

    def test_bad_lines_are_skipped_with_reasons(self, demo_client: TestClient) -> None:
        zone_id = _zone_id(demo_client)
        zone_file = "good 300 IN A 198.51.100.20\nbad 300 IN A not-an-address\n"
        body = _upload(demo_client, zone_id, zone_file).json()

        assert body["created"] == 1
        assert len(body["skipped"]) == 1
        assert "not a valid IPv4 address" in body["skipped"][0]["reason"]

    def test_duplicate_of_an_existing_record_is_skipped(self, demo_client: TestClient) -> None:
        """status-page.io. already has an apex A record from seeding."""
        zone_id = _zone_id(demo_client)
        body = _upload(demo_client, zone_id, "@ 300 IN A 203.0.113.99\n").json()

        assert body["created"] == 0
        assert "already exists" in body["skipped"][0]["reason"]

    def test_cname_at_apex_is_skipped_not_created(self, demo_client: TestClient) -> None:
        zone_id = _zone_id(demo_client)
        body = _upload(demo_client, zone_id, "@ 300 IN CNAME elsewhere.test.\n").json()

        assert body["created"] == 0
        assert "apex" in body["skipped"][0]["reason"]


class TestExport:
    """Both export formats."""

    def test_bind_export_is_a_downloadable_zone_file(self, demo_client: TestClient) -> None:
        zone_id = _zone_id(demo_client)
        response = demo_client.get(f"/api/v1/hosted-zones/{zone_id}/export?format=bind")

        assert response.status_code == 200
        assert "attachment" in response.headers["content-disposition"]
        assert "status-page.io.zone" in response.headers["content-disposition"]
        assert "$ORIGIN status-page.io." in response.text
        assert "IN\tSOA" in response.text

    def test_json_export_carries_the_zone_and_its_records(self, demo_client: TestClient) -> None:
        zone_id = _zone_id(demo_client)
        response = demo_client.get(f"/api/v1/hosted-zones/{zone_id}/export?format=json")

        assert response.status_code == 200
        body = response.json()
        assert body["hosted_zone"]["name"] == "status-page.io."
        assert any(record["type"] == "SOA" for record in body["records"])
        assert all("values" in record for record in body["records"])

    def test_export_defaults_to_bind(self, demo_client: TestClient) -> None:
        zone_id = _zone_id(demo_client)
        response = demo_client.get(f"/api/v1/hosted-zones/{zone_id}/export")
        assert "$ORIGIN" in response.text

    def test_exported_zone_can_be_imported_into_another_zone(self, demo_client: TestClient) -> None:
        """The round trip proves the serialiser and parser agree."""
        source = _zone_id(demo_client)
        exported = demo_client.get(f"/api/v1/hosted-zones/{source}/export").text

        target = demo_client.post("/api/v1/hosted-zones", json={"name": "roundtrip.test"}).json()[
            "id"
        ]
        # Rewritten so the records land inside the destination zone.
        rehomed = exported.replace("status-page.io.", "roundtrip.test.")

        body = _upload(demo_client, target, rehomed).json()
        assert body["created"] >= 1


class TestBulkDelete:
    """Deleting several records at once."""

    def test_deletes_many_and_updates_the_count(self, demo_client: TestClient) -> None:
        zone_id = _zone_id(demo_client)
        created = []
        for index in range(3):
            response = demo_client.post(
                f"/api/v1/hosted-zones/{zone_id}/records",
                json={"type": "A", "name": f"bulk{index}", "values": [f"198.51.100.{index + 1}"]},
            )
            created.append(response.json()["id"])

        before = demo_client.get(f"/api/v1/hosted-zones/{zone_id}").json()["record_count"]
        response = demo_client.post(
            f"/api/v1/hosted-zones/{zone_id}/records/bulk-delete",
            json={"record_ids": created},
        )

        assert response.status_code == 200
        assert response.json() == {"deleted": 3, "refused": []}

        after = demo_client.get(f"/api/v1/hosted-zones/{zone_id}").json()["record_count"]
        assert after == before - 3

    def test_system_records_are_refused_but_the_rest_still_delete(
        self, demo_client: TestClient
    ) -> None:
        zone_id = _zone_id(demo_client)
        deletable = demo_client.post(
            f"/api/v1/hosted-zones/{zone_id}/records",
            json={"type": "A", "name": "keepable", "values": ["198.51.100.77"]},
        ).json()["id"]

        records = demo_client.get(f"/api/v1/hosted-zones/{zone_id}/records?limit=100").json()
        soa = next(r for r in records["items"] if r["type"] == "SOA")["id"]

        body = demo_client.post(
            f"/api/v1/hosted-zones/{zone_id}/records/bulk-delete",
            json={"record_ids": [deletable, soa]},
        ).json()

        assert body["deleted"] == 1
        assert body["refused"] == [soa]

    def test_batch_size_is_capped(self, demo_client: TestClient) -> None:
        zone_id = _zone_id(demo_client)
        response = demo_client.post(
            f"/api/v1/hosted-zones/{zone_id}/records/bulk-delete",
            json={"record_ids": [f"R{n}" for n in range(101)]},
        )
        assert response.status_code == 422
