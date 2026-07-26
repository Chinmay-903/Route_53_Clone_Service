"""Translation of domain exceptions into RFC 9457 Problem Details responses.

This is the only module that knows both vocabularies. Services raise domain
exceptions; routers stay free of try/except; every error leaves the application
in the same documented shape, carrying a correlation ID and nothing internal.
"""

from typing import Any

import structlog
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.domain.errors import (
    ConflictError,
    DomainError,
    ImmutableRecordError,
    InvalidCredentialsError,
    NotFoundError,
    ValidationError,
)

PROBLEM_CONTENT_TYPE = "application/problem+json"

logger = structlog.get_logger(__name__)

# Each domain exception maps to exactly one status and one stable "type" slug.
# Clients branch on the slug, never on the prose in "detail".
_DOMAIN_STATUS: dict[type[DomainError], tuple[int, str]] = {
    ValidationError: (status.HTTP_422_UNPROCESSABLE_CONTENT, "validation-failed"),
    InvalidCredentialsError: (status.HTTP_401_UNAUTHORIZED, "invalid-credentials"),
    ConflictError: (status.HTTP_409_CONFLICT, "conflict"),
    ImmutableRecordError: (status.HTTP_409_CONFLICT, "record-immutable"),
    NotFoundError: (status.HTTP_404_NOT_FOUND, "not-found"),
}

_TITLES: dict[int, str] = {
    status.HTTP_400_BAD_REQUEST: "Bad request",
    status.HTTP_401_UNAUTHORIZED: "Not authenticated",
    status.HTTP_403_FORBIDDEN: "Forbidden",
    status.HTTP_404_NOT_FOUND: "Resource not found",
    status.HTTP_409_CONFLICT: "Conflict",
    status.HTTP_413_CONTENT_TOO_LARGE: "Payload too large",
    status.HTTP_422_UNPROCESSABLE_CONTENT: "Validation failed",
    status.HTTP_429_TOO_MANY_REQUESTS: "Too many requests",
    status.HTTP_500_INTERNAL_SERVER_ERROR: "Internal server error",
}


def problem_response(
    request: Request,
    status_code: int,
    problem_type: str,
    detail: str,
    extra: dict[str, Any] | None = None,
) -> JSONResponse:
    """Build an RFC 9457 response body carrying the request's correlation ID."""
    body: dict[str, Any] = {
        "type": f"/problems/{problem_type}",
        "title": _TITLES.get(status_code, "Error"),
        "status": status_code,
        "detail": detail,
        "instance": request.url.path,
        "correlation_id": getattr(request.state, "correlation_id", "unknown"),
    }
    if extra:
        body.update(extra)
    return JSONResponse(status_code=status_code, content=body, media_type=PROBLEM_CONTENT_TYPE)


def register_exception_handlers(app: FastAPI) -> None:
    """Attach every handler that produces a Problem Details response."""

    @app.exception_handler(DomainError)
    async def _handle_domain_error(request: Request, exc: DomainError) -> JSONResponse:
        status_code, problem_type = _DOMAIN_STATUS.get(
            type(exc), (status.HTTP_400_BAD_REQUEST, "bad-request")
        )
        return problem_response(request, status_code, problem_type, exc.message)

    @app.exception_handler(RequestValidationError)
    async def _handle_request_validation(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return problem_response(
            request,
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            "validation-failed",
            "The request body failed validation.",
            {"errors": _summarize_pydantic_errors(exc)},
        )

    @app.exception_handler(StarletteHTTPException)
    async def _handle_http_exception(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        return problem_response(
            request,
            exc.status_code,
            _TITLES.get(exc.status_code, "Error").lower().replace(" ", "-"),
            str(exc.detail),
        )

    @app.exception_handler(Exception)
    async def _handle_unexpected(request: Request, exc: Exception) -> JSONResponse:
        # The traceback goes to the log, never to the client: a stack trace
        # discloses file paths, library versions, and internal structure.
        logger.exception(
            "unhandled_exception",
            path=request.url.path,
            correlation_id=getattr(request.state, "correlation_id", "unknown"),
            error_type=type(exc).__name__,
        )
        return problem_response(
            request,
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "internal-error",
            "The request could not be completed. Quote the correlation ID when reporting this.",
        )


def _summarize_pydantic_errors(exc: RequestValidationError) -> list[dict[str, str]]:
    """Reduce Pydantic's error list to field-and-message pairs.

    Pydantic's raw output includes the offending input, which for a login
    request is the submitted password.
    """
    summary: list[dict[str, str]] = []
    for error in exc.errors():
        location = ".".join(str(part) for part in error["loc"] if part != "body")
        summary.append({"field": location or "body", "message": error["msg"]})
    return summary
