"""Unit tests for the pure DNS validation rules.

No database, no HTTP client — these exercise `app.domain` directly, which is the
whole reason that package has no framework imports.
"""

import pytest

from app.domain.dns_rules import MAX_TTL, validate_ttl, validate_values
from app.domain.errors import ValidationError
from app.domain.names import is_apex, is_within_zone, normalize_name


class TestNormalizeName:
    """Name canonicalization applied to every name entering the system."""

    @pytest.mark.parametrize(
        ("raw", "expected"),
        [
            ("Example.COM", "example.com."),
            ("example.com.", "example.com."),
            ("  www.example.com  ", "www.example.com."),
            ("*.example.com", "*.example.com."),
            ("_dmarc.example.com", "_dmarc.example.com."),
            ("_sip._tcp.example.com", "_sip._tcp.example.com."),
        ],
    )
    def test_canonicalizes(self, raw: str, expected: str) -> None:
        assert normalize_name(raw) == expected

    def test_converts_internationalized_names_to_punycode(self) -> None:
        assert normalize_name("münchen.de") == "xn--mnchen-3ya.de."

    @pytest.mark.parametrize(
        "raw",
        [
            "",
            "example..com",
            "-leading-hyphen.com",
            "trailing-hyphen-.com",
            "sub.*.example.com",  # wildcard is only valid leftmost
            "a" * 64 + ".com",  # label over 63 characters
        ],
    )
    def test_rejects_invalid_names(self, raw: str) -> None:
        with pytest.raises(ValidationError):
            normalize_name(raw)

    def test_rejects_names_over_the_length_limit(self) -> None:
        too_long = ".".join(["abcdefghij"] * 30) + ".com"
        with pytest.raises(ValidationError):
            normalize_name(too_long)


class TestZoneMembership:
    """Helpers deciding whether a record belongs to a zone."""

    def test_apex_and_subdomains_are_within_the_zone(self) -> None:
        assert is_within_zone("example.com.", "example.com.")
        assert is_within_zone("www.example.com.", "example.com.")

    def test_unrelated_names_are_outside_the_zone(self) -> None:
        assert not is_within_zone("notexample.com.", "example.com.")

    def test_apex_is_only_the_zone_name_itself(self) -> None:
        assert is_apex("example.com.", "example.com.")
        assert not is_apex("www.example.com.", "example.com.")


class TestTtl:
    """TTL bounds, which the database also enforces with a CHECK constraint."""

    @pytest.mark.parametrize("ttl", [0, 60, 300, MAX_TTL])
    def test_accepts_values_in_range(self, ttl: int) -> None:
        assert validate_ttl(ttl) == ttl

    @pytest.mark.parametrize("ttl", [-1, MAX_TTL + 1])
    def test_rejects_values_out_of_range(self, ttl: int) -> None:
        with pytest.raises(ValidationError):
            validate_ttl(ttl)


class TestAddressRecords:
    """A and AAAA delegate to the standard library rather than a regex."""

    def test_a_accepts_multiple_addresses(self) -> None:
        assert validate_values("A", ["192.0.2.1", "192.0.2.2"]) == ["192.0.2.1", "192.0.2.2"]

    @pytest.mark.parametrize("value", ["999.1.1.1", "192.0.2", "not-an-ip", "2001:db8::1"])
    def test_a_rejects_non_ipv4(self, value: str) -> None:
        with pytest.raises(ValidationError):
            validate_values("A", [value])

    def test_aaaa_normalizes_compressed_form(self) -> None:
        assert validate_values("AAAA", ["2001:0DB8:0000::0001"]) == ["2001:db8::1"]

    @pytest.mark.parametrize("value", ["192.0.2.1", "gggg::1", "2001:db8:::1"])
    def test_aaaa_rejects_non_ipv6(self, value: str) -> None:
        with pytest.raises(ValidationError):
            validate_values("AAAA", [value])


