"""SQLAlchemy implementations of the hosted-zone and record-set repositories.

Every query that reads user-owned data carries its owner filter in the WHERE
clause. There is deliberately no method that returns a zone without an owner
argument, so "fetch then check" is not an available mistake.
"""

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session, selectinload

from app.models.dns import HostedZone, RecordSet
from app.repositories.protocols import RecordSortField, SortOrder, ZoneSortField

# Maps the validated sort enum onto real columns. Only these columns can ever
# reach an ORDER BY clause; an unknown value cannot be expressed as an enum
# member, so it is rejected by request parsing before it arrives here.
_ZONE_SORT_COLUMNS = {
    ZoneSortField.NAME: HostedZone.name,
    ZoneSortField.TYPE: HostedZone.type,
    ZoneSortField.RECORD_COUNT: HostedZone.record_count,
    ZoneSortField.CREATED_AT: HostedZone.created_at,
}

_RECORD_SORT_COLUMNS = {
    RecordSortField.NAME: RecordSet.name,
    RecordSortField.TYPE: RecordSet.type,
    RecordSortField.TTL: RecordSet.ttl,
}


class SqlAlchemyHostedZoneRepository:
    """Persists hosted zones. Satisfies `protocols.HostedZoneRepository`."""

    def __init__(self, session: Session) -> None:
        """Bind the repository to the request's session."""
        self._session = session

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
        conditions = [HostedZone.user_id == user_id]
        if search:
            conditions.append(HostedZone.name.like(f"%{_escape_like(search)}%", escape="\\"))

        total = self._session.scalar(
            select(func.count()).select_from(HostedZone).where(*conditions)
        )
        column = _ZONE_SORT_COLUMNS[sort]
        statement = (
            select(HostedZone)
            .where(*conditions)
            .order_by(column.desc() if order is SortOrder.DESC else column.asc())
            .limit(limit)
            .offset(offset)
        )
        return list(self._session.scalars(statement).all()), total or 0

    def get_by_public_id(self, public_id: str, user_id: int) -> HostedZone | None:
        """Return the owner's zone with this public identifier, or None."""
        statement = select(HostedZone).where(
            HostedZone.public_id == public_id,
            HostedZone.user_id == user_id,
        )
        return self._session.scalars(statement).first()

    def get_by_name(self, name: str, user_id: int) -> HostedZone | None:
        """Return the owner's zone with this normalized name, or None."""
        statement = select(HostedZone).where(
            HostedZone.name == name,
            HostedZone.user_id == user_id,
        )
        return self._session.scalars(statement).first()

    def add(self, zone: HostedZone) -> HostedZone:
        """Stage a new zone and flush so its generated id is available."""
        self._session.add(zone)
        self._session.flush()
        return zone

    def delete(self, zone: HostedZone) -> None:
        """Stage a zone deletion; record sets and values cascade in SQLite."""
        self._session.delete(zone)


class SqlAlchemyRecordSetRepository:
    """Persists record sets. Satisfies `protocols.RecordSetRepository`.

    Methods take `hosted_zone_id`, an internal key the caller can only obtain by
    first resolving the zone through an owner-scoped query. Authorization is
    therefore established before any record is reachable.
    """

    def __init__(self, session: Session) -> None:
        """Bind the repository to the request's session."""
        self._session = session

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
        conditions = [RecordSet.hosted_zone_id == hosted_zone_id]
        if search:
            conditions.append(RecordSet.name.like(f"%{_escape_like(search)}%", escape="\\"))
        if record_type:
            conditions.append(RecordSet.type == record_type)

        total = self._session.scalar(
            select(func.count()).select_from(RecordSet).where(*conditions)
        )
        column = _RECORD_SORT_COLUMNS[sort]
        statement = (
            self._with_values(select(RecordSet))
            .where(*conditions)
            .order_by(column.desc() if order is SortOrder.DESC else column.asc())
            .limit(limit)
            .offset(offset)
        )
        return list(self._session.scalars(statement).unique().all()), total or 0

    def get_by_public_id(self, public_id: str, hosted_zone_id: int) -> RecordSet | None:
        """Return the zone's record set with this public identifier, or None."""
        statement = self._with_values(select(RecordSet)).where(
            RecordSet.public_id == public_id,
            RecordSet.hosted_zone_id == hosted_zone_id,
        )
        return self._session.scalars(statement).first()

    def find_matching(
        self,
        hosted_zone_id: int,
        name: str,
        record_type: str,
        set_identifier: str | None,
    ) -> RecordSet | None:
        """Return the record set occupying this uniqueness slot, or None."""
        statement = select(RecordSet).where(
            RecordSet.hosted_zone_id == hosted_zone_id,
            RecordSet.name == name,
            RecordSet.type == record_type,
            RecordSet.set_identifier.is_(None)
            if set_identifier is None
            else RecordSet.set_identifier == set_identifier,
        )
        return self._session.scalars(statement).first()

    def list_at_name(self, hosted_zone_id: int, name: str) -> list[RecordSet]:
        """Return every record set sharing this name in the zone."""
        statement = select(RecordSet).where(
            RecordSet.hosted_zone_id == hosted_zone_id,
            RecordSet.name == name,
        )
        return list(self._session.scalars(statement).all())

    def count_for_zone(self, hosted_zone_id: int) -> int:
        """Return how many record sets the zone holds."""
        total = self._session.scalar(
            select(func.count())
            .select_from(RecordSet)
            .where(RecordSet.hosted_zone_id == hosted_zone_id)
        )
        return total or 0

    def count_deletable(self, hosted_zone_id: int) -> int:
        """Return how many non-system record sets the zone holds."""
        total = self._session.scalar(
            select(func.count())
            .select_from(RecordSet)
            .where(RecordSet.hosted_zone_id == hosted_zone_id, RecordSet.is_system == 0)
        )
        return total or 0

    def add(self, record_set: RecordSet) -> RecordSet:
        """Stage a new record set and flush so its generated id is available."""
        self._session.add(record_set)
        self._session.flush()
        return record_set

    def delete(self, record_set: RecordSet) -> None:
        """Stage a record-set deletion; its values cascade in SQLite."""
        self._session.delete(record_set)

    @staticmethod
    def _with_values(statement: Select[tuple[RecordSet]]) -> Select[tuple[RecordSet]]:
        """Eager-load values so rendering a page of records is two queries, not N+1."""
        return statement.options(selectinload(RecordSet.values))


def _escape_like(term: str) -> str:
    """Neutralize LIKE wildcards in user input.

    Without this, searching for "%" matches every row and searching for "_"
    matches any single character — surprising behaviour rather than a security
    hole, since the value is still bound as a parameter.
    """
    return term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
