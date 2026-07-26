"""RFC 1035 master-file (BIND) parsing and serialisation.

Pure functions with no framework or I/O imports, so the whole grammar is
unit-testable without an HTTP client.

This is the most dangerous input surface in the application: it accepts an
uploaded file and turns it into database rows. Three defences are built into the
parser rather than bolted on by the caller, so no call site can forget them:

* `$INCLUDE` is rejected outright. It instructs a resolver to read another file
  from disk, which in a web application is a local-file-read primitive.
* Size, line, and record counts are capped, so a small upload cannot expand into
  unbounded work.
* Every parsed value still passes through `dns_rules.validate_values` in the
  service. Parsing decides *shape*; it never decides *validity*.
"""

from dataclasses import dataclass, field

from app.domain.dns_rules import SUPPORTED_TYPES, validate_values
from app.domain.errors import ValidationError
from app.domain.names import normalize_name

# 256 KB holds a very large real zone; anything beyond it is not a zone file.
MAX_ZONE_FILE_BYTES = 256 * 1024
MAX_LINES = 5_000
MAX_RECORDS = 1_000

DEFAULT_TTL = 300

# Types the importer will create. SOA and NS at the apex are generated with the
# zone and are immutable, so an uploaded file cannot replace them.
IMPORTABLE_TYPES = frozenset(SUPPORTED_TYPES)

_DNS_CLASSES = frozenset({"IN", "CH", "HS"})


class UnsafeZoneFileError(ValidationError):
    """A file-level refusal that must abort the entire import.

    Distinct from an ordinary `ValidationError` because the per-line handler
    downgrades those into "skipped, here is why" entries. A file containing
    `$INCLUDE` must not be quietly half-imported — the caller has to be told the
    upload was refused.
    """


@dataclass
class ParsedRecord:
    """One record set assembled from the file, before persistence."""

    name: str
    type: str
    ttl: int
    values: list[str] = field(default_factory=list)


@dataclass
class SkippedLine:
    """A line the importer declined, with the reason shown back to the user."""

    line_number: int
    text: str
    reason: str


@dataclass
class ParseResult:
    """Everything the importer learned from one file."""

    records: list[ParsedRecord]
    skipped: list[SkippedLine]


def parse_zone_file(text: str, origin: str, default_ttl: int = DEFAULT_TTL) -> ParseResult:
    """Parse BIND master-file text into record sets.

    Args:
        text: The file's decoded contents.
        origin: Zone name used for `@` and to qualify relative names.
        default_ttl: TTL applied to records that do not state one.

    Returns:
        Parsed record sets, plus the lines that were skipped and why.

    Raises:
        ValidationError: If the file exceeds a limit or contains `$INCLUDE`.
    """
    _reject_oversized(text)

    origin = normalize_name(origin)
    state = _ParserState(origin=origin, ttl=default_ttl, last_owner=origin)
    grouped: dict[tuple[str, str], ParsedRecord] = {}
    skipped: list[SkippedLine] = []

    for line_number, raw_line in _logical_lines(text):
        try:
            _consume_line(raw_line, state, grouped)
        except UnsafeZoneFileError:
            # Never downgraded to a skipped line: the whole upload is refused.
            raise
        except ValidationError as exc:
            skipped.append(SkippedLine(line_number, raw_line.strip()[:120], exc.message))

        if len(grouped) > MAX_RECORDS:
            raise ValidationError(
                f"Zone file defines more than {MAX_RECORDS} record sets, which exceeds "
                "the import limit."
            )

    return ParseResult(records=list(grouped.values()), skipped=skipped)


def _reject_oversized(text: str) -> None:
    """Bound the work a single upload can cause before parsing starts."""
    if len(text.encode("utf-8")) > MAX_ZONE_FILE_BYTES:
        raise ValidationError(
            f"Zone file exceeds the {MAX_ZONE_FILE_BYTES // 1024} KB import limit."
        )


@dataclass
class _ParserState:
    """Directives that carry from one line to the next."""

    origin: str
    ttl: int
    last_owner: str


def _logical_lines(text: str) -> list[tuple[int, str]]:
    """Return numbered logical lines, joining parenthesised continuations.

    A record may span several physical lines inside parentheses. They are folded
    into one logical line here so the field parser never has to track depth.
    """
    physical = text.splitlines()
    if len(physical) > MAX_LINES:
        raise ValidationError(
            f"Zone file has more than {MAX_LINES} lines, which exceeds the import limit."
        )

    logical: list[tuple[int, str]] = []
    buffer = ""
    depth = 0
    start_line = 0

    for index, line in enumerate(physical, start=1):
        stripped = _strip_comment(line)
        if not buffer:
            start_line = index

        depth += stripped.count("(") - stripped.count(")")
        buffer = f"{buffer} {stripped}" if buffer else stripped

        if depth <= 0:
            if buffer.strip():
                logical.append((start_line, buffer.replace("(", " ").replace(")", " ")))
            buffer = ""
            depth = 0

    if buffer.strip():
        logical.append((start_line, buffer.replace("(", " ").replace(")", " ")))
    return logical


