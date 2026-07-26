"""Import and export of a zone's records as BIND or JSON.

Import is deliberately non-atomic per record: a file with one bad line still
imports the other ninety-nine, and reports what it skipped. Rejecting the whole
upload because of a single typo would be worse for the user and no safer.
"""

from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.core.identifiers import new_record_id
from app.domain.errors import ConflictError, ValidationError
from app.domain.zone_file import (
    ParsedRecord,
    SkippedLine,
    parse_zone_file,
    serialize_zone_file,
)
from app.models.dns import HostedZone, RecordSet, RecordValue
from app.repositories.protocols import RecordSetRepository, RecordSortField, SortOrder
from app.services.hosted_zone_service import HostedZoneService

# A zone with more record sets than this is beyond what this console manages,
# and the number bounds how much one export request can assemble in memory.
EXPORT_RECORD_LIMIT = 10_000


@dataclass
class ImportSummary:
    """What an import did, reported back to the console."""

    created: int
    skipped: list[SkippedLine]


class ZoneFileService:
    """Turns uploaded zone files into records, and records back into files."""

    def __init__(
        self,
        session: Session,
        records: RecordSetRepository,
        zones: HostedZoneService,
    ) -> None:
        """Take the request session, the record repository, and the zone service."""
        self._session = session
        self._records = records
        self._zones = zones

    def import_records(self, zone_public_id: str, user_id: int, text: str) -> ImportSummary:
        """Parse a BIND file and create every record it defines that is new.

        Records that collide with an existing set, or that break a DNS rule such
        as CNAME coexistence, are skipped and reported rather than raised.
        """
        zone = self._zones.get_zone(zone_public_id, user_id)
        result = parse_zone_file(text, origin=zone.name)

        created = 0
        skipped = list(result.skipped)

        for parsed in result.records:
            try:
                self._create_one(zone.id, zone.name, parsed)
                created += 1
            except (ValidationError, ConflictError) as exc:
                skipped.append(
                    SkippedLine(
                        line_number=0,
                        text=f"{parsed.name} {parsed.type}",
                        reason=exc.message,
                    )
                )

        zone.record_count = self._records.count_for_zone(zone.id)
        self._session.commit()
        return ImportSummary(created=created, skipped=skipped)

    def _create_one(self, zone_id: int, zone_name: str, parsed: ParsedRecord) -> None:
        """Persist one parsed record set, refusing anything the zone forbids."""
        if self._records.find_matching(zone_id, parsed.name, parsed.type, None) is not None:
            raise ConflictError("A record set with this name and type already exists.")

        siblings = self._records.list_at_name(zone_id, parsed.name)
        if parsed.type == "CNAME":
            if parsed.name == zone_name:
                raise ConflictError("A CNAME cannot be created at the zone apex.")
            if siblings:
                raise ConflictError("A CNAME cannot coexist with another record at its name.")
        elif any(sibling.type == "CNAME" for sibling in siblings):
            raise ConflictError("A CNAME already exists at this name.")

        self._records.add(
            RecordSet(
                public_id=new_record_id(),
                hosted_zone_id=zone_id,
                name=parsed.name,
                type=parsed.type,
                ttl=parsed.ttl,
                values=[
                    RecordValue(value=value, sort_order=index)
                    for index, value in enumerate(parsed.values)
                ],
            )
        )
        # Flushed per record so the next iteration's uniqueness check sees it.
        self._session.flush()

    def export_bind(self, zone_public_id: str, user_id: int) -> tuple[str, str]:
        """Return the zone as BIND master-file text, with a filename."""
        zone, records = self._load_all(zone_public_id, user_id)
        text = serialize_zone_file(
            zone.name,
            [
                ParsedRecord(
                    name=record.name,
                    type=record.type,
                    ttl=record.ttl,
                    values=[value.value for value in record.values],
                )
                for record in records
            ],
        )
        return text, f"{zone.name.rstrip('.')}.zone"

    def export_json(self, zone_public_id: str, user_id: int) -> tuple[dict[str, object], str]:
        """Return the zone and its records as a JSON-serialisable document."""
        zone, records = self._load_all(zone_public_id, user_id)
        document: dict[str, object] = {
            "hosted_zone": {
                "id": zone.public_id,
                "name": zone.name,
                "type": zone.type,
                "comment": zone.comment,
                "record_count": zone.record_count,
            },
            "records": [
                {
                    "name": record.name,
                    "type": record.type,
                    "ttl": record.ttl,
                    "routing_policy": record.routing_policy,
                    "set_identifier": record.set_identifier,
                    "values": [value.value for value in record.values],
                    "is_system": bool(record.is_system),
                }
                for record in records
            ],
        }
        return document, f"{zone.name.rstrip('.')}.json"

    def _load_all(self, zone_public_id: str, user_id: int) -> tuple[HostedZone, list[RecordSet]]:
        """Fetch the owner's zone and every record in it."""
        zone = self._zones.get_zone(zone_public_id, user_id)
        records, _ = self._records.list_for_zone(
            zone.id,
            search=None,
            record_type=None,
            sort=RecordSortField.NAME,
            order=SortOrder.ASC,
            # Export covers the whole zone by definition, so the page size is
            # the export cap rather than the console's page size.
            limit=EXPORT_RECORD_LIMIT,
            offset=0,
        )
        return zone, records
