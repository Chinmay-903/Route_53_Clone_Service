"""Per-record-type value validation.

Pure functions, no framework imports, so every rule in Part 12 of the build
specification is unit-testable without a database or an HTTP client. The API
layer and the service layer both defer to `validate_values` — the server is the
authority regardless of what the browser already checked.
"""

import ipaddress
from collections.abc import Callable

from app.domain.errors import ValidationError
from app.domain.names import normalize_name

MIN_TTL = 0
MAX_TTL = 2_147_483_647

MAX_TXT_STRING_BYTES = 255
MAX_UINT16 = 65_535
MAX_CAA_FLAGS = 255

# RFC 8659 defines exactly these three property tags. Anything else is a typo
# or an attempt to smuggle unvalidated text into the record.
CAA_TAGS = frozenset({"issue", "issuewild", "iodef"})

SUPPORTED_TYPES = ("A", "AAAA", "CNAME", "TXT", "MX", "NS", "PTR", "SRV", "CAA")

# Types the DNS permits to carry several values under one name.
MULTI_VALUE_TYPES = frozenset({"A", "AAAA", "TXT", "MX", "NS", "SRV", "CAA"})


def validate_ttl(ttl: int) -> int:
    """Return `ttl` unchanged if it fits the protocol's signed 32-bit range."""
    if not MIN_TTL <= ttl <= MAX_TTL:
        raise ValidationError(f"TTL must be between {MIN_TTL} and {MAX_TTL} seconds.")
    return ttl


def validate_values(record_type: str, values: list[str]) -> list[str]:
    """Validate and canonicalize every value for a record set.

    Args:
        record_type: One of `SUPPORTED_TYPES`.
        values: Raw values, one per line as entered in the console.

    Returns:
        The canonicalized values, in input order.

    Raises:
        ValidationError: If the type is unsupported, the value count is wrong
            for the type, or any individual value fails its type's rule.
    """
    validator = _VALIDATORS.get(record_type)
    if validator is None:
        raise ValidationError(f"Record type '{record_type}' is not supported.")

    cleaned = [value.strip() for value in values if value.strip()]
    if not cleaned:
        raise ValidationError("At least one value is required.")
    if len(cleaned) > 1 and record_type not in MULTI_VALUE_TYPES:
        raise ValidationError(f"A {record_type} record set accepts exactly one value.")

    return [validator(value) for value in cleaned]


def _validate_a(value: str) -> str:
    """Accept a dotted-quad IPv4 address."""
    try:
        return str(ipaddress.IPv4Address(value))
    except ValueError as exc:
        raise ValidationError(f"'{value}' is not a valid IPv4 address.") from exc


def _validate_aaaa(value: str) -> str:
    """Accept an IPv6 address, including compressed "::" forms.

    Delegating to the standard library rather than a regex is deliberate: IPv6
    text representation has enough edge cases that hand-rolled patterns are
    reliably wrong.
    """
    try:
        return str(ipaddress.IPv6Address(value))
    except ValueError as exc:
        raise ValidationError(f"'{value}' is not a valid IPv6 address.") from exc


def _validate_hostname(value: str) -> str:
    """Accept a single hostname and return it fully qualified."""
    return normalize_name(value)


def _validate_txt(value: str) -> str:
    """Accept one or more quoted character-strings, each at most 255 bytes.

    Unquoted input is quoted for the caller, matching the console's behaviour of
    accepting a bare string and storing it correctly.
    """
    text = value if value.startswith('"') else f'"{_escape_quotes(value)}"'
    strings = _split_character_strings(text)
    for chunk in strings:
        if len(chunk.encode("utf-8")) > MAX_TXT_STRING_BYTES:
            raise ValidationError(
                f"Each TXT character-string must be {MAX_TXT_STRING_BYTES} bytes or fewer. "
                "Split longer text into several quoted strings."
            )
    return text


def _escape_quotes(raw: str) -> str:
    """Backslash-escape embedded quotes so the wrapped string stays well formed."""
    return raw.replace("\\", "\\\\").replace('"', '\\"')


def _split_character_strings(text: str) -> list[str]:
    """Return the contents of each quoted string in a TXT value."""
    strings: list[str] = []
    current: list[str] = []
    in_quotes = False
    escaped = False

    for char in text:
        if escaped:
            current.append(char)
            escaped = False
        elif char == "\\":
            escaped = True
        elif char == '"':
            if in_quotes:
                strings.append("".join(current))
                current = []
            in_quotes = not in_quotes
        elif in_quotes:
            current.append(char)

    if in_quotes:
        raise ValidationError("TXT value has an unterminated quoted string.")
    if not strings:
        raise ValidationError('TXT values must be quoted, for example "v=spf1 -all".')
    return strings


