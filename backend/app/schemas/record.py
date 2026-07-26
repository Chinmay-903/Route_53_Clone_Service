"""Record-set request and response bodies.

Create and update bodies are a discriminated union keyed on `type`. The union
buys two things a single flat model would not: cardinality is enforced per type
(a CNAME cannot arrive with three values), and `/docs` shows a correct example
for each record type instead of one generic one.

Value *syntax* is deliberately not re-implemented here. That lives in
`app.domain.dns_rules` and is applied by the service, so the rules exist in
exactly one place and are unit-testable without HTTP.
"""

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field

# Route 53's default when the console's TTL field is left untouched.
DEFAULT_TTL = 300


class _RecordBase(BaseModel):
    """Fields shared by every record-type variant."""

    name: str = Field(
        min_length=1,
        max_length=255,
        description="Record name. Relative names are qualified with the zone name.",
    )
    ttl: int = Field(default=DEFAULT_TTL, ge=0, le=2_147_483_647)
    routing_policy: Literal["Simple", "Weighted", "Latency", "Failover", "Multivalue"] = "Simple"
    set_identifier: str | None = Field(
        default=None,
        max_length=128,
        description="Distinguishes record sets sharing a name and type. Simple routing omits it.",
    )


class _MultiValueRecord(_RecordBase):
    """A type the DNS permits to carry several values under one name."""

    values: list[str] = Field(min_length=1, max_length=100)


class _SingleValueRecord(_RecordBase):
    """A type that admits exactly one value."""

    values: list[str] = Field(min_length=1, max_length=1)


class ARecord(_MultiValueRecord):
    """IPv4 address record."""

    model_config = ConfigDict(
        json_schema_extra={"examples": [{"name": "www", "values": ["192.0.2.1"], "ttl": 300}]}
    )
    type: Literal["A"]


class AAAARecord(_MultiValueRecord):
    """IPv6 address record."""

    model_config = ConfigDict(
        json_schema_extra={"examples": [{"name": "www", "values": ["2001:db8::1"], "ttl": 300}]}
    )
    type: Literal["AAAA"]


class CNAMERecord(_SingleValueRecord):
    """Canonical name record.

    Single-valued by protocol, and additionally barred from the zone apex and
    from coexisting with any sibling — both enforced in the service layer,
    because they depend on what else the zone already contains.
    """

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [{"name": "blog", "values": ["www.example.com."], "ttl": 300}]
        }
    )
    type: Literal["CNAME"]


class TXTRecord(_MultiValueRecord):
    """Text record holding one or more quoted character-strings."""

    model_config = ConfigDict(
        json_schema_extra={"examples": [{"name": "@", "values": ['"v=spf1 -all"'], "ttl": 300}]}
    )
    type: Literal["TXT"]


class MXRecord(_MultiValueRecord):
    """Mail exchanger record."""

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [{"name": "@", "values": ["10 mail.example.com."], "ttl": 3600}]
        }
    )
    type: Literal["MX"]


class NSRecord(_MultiValueRecord):
    """Name server record."""

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [{"name": "sub", "values": ["ns-1.example-dns.com."], "ttl": 172800}]
        }
    )
    type: Literal["NS"]


class PTRRecord(_SingleValueRecord):
    """Pointer record."""

    model_config = ConfigDict(
        json_schema_extra={"examples": [{"name": "1", "values": ["host.example.com."]}]}
    )
    type: Literal["PTR"]


class SRVRecord(_MultiValueRecord):
    """Service locator record."""

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [{"name": "_sip._tcp", "values": ["1 10 5060 sip.example.com."]}]
        }
    )
    type: Literal["SRV"]


class CAARecord(_MultiValueRecord):
    """Certification authority authorization record."""

    model_config = ConfigDict(
        json_schema_extra={"examples": [{"name": "@", "values": ['0 issue "amazon.com"']}]}
    )
    type: Literal["CAA"]


# SOA is absent by design: it is generated with the zone and is read-only, so
# there is no request shape that could create or replace one.
RecordSetWrite = Annotated[
    ARecord
    | AAAARecord
    | CNAMERecord
    | TXTRecord
    | MXRecord
    | NSRecord
    | PTRRecord
    | SRVRecord
    | CAARecord,
    Field(discriminator="type"),
]


class RecordSetResponse(BaseModel):
    """A record set as returned by the API.

    Built explicitly by the router rather than from the ORM object, because
    `values` has to be flattened out of the child table into a list of strings.
    """

    id: str = Field(description="Opaque record identifier.")
    name: str
    type: str
    ttl: int
    routing_policy: str
    set_identifier: str | None
    values: list[str]
    is_system: bool = Field(
        description="True for the zone's generated SOA and apex NS records, which cannot be "
        "edited or deleted."
    )
    created_at: str
    updated_at: str | None
