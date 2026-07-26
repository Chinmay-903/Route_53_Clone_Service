"""Zone-file import request and response bodies."""

from pydantic import BaseModel, Field


class SkippedLineResponse(BaseModel):
    """One record the importer declined, and why."""

    line: int = Field(description="Source line number, or 0 for a whole-record rejection.")
    text: str = Field(description="The offending line, truncated.")
    reason: str = Field(description="Why it was skipped, safe to show the user.")


class ImportResponse(BaseModel):
    """The outcome of a zone-file import."""

    created: int = Field(description="Record sets created.")
    skipped: list[SkippedLineResponse] = Field(
        description="Records that were not created, each with a reason."
    )


class BulkDeleteRequest(BaseModel):
    """Body of the bulk record delete."""

    record_ids: list[str] = Field(
        min_length=1,
        max_length=100,
        description="Record identifiers to delete. Generated records are refused.",
    )


class BulkDeleteResponse(BaseModel):
    """The outcome of a bulk delete."""

    deleted: int = Field(description="Record sets removed.")
    refused: list[str] = Field(
        description="Identifiers that were not removed, because they are generated "
        "system records or do not exist."
    )