def _validate_mx(value: str) -> str:
    """Accept "preference exchange" — a 0-65535 integer and a hostname."""
    parts = value.split()
    if len(parts) != 2:
        raise ValidationError(
            f"'{value}' is not a valid MX value. Use 'preference exchange', "
            "for example '10 mail.example.com.'."
        )
    preference = _parse_uint16(parts[0], "MX preference")
    exchange = parts[1]

    # The exchange must resolve to an address record, so an IP literal here is a
    # configuration error the DNS will not catch for the user.
    if _looks_like_ip(exchange):
        raise ValidationError("The MX exchange must be a hostname, not an IP address.")
    return f"{preference} {normalize_name(exchange)}"


def _validate_srv(value: str) -> str:
    """Accept "priority weight port target" — three integers and a hostname."""
    parts = value.split()
    if len(parts) != 4:
        raise ValidationError(
            f"'{value}' is not a valid SRV value. Use 'priority weight port target', "
            "for example '1 10 5060 sip.example.com.'."
        )
    priority = _parse_uint16(parts[0], "SRV priority")
    weight = _parse_uint16(parts[1], "SRV weight")
    port = _parse_uint16(parts[2], "SRV port")
    return f"{priority} {weight} {port} {normalize_name(parts[3])}"


def _validate_caa(value: str) -> str:
    """Accept "flags tag value" with the tag drawn from the RFC 8659 allowlist."""
    parts = value.split(maxsplit=2)
    if len(parts) != 3:
        raise ValidationError(
            f"'{value}' is not a valid CAA value. Use 'flags tag \"value\"', "
            "for example '0 issue \"amazon.com\"'."
        )
    flags = _parse_int_in_range(parts[0], "CAA flags", 0, MAX_CAA_FLAGS)
    tag = parts[1].lower()
    if tag not in CAA_TAGS:
        raise ValidationError(f"CAA tag must be one of {', '.join(sorted(CAA_TAGS))}.")

    body = parts[2].strip()
    if not (body.startswith('"') and body.endswith('"') and len(body) >= 2):
        raise ValidationError('The CAA value must be quoted, for example "amazon.com".')
    _check_caa_body(tag, body[1:-1])
    return f"{flags} {tag} {body}"


def _check_caa_body(tag: str, body: str) -> None:
    """Apply the per-tag rule: issue names a CA, iodef names a report target."""
    if tag == "iodef":
        if not body.startswith(("mailto:", "http://", "https://")):
            raise ValidationError("A CAA iodef value must be a mailto: or http(s) URL.")
        return
    # An empty issue value is the documented way to forbid issuance entirely.
    if body and not _looks_like_ca_domain(body):
        raise ValidationError(f"'{body}' is not a valid certificate authority domain.")


def _looks_like_ca_domain(body: str) -> bool:
    """Return True if the CAA issuer field names a syntactically valid domain.

    An issuer may carry ";"-separated parameters after the domain, which are
    opaque to us and are not validated further.
    """
    domain = body.split(";", 1)[0].strip()
    try:
        normalize_name(domain)
    except ValidationError:
        return False
    return True


def _looks_like_ip(value: str) -> bool:
    """Return True if `value` parses as an IPv4 or IPv6 address."""
    try:
        ipaddress.ip_address(value)
    except ValueError:
        return False
    return True


def _parse_uint16(raw: str, field: str) -> int:
    """Parse an unsigned 16-bit integer used by MX and SRV numeric fields."""
    return _parse_int_in_range(raw, field, 0, MAX_UINT16)


def _parse_int_in_range(raw: str, field: str, low: int, high: int) -> int:
    """Parse an integer and confirm it falls within an inclusive range."""
    try:
        parsed = int(raw)
    except ValueError as exc:
        raise ValidationError(f"{field} must be a whole number, got '{raw}'.") from exc
    if not low <= parsed <= high:
        raise ValidationError(f"{field} must be between {low} and {high}.")
    return parsed


_VALIDATORS: dict[str, Callable[[str], str]] = {
    "A": _validate_a,
    "AAAA": _validate_aaaa,
    "CNAME": _validate_hostname,
    "NS": _validate_hostname,
    "PTR": _validate_hostname,
    "TXT": _validate_txt,
    "MX": _validate_mx,
    "SRV": _validate_srv,
    "CAA": _validate_caa,
}
