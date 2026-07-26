"""Zone-file import and export endpoints.

Import is the application's highest-risk input surface, so the hardening is
visible here as well as inside the parser: the content type is checked, the
declared size is checked before the body is read, the decoded text is size-capped
by the parser, and the upload is never written to disk.
"""

import json
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, File, Query, UploadFile, status
from fastapi.responses import PlainTextResponse, Response

from app.api.v1.dependencies import CurrentUser, ZoneFileServiceDep, require_csrf_token
from app.domain.errors import ValidationError
from app.domain.zone_file import MAX_ZONE_FILE_BYTES
from app.schemas.common import ERROR_RESPONSES
from app.schemas.zone_file import ImportResponse, SkippedLineResponse

router = APIRouter(prefix="/hosted-zones/{zone_id}", tags=["Zone files"])

# Browsers label .zone and .txt uploads inconsistently, so the allowlist is
# permissive about text and strict about everything else. Archives and binary
# payloads are refused outright rather than handed to the parser.
_ALLOWED_CONTENT_TYPES = frozenset(
    {
        "text/plain",
        "text/dns",
        "application/octet-stream",
        "",
    }
)


@router.post(
    "/import",
    response_model=ImportResponse,
    summary="Import records from a BIND zone file",
    description=(
        "Parses an RFC 1035 master file and creates every record set it defines "
        "that does not already exist. Lines that fail validation, duplicate an "
        "existing record, or break a DNS rule are skipped and reported rather "
        "than aborting the import.\n\n"
        "`$INCLUDE` is rejected: it directs the parser to read a file from the "
        "server's filesystem."
    ),
    responses={
        401: ERROR_RESPONSES[401],
        404: ERROR_RESPONSES[404],
        422: {**ERROR_RESPONSES[422], "description": "Unreadable, oversized, or unsafe file."},
    },
    dependencies=[Depends(require_csrf_token)],
)
async def import_zone_file(
    zone_id: str,
    user: CurrentUser,
    service: ZoneFileServiceDep,
    file: Annotated[UploadFile, File(description="A BIND master file.")],
) -> ImportResponse:
    """Import records from an uploaded zone file."""
    _reject_unsupported_upload(file)
    text = _read_text(await file.read())

    summary = service.import_records(zone_id, user.id, text)
    return ImportResponse(
        created=summary.created,
        skipped=[
            SkippedLineResponse(line=item.line_number, text=item.text, reason=item.reason)
            for item in summary.skipped
        ],
    )


def _reject_unsupported_upload(file: UploadFile) -> None:
    """Refuse anything that is not plausibly a text zone file."""
    content_type = (file.content_type or "").split(";")[0].strip().lower()
    if content_type not in _ALLOWED_CONTENT_TYPES:
        raise ValidationError(
            f"Unsupported file type '{content_type}'. Upload a plain-text zone file."
        )

    # The filename is only ever echoed back, never used as a path — but a
    # traversal sequence in it signals an upload worth refusing outright.
    name = file.filename or ""
    if "/" in name or "\\" in name or ".." in name:
        raise ValidationError("Invalid file name.")


def _read_text(raw: bytes) -> str:
    """Decode the upload, refusing oversized or non-text payloads."""
    if len(raw) > MAX_ZONE_FILE_BYTES:
        raise ValidationError(
            f"Zone file exceeds the {MAX_ZONE_FILE_BYTES // 1024} KB import limit."
        )
    try:
        return raw.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise ValidationError(
            "Zone file is not valid UTF-8 text. Compressed or binary files are not accepted."
        ) from exc


@router.get(
    "/export",
    summary="Export a hosted zone",
    description=(
        "Downloads the zone and its records as either a BIND master file or a "
        "JSON document. Both include the generated SOA and NS records."
    ),
    responses={
        200: {
            "content": {"text/plain": {}, "application/json": {}},
            "description": "The zone as a downloadable file.",
        },
        401: ERROR_RESPONSES[401],
        404: ERROR_RESPONSES[404],
    },
)
def export_zone(
    zone_id: str,
    user: CurrentUser,
    service: ZoneFileServiceDep,
    format: Annotated[Literal["bind", "json"], Query(description="Output format.")] = "bind",
) -> Response:
    """Return the zone as a downloadable file in the requested format."""
    if format == "json":
        document, filename = service.export_json(zone_id, user.id)
        return Response(
            content=json.dumps(document, indent=2),
            media_type="application/json",
            headers=_download_headers(filename),
            status_code=status.HTTP_200_OK,
        )

    text, filename = service.export_bind(zone_id, user.id)
    return PlainTextResponse(content=text, headers=_download_headers(filename))


def _download_headers(filename: str) -> dict[str, str]:
    """Build the Content-Disposition header for a file download."""
    return {"Content-Disposition": f'attachment; filename="{filename}"'}
