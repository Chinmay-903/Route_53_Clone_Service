"""SQLAlchemy implementations of the user and session repositories."""

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.security import now_timestamp
from app.models.identity import User, UserSession


class SqlAlchemyUserRepository:
    """Persists user accounts. Satisfies `protocols.UserRepository`."""

    def __init__(self, session: Session) -> None:
        """Bind the repository to the request's session."""
        self._session = session

    def get_by_email(self, email: str) -> User | None:
        """Return the user with this address, matched case-insensitively."""
        # The column's NOCASE collation makes this comparison case-insensitive
        # without a function call that would defeat the unique index.
        return self._session.scalars(select(User).where(User.email == email)).first()

    def get_by_id(self, user_id: int) -> User | None:
        """Return the user with this internal identifier, or None."""
        return self._session.get(User, user_id)

    def create(self, email: str, password_hash: str) -> User:
        """Stage a new account in the current transaction."""
        user = User(email=email, password_hash=password_hash)
        self._session.add(user)
        self._session.flush()
        return user


class SqlAlchemySessionRepository:
    """Persists browser sessions. Satisfies `protocols.SessionRepository`."""

    def __init__(self, session: Session) -> None:
        """Bind the repository to the request's session."""
        self._session = session

    def create(self, session_id: str, user_id: int, expires_at: str) -> UserSession:
        """Stage a new session row."""
        row = UserSession(id=session_id, user_id=user_id, expires_at=expires_at)
        self._session.add(row)
        self._session.flush()
        return row

    def get(self, session_id: str) -> UserSession | None:
        """Return the session with this hashed identifier, or None."""
        return self._session.get(UserSession, session_id)

    def delete(self, session_id: str) -> None:
        """Remove a session if it is present; absence is not an error."""
        row = self._session.get(UserSession, session_id)
        if row is not None:
            self._session.delete(row)

    def delete_expired(self) -> int:
        """Remove every expired session and return how many were removed.

        Called opportunistically on login rather than from a scheduler, which
        keeps the deployment to a single process with no background worker.
        """
        result = self._session.execute(
            delete(UserSession).where(UserSession.expires_at <= now_timestamp())
        )
        return result.rowcount or 0
