"""Public identifier generation.

Internal integer primary keys never leave the database. The API and UI expose
only these opaque identifiers, which avoids publishing a sequential counter of
how many rows exist and mirrors the Z-prefixed zone IDs the real console shows.
"""

import secrets

# Crockford-style alphabet without I, L, O, or U, so an identifier read aloud or
# retyped from a screenshot cannot be ambiguous.
_ALPHABET = "ABCDEFGHJKMNPQRSTVWXYZ0123456789"

ZONE_ID_LENGTH = 13
RECORD_ID_LENGTH = 14


def new_zone_id() -> str:
    """Return a fresh hosted-zone identifier, for example "Z3KMQ7VN2PXWD"."""
    return "Z" + _random_suffix(ZONE_ID_LENGTH - 1)


def new_record_id() -> str:
    """Return a fresh record-set identifier, for example "R7QT2VMXK4PN9C"."""
    return "R" + _random_suffix(RECORD_ID_LENGTH - 1)


def _random_suffix(length: int) -> str:
    """Return `length` characters drawn uniformly from the alphabet."""
    return "".join(secrets.choice(_ALPHABET) for _ in range(length))
