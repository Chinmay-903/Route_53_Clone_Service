"""Application factory: middleware, routers, and exception handlers.

Middleware order matters and is not incidental. Correlation IDs are assigned
first so every later layer — including the error handlers — can quote one.
"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import cast

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from starlette.types import ExceptionHandler

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.database import ping_database
from app.core.errors import register_exception_handlers
from app.core.logging import CorrelationIdMiddleware, configure_logging
from app.core.middleware import BodySizeLimitMiddleware, SecurityHeadersMiddleware
from app.core.rate_limit import limiter
from app.seed import seed_database

logger = structlog.get_logger(__name__)

DESCRIPTION = """
A functional clone of the AWS Route 53 console's hosted zone and record
management, built as a take-home exercise.

**This project is not affiliated with, endorsed by, or connected to Amazon Web
Services.** It performs no DNS resolution; records are stored and validated, not
served.

Authentication is a session cookie. Sign in through `POST /api/v1/auth/login`,
then send the returned CSRF token in the `X-CSRF-Token` header on every write.
"""


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    """Seed the database on boot so a reviewer never lands on an empty console."""
    seed_database()
    logger.info("application_started", environment=get_settings().environment)
    yield


def create_app() -> FastAPI:
    """Build and configure the FastAPI application."""
    settings = get_settings()
    configure_logging(json_output=settings.is_production)

    app = FastAPI(
        title="Route 53 Console Clone API",
        description=DESCRIPTION,
        version="1.0.0",
        lifespan=lifespan,
        # Interactive docs are a deliverable in development and an information
        # disclosure in production, where they are switched off entirely.
        docs_url=None if settings.is_production else "/docs",
        redoc_url=None if settings.is_production else "/redoc",
        openapi_url=None if settings.is_production else "/openapi.json",
        # Gives the generated TypeScript client clean method names such as
        # `listHostedZones` instead of a mangled path-and-verb string.
        generate_unique_id_function=lambda route: route.name,
    )

    app.state.limiter = limiter
    # slowapi types its handler against its own exception rather than the base
    # Exception that Starlette's registry declares.
    app.add_exception_handler(
        RateLimitExceeded, cast(ExceptionHandler, _rate_limit_exceeded_handler)
    )

    # Starlette applies middleware in reverse registration order, so the
    # correlation ID added last runs first and is available to everything else.
    app.add_middleware(SlowAPIMiddleware)
    app.add_middleware(BodySizeLimitMiddleware)
    app.add_middleware(SecurityHeadersMiddleware, enable_hsts=settings.is_production)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "X-CSRF-Token", "X-Correlation-ID"],
        expose_headers=["X-Correlation-ID"],
    )
    app.add_middleware(CorrelationIdMiddleware)

    register_exception_handlers(app)
    app.include_router(api_router)

    @app.get("/healthz", tags=["Operations"], summary="Health check")
    def healthz() -> dict[str, str]:
        """Report readiness, including a database round trip."""
        ping_database()
        return {"status": "ok"}

    return app


app = create_app()
