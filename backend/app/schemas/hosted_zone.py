"""Hosted-zone request and response bodies."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class HostedZoneCreate(BaseModel):
    """Body of `POST /hosted-zones`.

    Omits `public_id`, `user_id`, `record_count`, and `created_by`. A client
    cannot set ownership or forge a zone identifier because those fields have no
    representation in the input type.
    """

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "name": "example.com",
                    "comment": "Primary marketing domain",
                    "type": "Public",
                }
            ]
        }
    )

    name: str = Field(min_length=1, max_length=255, description="Domain name for the zone.")
    comment: str | None = Field(
        default=None, max_length=256, description="Shown as 'Description' in the console."
    )
    type: Literal["Public", "Private"] = "Public"


class HostedZoneUpdate(BaseModel):
    """Body of `PATCH /hosted-zones/{public_id}`.

    Only the description is mutable. A zone's name is its identity, and renaming
    one would silently orphan every record beneath it.
    """

    comment: str | None = Field(default=None, max_length=256)


class HostedZoneResponse(BaseModel):
    """A hosted zone as returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: str = Field(validation_alias="public_id", description="Route 53-style zone identifier.")
    name: str
    type: Literal["Public", "Private"]
    comment: str | None
    record_count: int
    created_by: str
    created_at: str
    updated_at: str | None
