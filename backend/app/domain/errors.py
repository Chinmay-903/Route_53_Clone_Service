"""Domain exceptions.

These carry no HTTP concepts. `app.core.errors` is the single place that maps
them onto status codes and RFC 9457 response bodies, which keeps the service
layer free of framework knowledge.
"""


class DomainError(Exception):
    """Base class for every rule violation raised by the domain or services."""

    def __init__(self, message: str) -> None:
        """Store the human-readable explanation shown to the caller."""
        super().__init__(message)
        self.message = message


class ValidationError(DomainError):
    """A value failed a syntactic or per-record-type rule. Maps to 422."""


class ConflictError(DomainError):
    """A request contradicts existing state, such as a duplicate record set.

    Maps to 409.
    """


class InvalidCredentialsError(DomainError):
    """Login failed. Maps to 401.

    Deliberately does not record which field was wrong, so the response cannot
    be used to enumerate registered addresses.
    """


class NotFoundError(DomainError):
    """A resource does not exist, or exists but is owned by another user.

    Both cases deliberately produce the same 404. Returning 403 for the second
    would confirm the resource exists to someone with no right to know that.
    """


class ImmutableRecordError(DomainError):
    """An edit or delete targeted a zone's auto-created SOA or apex NS record.

    Maps to 409.
    """
