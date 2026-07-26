"""Authentication and session lifecycle."""

import secrets

from sqlalchemy.orm import Session

from app.core.security import (
    generate_session_token,
    hash_password,
    hash_session_token,
    is_expired,
    session_expiry,
    verify_password,
)
from app.domain.errors import InvalidCredentialsError
from app.models.identity import User
from app.repositories.protocols import SessionRepository, UserRepository

# A hash of a throwaway password, computed once at import. Verifying against it
# when no account exists keeps the failure path's timing close to the success
# path's, so response latency does not reveal which addresses are registered.
_TIMING_DECOY_HASH = hash_password(secrets.token_urlsafe(32))


class AuthService:
    """Verifies credentials and manages server-side sessions."""

    def __init__(
        self,
        session: Session,
        users: UserRepository,
        sessions: SessionRepository,
        *,
        session_ttl_hours: int,
    ) -> None:
        """Take the request session, both repositories, and the session lifetime."""
        self._session = session
        self._users = users
        self._sessions = sessions
        self._ttl_hours = session_ttl_hours

    def login(self, email: str, password: str) -> tuple[User, str]:
        """Verify credentials and open a session.

        Returns:
            The authenticated user and the opaque session token to set as a
            cookie. Only the token's hash is stored.

        Raises:
            InvalidCredentialsError: If the address is unknown or the password
                does not match. The same error covers both.
        """
        user = self._users.get_by_email(email)
        if user is None:
            verify_password(password, _TIMING_DECOY_HASH)
            raise InvalidCredentialsError("The email or password is incorrect.")
        if not verify_password(password, user.password_hash):
            raise InvalidCredentialsError("The email or password is incorrect.")

        # Opportunistic cleanup: keeps the table bounded without a scheduler.
        self._sessions.delete_expired()

        token = generate_session_token()
        self._sessions.create(
            session_id=hash_session_token(token),
            user_id=user.id,
            expires_at=session_expiry(self._ttl_hours),
        )
        self._session.commit()
        return user, token

    def resolve_session(self, token: str | None) -> User | None:
        """Return the user behind a session token, or None if it is not usable.

        An expired session is deleted on sight rather than merely ignored, so a
        stale cookie cannot be replayed after a clock change.
        """
        if not token:
            return None

        session_id = hash_session_token(token)
        row = self._sessions.get(session_id)
        if row is None:
            return None
        if is_expired(row.expires_at):
            self._sessions.delete(session_id)
            self._session.commit()
            return None
        return self._users.get_by_id(row.user_id)

    def logout(self, token: str | None) -> None:
        """End a session. Logging out without one is not an error."""
        if not token:
            return
        self._sessions.delete(hash_session_token(token))
        self._session.commit()
