"""Declarative base and the shared timestamp default.

Timestamps are stored as SQLite TEXT in ISO-8601 UTC rather than as a native
type, because SQLite has no date type and text sorts chronologically.
"""

from datetime import UTC, datetime

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Base class for every ORM entity in the application."""


def utc_now_iso() -> str:
    """Return the current UTC time as a second-precision ISO-8601 string."""
    return datetime.now(UTC).replace(microsecond=0, tzinfo=None).isoformat(sep=" ")
