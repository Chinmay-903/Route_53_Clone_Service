"""Shared response envelopes and query-parameter models."""

from typing import Generic, TypeVar

from pydantic import BaseModel, Field

ItemT = TypeVar("ItemT")

MAX_PAGE_SIZE = 100


class Page(BaseModel, Generic[ItemT]):
    """One page of a listing.

    `total` exists because the console's pagination control renders a page
    count. `next_token` mirrors the token-paginated shape of Route 53's own list
    APIs and lets a client iterate without tracking offsets itself.
    """

    items: list[ItemT]
    total: int = Field(description="Total rows matching the filter, ignoring pagination.")
    next_token: str | None = Field(
        default=None,
        description="Offset to pass as `offset` for the next page, or null on the last page.",
    )


def build_page(items: list[ItemT], total: int, limit: int, offset: int) -> Page[ItemT]:
    """Wrap a result set in a `Page`, computing whether a next page exists."""
    consumed = offset + len(items)
    return Page(items=items, total=total, next_token=str(consumed) if consumed < total else None)


class ProblemDetail(BaseModel):
    """An RFC 9457 error body.

    Declared so it appears in the OpenAPI schema and therefore in the generated
    TypeScript client, giving the frontend a typed error shape.
    """

    type: str = Field(description="Stable slug identifying the error class.")
    title: str
    status: int
    detail: str = Field(description="Human-readable explanation, safe to display.")
    instance: str = Field(description="Path of the request that failed.")
    correlation_id: str = Field(description="Quote this when reporting a failure.")


# Reused by every router so error cases are documented once.
ERROR_RESPONSES: dict[int | str, dict[str, object]] = {
    401: {"model": ProblemDetail, "description": "No valid session cookie was presented."},
    404: {"model": ProblemDetail, "description": "Not found, or owned by another user."},
    409: {"model": ProblemDetail, "description": "Conflicts with existing state."},
    422: {"model": ProblemDetail, "description": "Failed validation."},
}
