"""Idempotent demo data.

Runs on every boot and is safe to run repeatedly: it creates the demo account
and its zones only when they are absent. That matters because the deployment
seeds on start, so a redeploy must not duplicate or destroy anything.
"""

from typing import TypedDict

import structlog

# Imported as a module, not by name: the tests rebind `database.engine` to a
# temporary file, and a from-import would capture the original at import time.
from app.core import database
from app.core.config import get_settings
from app.core.security import hash_password
from app.domain.errors import ConflictError
from app.models.base import Base
from app.repositories.sqlalchemy.dns import (
    SqlAlchemyHostedZoneRepository,
    SqlAlchemyRecordSetRepository,
)
from app.repositories.sqlalchemy.identity import SqlAlchemyUserRepository
from app.services.hosted_zone_service import HostedZoneService
from app.services.record_service import RecordService

logger = structlog.get_logger(__name__)


class _RecordSpec(TypedDict):
    """One seeded record set."""

    name: str
    type: str
    ttl: int
    values: list[str]


class _ZoneSpec(TypedDict):
    """One seeded hosted zone and the records created inside it."""

    name: str
    comment: str
    records: list[_RecordSpec]


# Realistic rather than lorem-ipsum: a reviewer should see a console that looks
# like somebody's actual account, spread across every record type.
_DEMO_ZONES: list[_ZoneSpec] = [
    {
        "name": "example.com",
        "comment": "Primary marketing site",
        "records": [
            {"name": "@", "type": "A", "ttl": 300, "values": ["192.0.2.10", "192.0.2.11"]},
            {"name": "www", "type": "CNAME", "ttl": 300, "values": ["example.com."]},
            {"name": "@", "type": "MX", "ttl": 3600, "values": ["10 inbound.example.com."]},
            {"name": "@", "type": "TXT", "ttl": 300, "values": ['"v=spf1 mx -all"']},
            {"name": "@", "type": "CAA", "ttl": 300, "values": ['0 issue "letsencrypt.org"']},
        ],
    },
    {
        "name": "api.internal.dev",
        "comment": "Internal service discovery",
        "records": [
            {"name": "gateway", "type": "A", "ttl": 60, "values": ["198.51.100.5"]},
            {"name": "gateway", "type": "AAAA", "ttl": 60, "values": ["2001:db8:1::5"]},
            {
                "name": "_sip._tcp",
                "type": "SRV",
                "ttl": 300,
                "values": ["10 60 5060 gateway.api.internal.dev."],
            },
        ],
    },
    {
        "name": "status-page.io",
        "comment": "Public status and incident history",
        "records": [
            {"name": "@", "type": "A", "ttl": 60, "values": ["203.0.113.42"]},
            {"name": "cdn", "type": "CNAME", "ttl": 86400, "values": ["edge.status-page.io."]},
        ],
    },
]


def seed_database() -> None:
    """Create the schema if absent, then ensure the demo account and its zones."""
    # create_all covers a fresh volume where no migration has ever run. Alembic
    # remains the mechanism for schema *changes*; this only bootstraps.
    Base.metadata.create_all(bind=database.engine)

    settings = get_settings()
    with database.SessionLocal() as session:
        users = SqlAlchemyUserRepository(session)
        user = users.get_by_email(settings.demo_user_email)
        if user is None:
            user = users.create(
                settings.demo_user_email, hash_password(settings.demo_user_password)
            )
            session.commit()
            logger.info("seed_user_created", email=settings.demo_user_email)

        zone_service = HostedZoneService(
            session,
            SqlAlchemyHostedZoneRepository(session),
            SqlAlchemyRecordSetRepository(session),
        )
        record_service = RecordService(
            session, SqlAlchemyRecordSetRepository(session), zone_service
        )
        for spec in _DEMO_ZONES:
            _ensure_zone(zone_service, record_service, user.id, spec)


def _ensure_zone(
    zones: HostedZoneService,
    records: RecordService,
    user_id: int,
    spec: _ZoneSpec,
) -> None:
    """Create one demo zone and its records if the zone does not already exist."""
    try:
        zone = zones.create_zone(
            user_id, name=spec["name"], comment=spec["comment"], zone_type="Public"
        )
    except ConflictError:
        # Already seeded on an earlier boot. Nothing to do.
        return

    for record in spec["records"]:
        records.create_record(
            zone.public_id,
            user_id,
            name=record["name"],
            record_type=record["type"],
            ttl=record["ttl"],
            values=record["values"],
            routing_policy="Simple",
            set_identifier=None,
        )
    logger.info("seed_zone_created", zone=spec["name"])
