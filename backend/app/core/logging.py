"""Structured logging and the correlation-ID middleware.

Every log line is JSON carrying the correlation ID that also appears in any
error response, so a user-reported failure can be traced to its log entry
without the response ever exposing internal detail.
"""

import logging
import sys
import uuid
from collections.abc import Awaitable, Callable

import structlog
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

CORRELATION_HEADER = "X-Correlation-ID"

# Values that must never reach a log, whatever nesting they arrive in.
_REDACTED_KEYS = frozenset(
    {"password", "password_hash", "token", "session_secret", "authorization", "cookie"}
)


def configure_logging(*, json_output: bool) -> None:
    """Configure structlog once at application startup.

    Args:
        json_output: True in production for machine-readable lines; False in
            development for a readable console renderer.
    """
    logging.basicConfig(format="%(message)s", stream=sys.stdout, level=logging.INFO)

    renderer: structlog.types.Processor = (
        structlog.processors.JSONRenderer()
        if json_output
        else structlog.dev.ConsoleRenderer(colors=False)
    )
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso", utc=True),
            _redact_sensitive_values,
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            renderer,
        ],
        wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
        cache_logger_on_first_use=True,
    )


def _redact_sensitive_values(
    _logger: object, _name: str, event_dict: structlog.types.EventDict
) -> structlog.types.EventDict:
    """Replace the value of any sensitive key before it is rendered."""
    for key in list(event_dict):
        if key.lower() in _REDACTED_KEYS:
            event_dict[key] = "[redacted]"
    return event_dict


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    """Assign each request a correlation ID and echo it on the response."""

    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        """Bind the ID for the request's lifetime and attach it to the response."""
        correlation_id = request.headers.get(CORRELATION_HEADER) or uuid.uuid4().hex
        request.state.correlation_id = correlation_id

        structlog.contextvars.bind_contextvars(
            correlation_id=correlation_id,
            method=request.method,
            path=request.url.path,
        )
        try:
            response = await call_next(request)
        finally:
            structlog.contextvars.clear_contextvars()

        response.headers[CORRELATION_HEADER] = correlation_id
        return response