class TestSingleValueTypes:
    """CNAME and PTR admit exactly one value."""

    def test_cname_qualifies_its_target(self) -> None:
        assert validate_values("CNAME", ["www.example.com"]) == ["www.example.com."]

    def test_cname_rejects_a_second_value(self) -> None:
        with pytest.raises(ValidationError):
            validate_values("CNAME", ["a.example.com.", "b.example.com."])

    def test_ptr_qualifies_its_target(self) -> None:
        assert validate_values("PTR", ["host.example.com"]) == ["host.example.com."]


class TestTxt:
    """TXT quoting and the 255-byte per-string limit."""

    def test_quotes_bare_input(self) -> None:
        assert validate_values("TXT", ["v=spf1 -all"]) == ['"v=spf1 -all"']

    def test_preserves_already_quoted_input(self) -> None:
        assert validate_values("TXT", ['"v=spf1 -all"']) == ['"v=spf1 -all"']

    def test_accepts_several_concatenated_strings(self) -> None:
        value = '"first part" "second part"'
        assert validate_values("TXT", [value]) == [value]

    def test_rejects_a_string_over_255_bytes(self) -> None:
        with pytest.raises(ValidationError):
            validate_values("TXT", ['"' + "a" * 256 + '"'])

    def test_rejects_an_unterminated_quote(self) -> None:
        with pytest.raises(ValidationError):
            validate_values("TXT", ['"unterminated'])


class TestMx:
    """MX preference-and-exchange pairs."""

    def test_accepts_and_qualifies(self) -> None:
        assert validate_values("MX", ["10 mail.example.com"]) == ["10 mail.example.com."]

    @pytest.mark.parametrize(
        "value",
        [
            "mail.example.com.",  # missing preference
            "10",  # missing exchange
            "abc mail.example.com.",  # non-numeric preference
            "70000 mail.example.com.",  # preference above 65535
            "10 192.0.2.1",  # an address where a hostname is required
        ],
    )
    def test_rejects_malformed(self, value: str) -> None:
        with pytest.raises(ValidationError):
            validate_values("MX", [value])


class TestSrv:
    """SRV priority-weight-port-target tuples."""

    def test_accepts_and_qualifies(self) -> None:
        assert validate_values("SRV", ["1 10 5060 sip.example.com"]) == [
            "1 10 5060 sip.example.com."
        ]

    @pytest.mark.parametrize(
        "value", ["1 10 5060", "1 10 70000 sip.example.com.", "a b c sip.example.com."]
    )
    def test_rejects_malformed(self, value: str) -> None:
        with pytest.raises(ValidationError):
            validate_values("SRV", [value])


class TestCaa:
    """CAA flags, the tag allowlist, and per-tag value rules."""

    @pytest.mark.parametrize(
        "value",
        [
            '0 issue "amazon.com"',
            '0 issuewild "letsencrypt.org"',
            '0 iodef "mailto:security@example.com"',
            '0 iodef "https://example.com/caa"',
            '0 issue ""',  # the documented way to forbid issuance entirely
        ],
    )
    def test_accepts_valid_values(self, value: str) -> None:
        assert validate_values("CAA", [value]) == [value]

    @pytest.mark.parametrize(
        "value",
        [
            '0 unknown "amazon.com"',  # tag outside the allowlist
            '300 issue "amazon.com"',  # flags above 255
            "0 issue amazon.com",  # unquoted value
            '0 iodef "amazon.com"',  # iodef needs a mailto: or URL
            "0 issue",  # missing value
        ],
    )
    def test_rejects_invalid_values(self, value: str) -> None:
        with pytest.raises(ValidationError):
            validate_values("CAA", [value])


class TestValueCardinality:
    """Rules that apply across every type."""

    def test_rejects_an_unsupported_type(self) -> None:
        with pytest.raises(ValidationError):
            validate_values("SPF", ["anything"])

    def test_rejects_an_empty_value_list(self) -> None:
        with pytest.raises(ValidationError):
            validate_values("A", ["   "])

    def test_ns_accepts_several_nameservers(self) -> None:
        assert validate_values("NS", ["ns1.example.com", "ns2.example.com"]) == [
            "ns1.example.com.",
            "ns2.example.com.",
        ]