def _strip_comment(line: str) -> str:
    """Remove a `;` comment, ignoring semicolons inside quoted strings."""
    in_quotes = False
    escaped = False

    for index, char in enumerate(line):
        if escaped:
            escaped = False
        elif char == "\\":
            escaped = True
        elif char == '"':
            in_quotes = not in_quotes
        elif char == ";" and not in_quotes:
            return line[:index]
    return line


def _consume_line(
    line: str,
    state: _ParserState,
    grouped: dict[tuple[str, str], ParsedRecord],
) -> None:
    """Apply one logical line: a directive, or a record added to `grouped`."""
    if not line.strip():
        return

    # A line beginning with whitespace inherits the previous record's owner.
    inherits_owner = line[:1].isspace()
    fields = line.split()

    directive = fields[0].upper()
    if directive.startswith("$"):
        _apply_directive(directive, fields, state)
        return

    _apply_record(fields, inherits_owner, state, grouped)


def _apply_directive(directive: str, fields: list[str], state: _ParserState) -> None:
    """Handle `$ORIGIN` and `$TTL`; refuse `$INCLUDE`."""
    if directive == "$INCLUDE":
        # Not "unsupported" — refused. It would make the parser read an
        # arbitrary path from the server's filesystem.
        raise UnsafeZoneFileError(
            "$INCLUDE is not permitted in an uploaded zone file. Inline the "
            "referenced records instead."
        )

    if directive == "$ORIGIN":
        if len(fields) < 2:
            raise ValidationError("$ORIGIN needs a domain name.")
        state.origin = normalize_name(fields[1])
        state.last_owner = state.origin
        return

    if directive == "$TTL":
        if len(fields) < 2 or not fields[1].isdigit():
            raise ValidationError("$TTL needs a whole number of seconds.")
        state.ttl = int(fields[1])
        return

    raise ValidationError(f"Unsupported directive '{directive}'.")


def _apply_record(
    fields: list[str],
    inherits_owner: bool,
    state: _ParserState,
    grouped: dict[tuple[str, str], ParsedRecord],
) -> None:
    """Parse `[name] [ttl] [class] type rdata...` and merge it into `grouped`."""
    cursor = 0

    if inherits_owner:
        owner = state.last_owner
    else:
        owner = _qualify(fields[0], state.origin)
        cursor = 1

    ttl = state.ttl
    if cursor < len(fields) and fields[cursor].isdigit():
        ttl = int(fields[cursor])
        cursor += 1

    if cursor < len(fields) and fields[cursor].upper() in _DNS_CLASSES:
        cursor += 1

    # TTL may follow the class as well as precede it.
    if cursor < len(fields) and fields[cursor].isdigit():
        ttl = int(fields[cursor])
        cursor += 1

    if cursor >= len(fields):
        raise ValidationError("Record is missing a type.")

    record_type = fields[cursor].upper()
    cursor += 1
    rdata = " ".join(fields[cursor:]).strip()

    if record_type not in IMPORTABLE_TYPES:
        raise ValidationError(f"Record type '{record_type}' is not supported.")
    if not rdata:
        raise ValidationError(f"{record_type} record has no value.")

    # Reuses the same validators the API applies, so an imported record can
    # never be laxer than a hand-created one.
    value = validate_values(record_type, [rdata])[0]

    state.last_owner = owner
    key = (owner, record_type)
    existing = grouped.get(key)
    if existing is None:
        grouped[key] = ParsedRecord(name=owner, type=record_type, ttl=ttl, values=[value])
    elif value not in existing.values:
        existing.values.append(value)


def _qualify(name: str, origin: str) -> str:
    """Resolve `@`, absolute, and relative owner names against the origin."""
    if name == "@":
        return origin
    if name.endswith("."):
        return normalize_name(name)
    return normalize_name(f"{name}.{origin}")


def serialize_zone_file(zone_name: str, records: list[ParsedRecord]) -> str:
    """Render record sets as BIND master-file text.

    Pure formatting with no validation, so exporting cannot fail on data the
    database already accepted.
    """
    origin = normalize_name(zone_name)
    lines = [
        f"$ORIGIN {origin}",
        f"$TTL {DEFAULT_TTL}",
        "",
    ]

    for record in sorted(records, key=lambda r: (r.name, r.type)):
        for value in record.values:
            lines.append(f"{record.name}\t{record.ttl}\tIN\t{record.type}\t{value}")

    return "\n".join(lines) + "\n"
