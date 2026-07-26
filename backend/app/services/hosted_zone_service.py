"""Business rules for hosted zones.

Depends only on repository protocols, so these rules can be unit-tested against
in-memory fakes. Raises domain exceptions and never HTTP concerns.
"""

from sqlalchemy.orm import Session

from app.core.identifiers import new_record_id, new_zone_id
from app.domain.errors import ConflictError, NotFoundError
from app.domain.names import normalize_name
from app.domain.zone_defaults import (
    DEFAULT_RECORD_SET_COUNT,
    NS_TTL,
    SOA_TTL,
    default_nameservers,
    default_soa_value,
)
from app.models.base import utc_now_iso
from app.models.dns import HostedZone, RecordSet, RecordValue
from app.repositories.protocols import (
    HostedZoneRepository,
    RecordSetRepository,
    SortOrder,
    ZoneSortField,
)


class HostedZoneService:
    """Creates, reads, updates, and deletes hosted zones for one user."""

    def __init__(
        self,
        session: Session,
        zones: HostedZoneRepository,
        records: RecordSetRepository,
    ) -> None:
        """Take the request session for commits, plus the repositories it needs."""
        self._session = session
        self._zones = zones
        self._records = records

    def list_zones(
        self,
        user_id: int,
        *,
        search: str | None,
        sort: ZoneSortField,
        order: SortOrder,
        limit: int,
        offset: int,
    ) -> tuple[list[HostedZone], int]:
        """Return one page of the user's zones and the total matching count."""
        return self._zones.list_for_owner(
            user_id, search=search, sort=sort, order=order, limit=limit, offset=offset
        )

    def get_zone(self, public_id: str, user_id: int) -> HostedZone:
        """Return the user's zone, or raise `NotFoundError`.

        Raises the same error whether the zone is absent or owned by someone
        else, so the response cannot be used to probe for existence.
        """
        zone = self._zones.get_by_public_id(public_id, user_id)
        if zone is None:
            raise NotFoundError(f"No hosted zone with ID '{public_id}'.")
        return zone

    def create_zone(
        self, user_id: int, *, name: str, comment: str | None, zone_type: str
    ) -> HostedZone:
        """Create a zone together with its generated SOA and apex NS records.

        All three rows are staged before a single commit, so a failure part-way
        through cannot leave a zone without the records that make it valid.
        """
        normalized = normalize_name(name)
        if self._zones.get_by_name(normalized, user_id) is not None:
            raise ConflictError(f"You already have a hosted zone named '{normalized}'.")

        zone = self._zones.add(
            HostedZone(
                public_id=new_zone_id(),
                user_id=user_id,
                name=normalized,
                type=zone_type,
                comment=comment,
                record_count=DEFAULT_RECORD_SET_COUNT,
            )
        )
        self._create_system_records(zone)
        self._session.commit()
        return zone

    def update_zone(self, public_id: str, user_id: int, *, comment: str | None) -> HostedZone:
        """Update a zone's description and return it."""
        zone = self.get_zone(public_id, user_id)
        zone.comment = comment
        zone.updated_at = utc_now_iso()
        self._session.commit()
        return zone

    def delete_zone(self, public_id: str, user_id: int) -> None:
        """Delete a zone that holds no records beyond its generated ones.

        Refusing otherwise mirrors the console and prevents a single click from
        destroying an entire zone's configuration.
        """
        zone = self.get_zone(public_id, user_id)
        remaining = self._records.count_deletable(zone.id)
        if remaining:
            raise ConflictError(
                f"This zone still has {remaining} record set(s). Delete them before "
                "deleting the zone."
            )
        self._zones.delete(zone)
        self._session.commit()

    def _create_system_records(self, zone: HostedZone) -> None:
        """Stage the SOA and apex NS records that every zone is created with."""
        nameservers = default_nameservers()
        self._records.add(
            RecordSet(
                public_id=new_record_id(),
                hosted_zone_id=zone.id,
                name=zone.name,
                type="NS",
                ttl=NS_TTL,
                is_system=1,
                values=[
                    RecordValue(value=value, sort_order=index)
                    for index, value in enumerate(nameservers)
                ],
            )
        )
        self._records.add(
            RecordSet(
                public_id=new_record_id(),
                hosted_zone_id=zone.id,
                name=zone.name,
                type="SOA",
                ttl=SOA_TTL,
                is_system=1,
                values=[RecordValue(value=default_soa_value(), sort_order=0)],
            )
        )
