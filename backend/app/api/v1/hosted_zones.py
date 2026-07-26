"""Hosted-zone endpoints.

Routers stay thin: parse, delegate, return. Business rules live in the service
and error translation lives in the exception handlers, so there is no try/except
anywhere in this file.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from app.api.v1.dependencies import CurrentUser, HostedZoneServiceDep, require_csrf_token
from app.repositories.protocols import SortOrder, ZoneSortField
from app.schemas.common import ERROR_RESPONSES, MAX_PAGE_SIZE, Page, build_page
from app.schemas.hosted_zone import HostedZoneCreate, HostedZoneResponse, HostedZoneUpdate

router = APIRouter(prefix="/hosted-zones", tags=["Hosted zones"])


@router.get(
    "",
    response_model=Page[HostedZoneResponse],
    summary="List hosted zones",
    description=(
        "Returns the signed-in user's hosted zones. Sorting is restricted to an "
        "allowlist of columns, so no client value ever reaches the ORDER BY clause "
        "unvalidated."
    ),
    responses={401: ERROR_RESPONSES[401]},
)
def list_hosted_zones(
    user: CurrentUser,
    service: HostedZoneServiceDep,
    search: Annotated[str | None, Query(max_length=255, description="Substring of the name.")] = None,
    sort: ZoneSortField = ZoneSortField.NAME,
    order: SortOrder = SortOrder.ASC,
    limit: Annotated[int, Query(ge=1, le=MAX_PAGE_SIZE)] = 10,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> Page[HostedZoneResponse]:
    """Return one page of the user's hosted zones."""
    zones, total = service.list_zones(
        user.id, search=search, sort=sort, order=order, limit=limit, offset=offset
    )
    items = [HostedZoneResponse.model_validate(zone) for zone in zones]
    return build_page(items, total, limit, offset)


@router.post(
    "",
    response_model=HostedZoneResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a hosted zone",
    description=(
        "Creates a zone together with its generated SOA record and apex NS record "
        "listing four name servers, in one transaction. Both are read-only "
        "afterwards."
    ),
    responses={
        401: ERROR_RESPONSES[401],
        409: {**ERROR_RESPONSES[409], "description": "You already have a zone with this name."},
        422: ERROR_RESPONSES[422],
    },
    dependencies=[Depends(require_csrf_token)],
)
def create_hosted_zone(
    payload: HostedZoneCreate,
    user: CurrentUser,
    service: HostedZoneServiceDep,
) -> HostedZoneResponse:
    """Create a hosted zone and its system records."""
    zone = service.create_zone(
        user.id, name=payload.name, comment=payload.comment, zone_type=payload.type
    )
    return HostedZoneResponse.model_validate(zone)


@router.get(
    "/{zone_id}",
    response_model=HostedZoneResponse,
    summary="Get a hosted zone",
    description=(
        "Returns one zone. A zone owned by another user produces 404 rather than "
        "403, because 403 would confirm that the identifier exists."
    ),
    responses={401: ERROR_RESPONSES[401], 404: ERROR_RESPONSES[404]},
)
def get_hosted_zone(
    zone_id: str,
    user: CurrentUser,
    service: HostedZoneServiceDep,
) -> HostedZoneResponse:
    """Return one hosted zone."""
    return HostedZoneResponse.model_validate(service.get_zone(zone_id, user.id))


@router.patch(
    "/{zone_id}",
    response_model=HostedZoneResponse,
    summary="Update a hosted zone",
    description="Updates the description. A zone's name is immutable.",
    responses={401: ERROR_RESPONSES[401], 404: ERROR_RESPONSES[404], 422: ERROR_RESPONSES[422]},
    dependencies=[Depends(require_csrf_token)],
)
def update_hosted_zone(
    zone_id: str,
    payload: HostedZoneUpdate,
    user: CurrentUser,
    service: HostedZoneServiceDep,
) -> HostedZoneResponse:
    """Update a hosted zone's description."""
    zone = service.update_zone(zone_id, user.id, comment=payload.comment)
    return HostedZoneResponse.model_validate(zone)


@router.delete(
    "/{zone_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a hosted zone",
    description=(
        "Deletes a zone that holds no records beyond its generated SOA and NS. "
        "Delete the remaining records first."
    ),
    responses={
        401: ERROR_RESPONSES[401],
        404: ERROR_RESPONSES[404],
        409: {**ERROR_RESPONSES[409], "description": "The zone still contains records."},
    },
    dependencies=[Depends(require_csrf_token)],
)
def delete_hosted_zone(
    zone_id: str,
    user: CurrentUser,
    service: HostedZoneServiceDep,
) -> None:
    """Delete an empty hosted zone."""
    service.delete_zone(zone_id, user.id)
