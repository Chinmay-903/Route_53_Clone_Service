"""DNS name normalization and syntax rules.

Pure functions with no framework or I/O dependencies, so the whole module is
unit-testable in isolation. Every name entering the system passes through
`normalize_name`, which guarantees downstream code compares like with like.
"""

import re

from app.domain.errors import ValidationError

MAX_LABEL_LENGTH = 63
MAX_NAME_LENGTH = 255

# A label is alphanumeric with internal hyphens. Leading underscores are
# permitted because service labels such as _sip._tcp and _dmarc are ordinary
# in real zones, even though RFC 1035 predates them.
_LABEL_PATTERN = re.compile(r"^_?[a-z0-9]([a-z0-9-]*[a-z0-9])?$")


def normalize_name(name: str) -> str:
    """Return `name` lowercased, punycoded, and ending in exactly one dot.

    Args:
        name: A relative or absolute domain name, possibly internationalized.

    Returns:
        The canonical absolute form, for example "Example.COM" -> "example.com.".

    Raises:
        ValidationError: If the name is empty, too long, or has an invalid label.
    """
    candidate = name.strip().lower().rstrip(".")
    if not candidate:
        raise ValidationError("Name cannot be empty.")

    labels = [_to_ascii_label(label) for label in candidate.split(".")]
    _reject_misplaced_wildcard(labels)

    absolute = ".".join(labels) + "."
    if len(absolute) > MAX_NAME_LENGTH:
        raise ValidationError(
            f"Name exceeds the {MAX_NAME_LENGTH}-character limit for a fully qualified name."
        )
    return absolute


def _to_ascii_label(label: str) -> str:
    """Validate one label, converting non-ASCII input to its punycode form."""
    if not label:
        raise ValidationError("Name cannot contain an empty label (two consecutive dots).")
    if label == "*":
        return label

    ascii_label = label if label.isascii() else _punycode(label)
    if len(ascii_label) > MAX_LABEL_LENGTH:
        raise ValidationError(f"Label '{label}' exceeds the {MAX_LABEL_LENGTH}-character limit.")
    if not _LABEL_PATTERN.match(ascii_label):
        raise ValidationError(
            f"Label '{label}' is invalid. Use letters, digits, and hyphens; "
            "a label cannot start or end with a hyphen."
        )
    return ascii_label


def _punycode(label: str) -> str:
    """Encode an internationalized label as ASCII-compatible punycode."""
    try:
        # The stdlib "idna" codec implements IDNA 2003 and rejects some labels
        # the DNS accepts; encoding a single label keeps the failure local.
        return label.encode("idna").decode("ascii")
    except UnicodeError as exc:
        raise ValidationError(f"Label '{label}' is not a valid internationalized name.") from exc


def _reject_misplaced_wildcard(labels: list[str]) -> None:
    """Allow "*" only as the leftmost label, which is all the DNS permits."""
    if "*" in labels[1:]:
        raise ValidationError("A wildcard '*' is only valid as the leftmost label.")


def is_hostname(value: str) -> bool:
    """Return True if `value` is a syntactically valid domain name."""
    try:
        normalize_name(value)
    except ValidationError:
        return False
    return True


def is_within_zone(record_name: str, zone_name: str) -> bool:
    """Return True if `record_name` is the zone apex or sits beneath it.

    Both arguments must already be normalized.
    """
    return record_name == zone_name or record_name.endswith("." + zone_name)


def is_apex(record_name: str, zone_name: str) -> bool:
    """Return True if `record_name` is the zone's own name.

    The apex is where a CNAME is prohibited, because the zone's SOA and NS
    records must coexist there and a CNAME forbids any sibling.
    """
    return record_name == zone_name
