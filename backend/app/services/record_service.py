"""Business rules for record sets.

The rules that make this a DNS manager rather than a table editor live here,
because each depends on what the zone already contains and so cannot be checked
by a per-request schema:

* a record set is unique on (zone, name, type, set identifier);
* a CNAME cannot coexist with any other record set at the same name;
* a CNAME cannot sit at the zone apex, where SOA and NS must live;
* generated SOA and apex NS records cannot be edited or deleted.
"""

from sqlalchemy.orm import Session

from app.core.identifiers import new_record_id
from app.domain.dns_rules import validate_ttl, validate_values
from app.domain.errors import ConflictError, ImmutableRecordError, NotFoundError, ValidationError
from app.domain.names import is_apex, is_within_zone, normalize_name
from app.models.base import utc_now_iso
from app.models.dns import HostedZone, RecordSet, RecordValue
from app.repositories.protocols import (
    RecordSetRepository,
    RecordSortField,
    SortOrder,
)
from app.services.hosted_zone_service import HostedZoneService


class RecordService:
    """Creates, reads, updates, and deletes record sets within a user's zone."""

    def __init__(
        self,
        session: Session,
        records: RecordSetRepository,
        zones: HostedZoneService,
    ) -> None:
        """Take the request session plus the record repository and zone service."""
        self._session = session
        self._records = records
        self._zones = zones

    def list_records(
        self,
        zone_public_id: str,
        user_id: int,
        *,
        search: str | None,
        record_type: str | None,
        sort: RecordSortField,
        order: SortOrder,
        limit: int,
        offset: int,
    ) -> tuple[list[RecordSet], int]:
        """Return one page of a zone's record sets and the total count."""
        zone = self._zones.get_zone(zone_public_id, user_id)
        return self._records.list_for_zone(
            zone.id,
            search=search,
            record_type=record_type,
            sort=sort,
            order=order,
            limit=limit,
            offset=offset,
        )

    def get_record(self, zone_public_id: str, record_id: str, user_id: int) -> RecordSet:
        """Return one record set, or raise `NotFoundError`."""
        zone = self._zones.get_zone(zone_public_id, user_id)
        record = self._records.get_by_public_id(record_id, zone.id)
        if record is None:
            raise NotFoundError(f"No record with ID '{record_id}' in this hosted zone.")
        return record

    def create_record(
        self,
        zone_public_id: str,
        user_id: int,
        *,
        name: str,
        record_type: str,
        ttl: int,
        values: list[str],
        routing_policy: str,
        set_identifier: str | None,
    ) -> RecordSet:
        """Validate and persist a new record set."""
        zone = self._zones.get_zone(zone_public_id, user_id)
        qualified = self._qualify(name, zone)
        clean_values = validate_values(record_type, values)
        validate_ttl(ttl)

        self._reject_duplicate(zone, qualified, record_type, set_identifier)
        self._reject_cname_conflicts(zone, qualified, record_type)

        record = self._records.add(
            RecordSet(
                public_id=new_record_id(),
                hosted_zone_id=zone.id,
                name=qualified,
                type=record_type,
                ttl=ttl,
                routing_policy=routing_policy,
                set_identifier=set_identifier,
                values=[
                    RecordValue(value=value, sort_order=index)
                    for index, value in enumerate(clean_values)
                ],
            )
        )
        zone.record_count = self._records.count_for_zone(zone.id)
        self._session.commit()
        return record

    def replace_record(
        self,
        zone_public_id: str,
        record_id: str,
        user_id: int,
        *,
        name: str,
        record_type: str,
        ttl: int,
        values: list[str],
        routing_policy: str,
        set_identifier: str | None,
    ) -> RecordSet:
        """Replace a record set's contents in place."""
        zone = self._zones.get_zone(zone_public_id, user_id)
        record = self.get_record(zone_public_id, record_id, user_id)
        _reject_system_record(record, "edited")

        qualified = self._qualify(name, zone)
        clean_values = validate_values(record_type, values)
        validate_ttl(ttl)

        self._reject_duplicate(zone, qualified, record_type, set_identifier, exclude=record.id)
        self._reject_cname_conflicts(zone, qualified, record_type, exclude=record.id)

        record.name = qualified
        record.type = record_type
        record.ttl = ttl
        record.routing_policy = routing_policy
        record.set_identifier = set_identifier
        record.updated_at = utc_now_iso()
        # Replacing the list lets the orphan cascade delete the old rows, so
        # values never accumulate across edits.
        record.values = [
            RecordValue(value=value, sort_order=index) for index, value in enumerate(clean_values)
        ]
        self._session.commit()
        return record

    def delete_record(self, zone_public_id: str, record_id: str, user_id: int) -> None:
        """Delete a record set unless it is one the zone generated."""
        zone = self._zones.get_zone(zone_public_id, user_id)
        record = self.get_record(zone_public_id, record_id, user_id)
        _reject_system_record(record, "deleted")

        self._records.delete(record)
        self._session.flush()
        zone.record_count = self._records.count_for_zone(zone.id)
        self._session.commit()

    def delete_records(
        self, zone_public_id: str, record_ids: list[str], user_id: int
    ) -> tuple[int, list[str]]:
        """Delete several record sets in one transaction.

        Returns the number deleted and the identifiers that were refused, so a
        bulk selection containing a generated SOA or NS record removes the rest
        rather than failing wholesale.
        """
        zone = self._zones.get_zone(zone_public_id, user_id)
        refused: list[str] = []
        deleted = 0

        for record_id in record_ids:
            record = self._records.get_by_public_id(record_id, zone.id)
            if record is None or record.is_system:
                refused.append(record_id)
                continue
            self._records.delete(record)
            deleted += 1

        self._session.flush()
        zone.record_count = self._records.count_for_zone(zone.id)
        self._session.commit()
        return deleted, refused

    def _qualify(self, name: str, zone: HostedZone) -> str:
        """Resolve a console-style relative name against the zone.

        The console shows the zone suffix beside the name field and accepts
        "www", "@", or the full "www.example.com." — all three land here.
        """
        trimmed = name.strip()
        if trimmed in {"", "@", zone.name.rstrip(".")}:
            return zone.name

        candidate = normalize_name(trimmed)
        if not is_within_zone(candidate, zone.name):
            # Treat it as relative: "www" becomes "www.example.com.".
            candidate = normalize_name(f"{trimmed.rstrip('.')}.{zone.name}")
        if not is_within_zone(candidate, zone.name):
            raise ValidationError(f"'{name}' is not inside the zone '{zone.name}'.")
        return candidate

    def _reject_duplicate(
        self,
        zone: HostedZone,
        name: str,
        record_type: str,
        set_identifier: str | None,
        *,
        exclude: int | None = None,
    ) -> None:
        """Enforce uniqueness on (zone, name, type, set identifier).

        The database enforces this too, but SQLite treats NULLs as distinct in a
        unique index, so simple-routing duplicates would slip past the
        constraint. This check closes that gap and produces a useful message.
        """
        existing = self._records.find_matching(zone.id, name, record_type, set_identifier)
        if existing is not None and existing.id != exclude:
            raise ConflictError(
                f"A record set of type {record_type} named '{name}' already exists in this zone."
            )

    def _reject_cname_conflicts(
        self,
        zone: HostedZone,
        name: str,
        record_type: str,
        *,
        exclude: int | None = None,
    ) -> None:
        """Apply the CNAME coexistence and apex rules in both directions."""
        siblings = [r for r in self._records.list_at_name(zone.id, name) if r.id != exclude]

        if record_type == "CNAME":
            if is_apex(name, zone.name):
                raise ConflictError(
                    "A CNAME cannot be created at the zone apex, because the zone's SOA and "
                    "NS records must exist there and a CNAME forbids any other record at its "
                    "name."
                )
            if siblings:
                kinds = ", ".join(sorted({r.type for r in siblings}))
                raise ConflictError(
                    f"'{name}' already has {kinds} record(s). A CNAME cannot coexist with any "
                    "other record at the same name."
                )
            return

        if any(sibling.type == "CNAME" for sibling in siblings):
            raise ConflictError(
                f"'{name}' already has a CNAME record, which cannot coexist with a "
                f"{record_type} record at the same name."
            )


def _reject_system_record(record: RecordSet, action: str) -> None:
    """Block edits and deletes of the SOA and apex NS records.

    These are generated with the zone and removing them would leave it
    unresolvable, so the console shows them but disables their actions.
    """
    if record.is_system:
        raise ImmutableRecordError(f"The zone's generated {record.type} record cannot be {action}.")
