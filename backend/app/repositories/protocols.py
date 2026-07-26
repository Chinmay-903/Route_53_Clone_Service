"""Repository interfaces.

Services depend on these `Protocol` types, never on the SQLAlchemy classes that
satisfy them. That is the loose-coupling mechanism: persistence is swappable and
service unit tests substitute in-memory fakes with no database at all.

It is also the authorization mechanism. Every method that reads user-owned data
takes an owner identifier and is contractually required to apply it in the SQL
WHERE clause — never by filtering rows after they are fetched.
"""

from enum import StrEnum
from typing import Protocol

from app.models.dns import HostedZone, RecordSet
from app.models.identity import User, UserSession


class SortOrder(StrEnum):
    """Sort direction accepted by list endpoints."""

    ASC = "asc"
    DESC = "desc"


class ZoneSortField(StrEnum):
    """Columns a hosted-zone listing may be sorted by.

    An enum rather than a free string: `sort` reaches the ORDER BY clause, so an
    unvalidated value is the one genuine SQL-injection surface in the API.
    """

    NAME = "name"
    TYPE = "type"
    RECORD_COUNT = "record_count"
    CREATED_AT = "created_at"


class RecordSortField(StrEnum):
    """Columns a record listing may be sorted by."""

    NAME = "name"
    TYPE = "type"
    TTL = "ttl"


class UserRepository(Protocol):
    """Reads and writes user accounts."""

    def get_by_email(self, email: str) -> User | None:
        """Return the user with this address, or None."""
        ...

    def get_by_id(self, user_id: int) -> User | None:
        """Return the user with this internal identifier, or None."""
        ...

    def create(self, email: str, password_hash: str) -> User:
        """Persist a new account and return it."""
        ...


class SessionRepository(Protocol):
    """Reads and writes browser sessions, keyed by hashed token."""

    def create(self, session_id: str, user_id: int, expires_at: str) -> UserSession:
        """Persist a new session row."""
        ...

    def get(self, session_id: str) -> UserSession | None:
        """Return the session with this hashed identifier, or None."""
        ...

    def delete(self, session_id: str) -> None:
        """Remove a session, making its cookie inert."""
        ...

    def delete_expired(self) -> int:
        """Remove every expired session and return how many were removed."""
        ...


class HostedZoneRepository(Protocol):
    """Reads and writes hosted zones, always scoped to one owner."""

    def list_for_owner(
        self,
        user_id: int,
        *,
        search: str | None,
        sort: ZoneSortField,
        order: SortOrder,
        limit: int,
        offset: int,
    ) -> tuple[list[HostedZone], int]:
        """Return one page of the owner's zones and the total matching count."""
        ...

    def get_by_public_id(self, public_id: str, user_id: int) -> HostedZone | None:
        """Return the owner's zone with this public identifier, or None.

        Returns None both when no such zone exists and when it exists but
        belongs to another user, so callers cannot distinguish the two.
        """
        ...

    def get_by_name(self, name: str, user_id: int) -> HostedZone | None:
        """Return the owner's zone with this normalized name, or None."""
        ...

    def add(self, zone: HostedZone) -> HostedZone:
        """Stage a new zone in the current transaction."""
        ...

    def delete(self, zone: HostedZone) -> None:
        """Stage a zone deletion; child rows cascade in the database."""
        ...


class RecordSetRepository(Protocol):
    """Reads and writes record sets within an already-authorized zone."""

    def list_for_zone(
        self,
        hosted_zone_id: int,
        *,
        search: str | None,
        record_type: str | None,
        sort: RecordSortField,
        order: SortOrder,
        limit: int,
        offset: int,
    ) -> tuple[list[RecordSet], int]:
        """Return one page of the zone's record sets and the total count."""
        ...

    def get_by_public_id(self, public_id: str, hosted_zone_id: int) -> RecordSet | None:
        """Return the zone's record set with this public identifier, or None."""
        ...

    def find_matching(
        self,
        hosted_zone_id: int,
        name: str,
        record_type: str,
        set_identifier: str | None,
    ) -> RecordSet | None:
        """Return the record set occupying this uniqueness slot, or None."""
        ...

    def list_at_name(self, hosted_zone_id: int, name: str) -> list[RecordSet]:
        """Return every record set sharing this name, for CNAME coexistence checks."""
        ...

    def count_for_zone(self, hosted_zone_id: int) -> int:
        """Return how many record sets the zone holds."""
        ...

    def count_deletable(self, hosted_zone_id: int) -> int:
        """Return how many non-system record sets the zone holds.

        A zone may only be deleted once this reaches zero.
        """
        ...

    def add(self, record_set: RecordSet) -> RecordSet:
        """Stage a new record set in the current transaction."""
        ...

    def delete(self, record_set: RecordSet) -> None:
        """Stage a record-set deletion; its values cascade in the database."""
        ...
