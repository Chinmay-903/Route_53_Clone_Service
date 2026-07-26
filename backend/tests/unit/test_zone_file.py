"""Unit tests for BIND master-file parsing and serialisation.

The security tests come first because they are the reason this module is
hardened at all: it turns an uploaded file into database rows.
"""

import pytest

from app.domain.errors import ValidationError
from app.domain.zone_file import (
    MAX_LINES,
    MAX_ZONE_FILE_BYTES,
    ParsedRecord,
    parse_zone_file,
    serialize_zone_file,
)

ORIGIN = "example.com."


class TestSecurityLimits:
    """The three defences that make importing an uploaded file acceptable."""

    def test_include_directive_is_rejected(self) -> None:
        """$INCLUDE reads a path off the server's disk, so it is refused."""
        zone_file = "$ORIGIN example.com.\n$INCLUDE /etc/passwd\nwww 300 IN A 192.0.2.1\n"
        with pytest.raises(ValidationError, match=r"\$INCLUDE is not permitted"):
            parse_zone_file(zone_file, ORIGIN)

    def test_include_is_rejected_even_when_lowercase(self) -> None:
        with pytest.raises(ValidationError, match=r"\$INCLUDE is not permitted"):
            parse_zone_file("$include ./secrets.zone\n", ORIGIN)

    def test_oversized_file_is_rejected(self) -> None:
        oversized = "; padding\n" * (MAX_ZONE_FILE_BYTES // 5)
        with pytest.raises(ValidationError, match="import limit"):
            parse_zone_file(oversized, ORIGIN)

    def test_too_many_lines_is_rejected(self) -> None:
        many_lines = "\n".join(f"host{n} 300 IN A 192.0.2.1" for n in range(MAX_LINES + 10))
        with pytest.raises(ValidationError, match="lines"):
            parse_zone_file(many_lines, ORIGIN)

    def test_unknown_directive_is_reported_not_executed(self) -> None:
        result = parse_zone_file("$GENERATE 1-10 host$ A 192.0.2.1\n", ORIGIN)
        assert result.records == []
        assert "Unsupported directive" in result.skipped[0].reason


class TestGrammar:
    """The master-file features the specification requires."""

    def test_origin_and_relative_names(self) -> None:
        result = parse_zone_file("$ORIGIN example.com.\nwww 300 IN A 192.0.2.1\n", ORIGIN)
        assert result.records[0].name == "www.example.com."

    def test_at_resolves_to_the_origin(self) -> None:
        result = parse_zone_file("@ 300 IN A 192.0.2.1\n", ORIGIN)
        assert result.records[0].name == "example.com."

    def test_absolute_names_are_kept(self) -> None:
        result = parse_zone_file("mail.example.com. 300 IN A 192.0.2.1\n", ORIGIN)
        assert result.records[0].name == "mail.example.com."

    def test_default_ttl_directive_applies(self) -> None:
        result = parse_zone_file("$TTL 600\nwww IN A 192.0.2.1\n", ORIGIN)
        assert result.records[0].ttl == 600

    def test_owner_name_is_inherited_from_the_previous_line(self) -> None:
        """A line starting with whitespace reuses the previous owner."""
        zone_file = "www 300 IN A 192.0.2.1\n      300 IN A 192.0.2.2\n"
        result = parse_zone_file(zone_file, ORIGIN)

        assert len(result.records) == 1
        assert result.records[0].name == "www.example.com."
        assert result.records[0].values == ["192.0.2.1", "192.0.2.2"]

    def test_comments_are_stripped(self) -> None:
        result = parse_zone_file("; a comment\nwww 300 IN A 192.0.2.1 ; trailing\n", ORIGIN)
        assert result.records[0].values == ["192.0.2.1"]

    def test_semicolon_inside_a_quoted_string_is_not_a_comment(self) -> None:
        result = parse_zone_file('@ 300 IN TXT "v=spf1; -all"\n', ORIGIN)
        assert result.records[0].values == ['"v=spf1; -all"']

    def test_parenthesised_record_spans_lines(self) -> None:
        zone_file = "@ 300 IN MX (\n    10\n    mail.example.com.\n)\n"
        result = parse_zone_file(zone_file, ORIGIN)
        assert result.records[0].values == ["10 mail.example.com."]

    def test_class_field_is_optional(self) -> None:
        result = parse_zone_file("www 300 A 192.0.2.1\n", ORIGIN)
        assert result.records[0].type == "A"

    def test_ttl_may_follow_the_class(self) -> None:
        result = parse_zone_file("www IN 900 A 192.0.2.1\n", ORIGIN)
        assert result.records[0].ttl == 900

    def test_same_name_and_type_merge_into_one_record_set(self) -> None:
        zone_file = "www 300 IN A 192.0.2.1\nwww 300 IN A 192.0.2.2\n"
        result = parse_zone_file(zone_file, ORIGIN)
        assert len(result.records) == 1
        assert result.records[0].values == ["192.0.2.1", "192.0.2.2"]


class TestValidationReuse:
    """Imported values face exactly the rules a hand-typed value faces."""

    def test_invalid_address_is_skipped_with_a_reason(self) -> None:
        result = parse_zone_file("www 300 IN A 999.1.1.1\n", ORIGIN)
        assert result.records == []
        assert "not a valid IPv4 address" in result.skipped[0].reason

    def test_unsupported_type_is_skipped(self) -> None:
        result = parse_zone_file("www 300 IN SPF v=spf1\n", ORIGIN)
        assert "not supported" in result.skipped[0].reason

    def test_one_bad_line_does_not_discard_the_good_ones(self) -> None:
        zone_file = "good 300 IN A 192.0.2.1\nbad 300 IN A not-an-ip\nalso 300 IN A 192.0.2.2\n"
        result = parse_zone_file(zone_file, ORIGIN)
        assert len(result.records) == 2
        assert len(result.skipped) == 1

    def test_skipped_line_reports_its_line_number(self) -> None:
        result = parse_zone_file("ok 300 IN A 192.0.2.1\nbad 300 IN A oops\n", ORIGIN)
        assert result.skipped[0].line_number == 2


class TestSerialisation:
    """Export formatting, and the round trip back through the parser."""

    def test_serialises_directives_and_records(self) -> None:
        text = serialize_zone_file(
            "example.com.",
            [ParsedRecord(name="www.example.com.", type="A", ttl=300, values=["192.0.2.1"])],
        )
        assert "$ORIGIN example.com." in text
        assert "www.example.com.\t300\tIN\tA\t192.0.2.1" in text

    def test_multi_value_record_emits_one_line_per_value(self) -> None:
        text = serialize_zone_file(
            "example.com.",
            [
                ParsedRecord(
                    name="example.com.", type="A", ttl=60, values=["192.0.2.1", "192.0.2.2"]
                )
            ],
        )
        assert text.count("IN\tA") == 2

    def test_export_then_import_preserves_the_records(self) -> None:
        original = [
            ParsedRecord(name="www.example.com.", type="A", ttl=300, values=["192.0.2.1"]),
            ParsedRecord(name="example.com.", type="MX", ttl=3600, values=["10 mail.example.com."]),
        ]
        reparsed = parse_zone_file(serialize_zone_file("example.com.", original), ORIGIN)

        assert {(r.name, r.type, tuple(r.values)) for r in reparsed.records} == {
            (r.name, r.type, tuple(r.values)) for r in original
        }
