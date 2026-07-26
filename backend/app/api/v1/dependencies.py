"""FastAPI dependencies wiring sessions, services, and the current user.

FastAPI's own `Depends` is the entire composition mechanism. A dependency-
injection container was considered and rejected: it would add indirection a
reviewer has to learn to follow a request, and buys nothing at this size.
See docs/adr/0002-layering.md.
"""

from typing import Annotated

from fastapi import Cookie, Depends, Header, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.database import get_session
from app.core.security import (
    CSRF_COOKIE_NAME,
    CSRF_HEADER_NAME,
    SESSION_COOKIE_NAME,
    csrf_tokens_match,
)
from app.models.identity import User
from app.repositories.sqlalchemy.dns import (
    SqlAlchemyHostedZoneRepository,
    SqlAlchemyRecordSetRepository,
)
from app.repositories.sqlalchemy.identity import (
    SqlAlchemySessionRepository,
    SqlAlchemyUserRepository,
)
from app.services.auth_service import AuthService
from app.services.hosted_zone_service import HostedZoneService
from app.services.record_service import RecordService

SessionDep = Annotated[Session, Depends(get_session)]
SettingsDep = Annotated[Settings, Depends(get_settings)]


def get_auth_service(session: SessionDep, settings: SettingsDep) -> AuthService:
    """Build the authentication service for this request."""
    return AuthService(
        session,
        SqlAlchemyUserRepository(session),
        SqlAlchemySessionRepository(session),
        session_ttl_hours=settings.session_ttl_hours,
    )


def get_hosted_zone_service(session: SessionDep) -> HostedZoneService:
    """Build the hosted-zone service for this request."""
    return HostedZoneService(
        session,
        SqlAlchemyHostedZoneRepository(session),
        SqlAlchemyRecordSetRepository(session),
    )


def get_record_service(
    session: SessionDep,
    zones: Annotated[HostedZoneService, Depends(get_hosted_zone_service)],
) -> RecordService:
    """Build the record service for this request."""
    return RecordService(session, SqlAlchemyRecordSetRepository(session), zones)


AuthServiceDep = Annotated[AuthService, Depends(get_auth_service)]
HostedZoneServiceDep = Annotated[HostedZoneService, Depends(get_hosted_zone_service)]
RecordServiceDep = Annotated[RecordService, Depends(get_record_service)]


def get_current_user(
    auth: AuthServiceDep,
    session_token: Annotated[str | None, Cookie(alias=SESSION_COOKIE_NAME)] = None,
) -> User:
    """Resolve the signed-in user, or reject the request with 401.

    Authorization is enforced here and again in every repository query. The
    frontend's middleware only redirects for user experience; it is never the
    thing standing between a request and someone else's data.
    """
    user = auth.resolve_session(session_token)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sign in to continue.",
        )
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_csrf_token(
    request: Request,
    session_token: Annotated[str | None, Cookie(alias=SESSION_COOKIE_NAME)] = None,
    csrf_cookie: Annotated[str | None, Cookie(alias=CSRF_COOKIE_NAME)] = None,
    csrf_header: Annotated[str | None, Header(alias=CSRF_HEADER_NAME)] = None,
) -> None:
    """Enforce the double-submit CSRF token on state-changing requests.

    Defence in depth behind SameSite=Lax: a cross-origin page can neither read
    the cookie nor set the header, so it cannot produce a matching pair.
    """
    if request.method in {"GET", "HEAD", "OPTIONS"}:
        return
    # Router-level dependencies run before the endpoint's own, so without this
    # an unauthenticated write would report 403 for a missing CSRF token and
    # never reach the 401 that actually describes the problem. There is nothing
    # to forge on behalf of a caller who has no session.
    if session_token is None:
        return
    if not csrf_tokens_match(csrf_cookie, csrf_header):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Missing or invalid CSRF token.",
        )
