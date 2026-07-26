"""Record-set endpoints, nested beneath their hosted zone."""

from typing import Annotated

from fastapi import APIRouter, Body, Depends, Query, status

from app.api.v1.dependencies import CurrentUser, RecordServiceDep, require_csrf_token
from app.models.dns import RecordSet
from app.repositories.protocols import RecordSortField, SortOrder
from app.schemas.common import ERROR_RESPONSES, MAX_PAGE_SIZE, Page, build_page
from app.schemas.record import RecordSetResponse, RecordSetWrite
from app.schemas.zone_file import BulkDeleteRequest, BulkDeleteResponse

router = APIRouter(prefix="/hosted-zones/{zone_id}/records", tags=["Records"])


def _to_response(record: RecordSet) -> RecordSetResponse:
    """Flatten a record set and its child values into the response shape.

    Values are stored in their own table but presented as a list, which is what
    both the console and Route 53's own API show.
    """
    return RecordSetResponse(
        id=record.public_id,
        name=record.name,
        type=record.type,
        ttl=record.ttl,
        routing_policy=record.routing_policy,
        set_identifier=record.set_identifier,
        values=[value.value for value in record.values],
        is_system=bool(record.is_system),
        created_at=record.created_at,
        updated_at=record.updated_at,
    )


@router.get(
    "",
    response_model=Page[RecordSetResponse],
    summary="List records in a hosted zone",
    description=(
        "Returns the zone's record sets, including the generated SOA and NS "
        "records, which are flagged with `is_system`."
    ),
    responses={401: ERROR_RESPONSES[401], 404: ERROR_RESPONSES[404]},
)
def list_records(
    zone_id: str,
    user: CurrentUser,
    service: RecordServiceDep,
    search: Annotated[str | None, Query(max_length=255)] = None,
    type: Annotated[str | None, Query(description="Filter to one record type.")] = None,
    sort: RecordSortField = RecordSortField.NAME,
    order: SortOrder = SortOrder.ASC,
    limit: Annotated[int, Query(ge=1, le=MAX_PAGE_SIZE)] = 10,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> Page[RecordSetResponse]:
    """Return one page of a zone's record sets."""
    records, total = service.list_records(
        zone_id,
        user.id,
        search=search,
        record_type=type,
        sort=sort,
        order=order,
        limit=limit,
        offset=offset,
    )
    return build_page([_to_response(record) for record in records], total, limit, offset)


@router.post(
    "",
    response_model=RecordSetResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a record set",
    description=(
        "Creates a record set. The body is discriminated on `type`, so each record "
        "type documents its own value format and cardinality. A relative `name` "
        "such as `www` or `@` is qualified against the zone."
    ),
    responses={
        401: ERROR_RESPONSES[401],
        404: ERROR_RESPONSES[404],
        409: {
            **ERROR_RESPONSES[409],
            "description": (
                "Duplicate record set, a CNAME sharing a name with another record, "
                "or a CNAME at the zone apex."
            ),
        },
        422: ERROR_RESPONSES[422],
    },
    dependencies=[Depends(require_csrf_token)],
)
def create_record(
    zone_id: str,
    payload: Annotated[RecordSetWrite, Body()],
    user: CurrentUser,
    service: RecordServiceDep,
) -> RecordSetResponse:
    """Create one record set in the zone."""
    record = service.create_record(
        zone_id,
        user.id,
        name=payload.name,
        record_type=payload.type,
        ttl=payload.ttl,
        values=payload.values,
        routing_policy=payload.routing_policy,
        set_identifier=payload.set_identifier,
    )
    return _to_response(record)


@router.post(
    "/bulk-delete",
    response_model=BulkDeleteResponse,
    summary="Delete several record sets",
    description=(
        "Removes up to 100 record sets in one transaction. Generated SOA and NS "
        "records are refused and listed in the response, so a selection that "
        "includes one still deletes the rest."
    ),
    responses={401: ERROR_RESPONSES[401], 404: ERROR_RESPONSES[404], 422: ERROR_RESPONSES[422]},
    dependencies=[Depends(require_csrf_token)],
)
def bulk_delete_records(
    zone_id: str,
    payload: BulkDeleteRequest,
    user: CurrentUser,
    service: RecordServiceDep,
) -> BulkDeleteResponse:
    """Delete several record sets at once."""
    deleted, refused = service.delete_records(zone_id, payload.record_ids, user.id)
    return BulkDeleteResponse(deleted=deleted, refused=refused)


@router.get(
    "/{record_id}",
    response_model=RecordSetResponse,
    summary="Get a record set",
    responses={401: ERROR_RESPONSES[401], 404: ERROR_RESPONSES[404]},
)
def get_record(
    zone_id: str,
    record_id: str,
    user: CurrentUser,
    service: RecordServiceDep,
) -> RecordSetResponse:
    """Return one record set."""
    return _to_response(service.get_record(zone_id, record_id, user.id))


@router.put(
    "/{record_id}",
    response_model=RecordSetResponse,
    summary="Replace a record set",
    description=(
        "Replaces a record set's name, type, TTL, and values. The zone's generated "
        "SOA and NS records are rejected with 409."
    ),
    responses={
        401: ERROR_RESPONSES[401],
        404: ERROR_RESPONSES[404],
        409: {
            **ERROR_RESPONSES[409],
            "description": "Conflicts with another record, or the target is a system record.",
        },
        422: ERROR_RESPONSES[422],
    },
    dependencies=[Depends(require_csrf_token)],
)
def replace_record(
    zone_id: str,
    record_id: str,
    payload: Annotated[RecordSetWrite, Body()],
    user: CurrentUser,
    service: RecordServiceDep,
) -> RecordSetResponse:
    """Replace one record set's contents."""
    record = service.replace_record(
        zone_id,
        record_id,
        user.id,
        name=payload.name,
        record_type=payload.type,
        ttl=payload.ttl,
        values=payload.values,
        routing_policy=payload.routing_policy,
        set_identifier=payload.set_identifier,
    )
    return _to_response(record)


@router.delete(
    "/{record_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a record set",
    description="Deletes a record set. The zone's generated SOA and NS records cannot be removed.",
    responses={
        401: ERROR_RESPONSES[401],
        404: ERROR_RESPONSES[404],
        409: {**ERROR_RESPONSES[409], "description": "The record is a generated system record."},
    },
    dependencies=[Depends(require_csrf_token)],
)
def delete_record(
    zone_id: str,
    record_id: str,
    user: CurrentUser,
    service: RecordServiceDep,
) -> None:
    """Delete one record set."""
    service.delete_record(zone_id, record_id, user.id)
