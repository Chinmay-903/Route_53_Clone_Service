"""The SOA and NS records generated with every new hosted zone.

Route 53 creates an apex NS record listing four name servers plus an SOA record
for every public hosted zone, and neither can be deleted. Encoding that here —
rather than leaving a new zone empty — is a large part of what separates a
Route 53 clone from a CRUD form over a records table.

The name servers below are fictional and belong to this project. Using AWS's
real delegation hostnames would be borrowing a trademarked asset for no
functional gain, since nothing here resolves DNS.
"""

from typing import Final

NAMESERVER_DOMAIN: Final = "r53clone-dns"

# Four servers across four top-level domains, mirroring the real console's
# practice of spreading delegation across TLDs to survive a single TLD outage.
NAMESERVER_TLDS: Final = ("com", "net", "org", "co.uk")

# Two record sets — one SOA, one NS holding four values — so a new zone reports
# a record count of 2, matching the console.
DEFAULT_RECORD_SET_COUNT: Final = 2

NS_TTL: Final = 172_800  # 48 hours, the conventional delegation TTL.
SOA_TTL: Final = 900

# Refresh, retry, expire, and minimum, in the order an SOA record states them.
_SOA_TIMERS: Final = "1 7200 900 1209600 86400"


def default_nameservers() -> list[str]:
    """Return the four fully qualified name servers assigned to a new zone."""
    return [
        f"ns-{index}.{NAMESERVER_DOMAIN}.{tld}."
        for index, tld in enumerate(NAMESERVER_TLDS, start=1)
    ]


def default_soa_value() -> str:
    """Return the SOA record's single value.

    The format is "primary-ns responsible-party serial refresh retry expire
    minimum". The responsible party is an email address with its "@" written as
    a dot, which is an SOA convention rather than a typo.
    """
    primary = default_nameservers()[0]
    responsible_party = f"hostmaster.{NAMESERVER_DOMAIN}.com."
    return f"{primary} {responsible_party} {_SOA_TIMERS}"
