"""Hosted zone, record set, and record value entities.

The central modelling decision lives here: one row per *record set*, with its
values in a child table. Route 53 groups multiple values under a single name and
type, and weighted or multivalue answers share a name and type while differing
only by set identifier. Modelling one row per value would make the uniqueness
rule below unexpressible. See docs/adr/0003-record-set-model.md.
"""

from sqlalchemy import (
    CheckConstraint,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

ZONE_TYPES = ("Public", "Private")
RECORD_TYPES = ("A", "AAAA", "CNAME", "TXT", "MX", "NS", "PTR", "SRV", "CAA", "SOA")


class HostedZone(Base):
    """A DNS zone owned by exactly one user."""

    __tablename__ = "hosted_zones"
    __table_args__ = (
        # A user cannot hold the same domain twice; two different users can.
        UniqueConstraint("user_id", "name", name="uq_zones_user_name"),
        CheckConstraint("type IN ('Public','Private')", name="ck_zones_type"),
        Index("ix_zones_user", "user_id"),
        Index("ix_zones_name", "name"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    public_id: Mapped[str] = mapped_column(String(32), nullable=False, unique=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(255, collation="NOCASE"), nullable=False)
    type: Mapped[str] = mapped_column(String(16), nullable=False)
    # Surfaced in the console as "Description"; the API keeps Route 53's own term.
    comment: Mapped[str | None] = mapped_column(String(256))
    record_count: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("2"))
    created_by: Mapped[str] = mapped_column(
        String(64), nullable=False, server_default=text("'Route 53 Console'")
    )
    created_at: Mapped[str] = mapped_column(
        Text, nullable=False, server_default=text("(datetime('now'))")
    )
    updated_at: Mapped[str | None] = mapped_column(Text)

    record_sets: Mapped[list["RecordSet"]] = relationship(
        back_populates="hosted_zone",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class RecordSet(Base):
    """A group of values sharing one name, type, and routing differentiator."""

    __tablename__ = "record_sets"
    __table_args__ = (
        # The rule the whole schema exists to express. set_identifier is NULL for
        # simple routing; SQLite treats NULLs as distinct in a unique index, so
        # the service layer also rejects a duplicate simple record explicitly.
        UniqueConstraint(
            "hosted_zone_id",
            "name",
            "type",
            "set_identifier",
            name="uq_records_zone_name_type_setid",
        ),
        CheckConstraint(
            "type IN ('A','AAAA','CNAME','TXT','MX','NS','PTR','SRV','CAA','SOA')",
            name="ck_records_type",
        ),
        CheckConstraint("ttl BETWEEN 0 AND 2147483647", name="ck_records_ttl"),
        CheckConstraint("is_system IN (0,1)", name="ck_records_is_system"),
        # Serves the list endpoint's zone scope, its name search, and its type
        # filter from a single index.
        Index("ix_records_zone_name_type", "hosted_zone_id", "name", "type"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    public_id: Mapped[str] = mapped_column(String(32), nullable=False, unique=True)
    hosted_zone_id: Mapped[int] = mapped_column(
        ForeignKey("hosted_zones.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255, collation="NOCASE"), nullable=False)
    type: Mapped[str] = mapped_column(String(8), nullable=False)
    ttl: Mapped[int] = mapped_column(Integer, nullable=False)
    routing_policy: Mapped[str] = mapped_column(
        String(32), nullable=False, server_default=text("'Simple'")
    )
    set_identifier: Mapped[str | None] = mapped_column(String(128))
    # Marks the SOA and apex NS records created with the zone. They are visible
    # and read-only: deleting them would leave the zone unresolvable.
    is_system: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    created_at: Mapped[str] = mapped_column(
        Text, nullable=False, server_default=text("(datetime('now'))")
    )
    updated_at: Mapped[str | None] = mapped_column(Text)

    hosted_zone: Mapped[HostedZone] = relationship(back_populates="record_sets")
    values: Mapped[list["RecordValue"]] = relationship(
        back_populates="record_set",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="RecordValue.sort_order",
    )


class RecordValue(Base):
    """One value belonging to a record set, with its display position."""

    __tablename__ = "record_values"
    __table_args__ = (Index("ix_values_record_set", "record_set_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    record_set_id: Mapped[int] = mapped_column(
        ForeignKey("record_sets.id", ondelete="CASCADE"), nullable=False
    )
    value: Mapped[str] = mapped_column(String(4096), nullable=False)
    # Preserves the order the user typed, which the console echoes back.
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))

    record_set: Mapped[RecordSet] = relationship(back_populates="values")
