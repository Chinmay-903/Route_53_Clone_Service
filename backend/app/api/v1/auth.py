"""Authentication endpoints."""

from fastapi import APIRouter, Request, Response, status

from app.api.v1.dependencies import AuthServiceDep, CurrentUser, SettingsDep
from app.core.config import get_settings
from app.core.rate_limit import limiter
from app.core.security import (
    CSRF_COOKIE_NAME,
    SESSION_COOKIE_NAME,
    generate_csrf_token,
)
from app.schemas.auth import LoginRequest, LoginResponse, UserResponse
from app.schemas.common import ProblemDetail

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/login",
    response_model=LoginResponse,
    summary="Sign in",
    description=(
        "Verifies credentials and opens a session. On success the response sets an "
        "httpOnly session cookie and a readable CSRF cookie; echo the returned CSRF "
        "token in the X-CSRF-Token header on every subsequent write."
    ),
    responses={
        401: {"model": ProblemDetail, "description": "Email or password incorrect."},
        429: {"model": ProblemDetail, "description": "Too many attempts from this address."},
    },
)
@limiter.limit(get_settings().login_rate_limit)
def login(
    # Unused here, but slowapi reads the client address off it to key the limit.
    request: Request,
    payload: LoginRequest,
    response: Response,
    auth: AuthServiceDep,
    settings: SettingsDep,
) -> LoginResponse:
    """Authenticate and issue the session and CSRF cookies."""
    user, token = auth.login(payload.email, payload.password)
    csrf_token = generate_csrf_token()

    max_age = settings.session_ttl_hours * 3600
    response.set_cookie(
        SESSION_COOKIE_NAME,
        token,
        max_age=max_age,
        # httpOnly keeps the token out of reach of any script, so an XSS bug
        # cannot become a session theft.
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )
    response.set_cookie(
        CSRF_COOKIE_NAME,
        csrf_token,
        max_age=max_age,
        # Readable by design: the client must copy it into a request header,
        # which is precisely what a cross-origin page cannot do.
        httponly=False,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )
    return LoginResponse(user=UserResponse.model_validate(user), csrf_token=csrf_token)


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Sign out",
    description="Deletes the session row and clears both cookies.",
)
def logout(request: Request, response: Response, auth: AuthServiceDep) -> None:
    """End the session server-side, then clear the cookies."""
    auth.logout(request.cookies.get(SESSION_COOKIE_NAME))
    response.delete_cookie(SESSION_COOKIE_NAME, path="/")
    response.delete_cookie(CSRF_COOKIE_NAME, path="/")


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Current user",
    description=(
        "Returns the signed-in account. The frontend calls this on load to decide "
        "whether a stored cookie still represents a live session."
    ),
    responses={401: {"model": ProblemDetail, "description": "No valid session."}},
)
def read_current_user(user: CurrentUser) -> UserResponse:
    """Return the authenticated account."""
    return UserResponse.model_validate(user)
