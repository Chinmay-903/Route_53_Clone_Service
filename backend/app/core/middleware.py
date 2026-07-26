"""Security headers and request-size limiting.

These are enforced at the API as well as in the Next.js middleware. Duplication
is intentional: the API is reachable directly, so it cannot rely on headers set
by a frontend the client may never contact.
"""

from collections.abc import Awaitable, Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

# One megabyte comfortably exceeds any legitimate JSON body here and any
# realistic zone file, while bounding what a single request can allocate.
MAX_BODY_BYTES = 1_048_576

_SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
    # The API serves JSON only, so it needs no script, style, or frame sources.
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
}


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add hardening headers to every response, including error responses."""

    def __init__(self, app: Callable[..., object], *, enable_hsts: bool) -> None:
        """Enable HSTS only in production, where the origin is genuinely HTTPS."""
        super().__init__(app)  # type: ignore[arg-type]  - Starlette's own annotation is loose
        self._enable_hsts = enable_hsts

    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        """Apply the header set to the downstream response."""
        response = await call_next(request)
        response.headers.update(_SECURITY_HEADERS)
        if self._enable_hsts:
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains"
            )
        return response


class BodySizeLimitMiddleware(BaseHTTPMiddleware):
    """Reject requests declaring a body larger than `MAX_BODY_BYTES`."""

    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        """Short-circuit oversized requests before any body is read."""
        declared = request.headers.get("content-length")
        if declared and declared.isdigit() and int(declared) > MAX_BODY_BYTES:
            return JSONResponse(
                status_code=413,
                media_type="application/problem+json",
                content={
                    "type": "/problems/payload-too-large",
                    "title": "Payload too large",
                    "status": 413,
                    "detail": f"Request bodies are limited to {MAX_BODY_BYTES} bytes.",
                    "instance": request.url.path,
                    "correlation_id": getattr(request.state, "correlation_id", "unknown"),
                },
            )
        return await call_next(request)
