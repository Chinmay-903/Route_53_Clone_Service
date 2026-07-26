"""Database engine, connection pragmas, and the per-request session dependency."""

from collections.abc import Generator
from typing import Any

from sqlalchemy import Engine, create_engine, event, text
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings

# Applied to every new connection. SQLite scopes most pragmas per connection,
# so setting them once at startup would leave pooled connections unconfigured.
_CONNECTION_PRAGMAS = (
    # Readers no longer block the writer. Persists on the database file itself.
    "PRAGMA journal_mode = WAL",
    # The correct durability pairing for WAL: fsync at checkpoints, not per commit.
    "PRAGMA synchronous = NORMAL",
    # SQLite disables foreign keys by default for backwards compatibility. Without
    # this every ON DELETE CASCADE in the schema is silently inert.
    "PRAGMA foreign_keys = ON",
    # Wait for a competing writer instead of failing immediately with "locked".
    "PRAGMA busy_timeout = 5000",
    "PRAGMA temp_store = MEMORY",
)


def build_engine() -> Engine:
    """Create an engine with the pragma listener attached.

    Public so the integration tests can rebind the module-level engine to a
    temporary database file without the application code carrying a test-only
    injection seam.
    """
    settings = get_settings()
    engine = create_engine(
        settings.database_url,
        # FastAPI runs sync endpoints in a threadpool, so a connection can be
        # handed to a different thread than the one that opened it.
        connect_args={"check_same_thread": False},
        pool_pre_ping=True,
    )

    @event.listens_for(engine, "connect")
    def _apply_pragmas(dbapi_connection: Any, _record: Any) -> None:
        cursor = dbapi_connection.cursor()
        for pragma in _CONNECTION_PRAGMAS:
            cursor.execute(pragma)
        cursor.close()

    return engine


engine = build_engine()
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_session() -> Generator[Session, None, None]:
    """Yield one session per request, rolling back if the request raised.

    FastAPI caches dependency results per request, so every repository resolved
    during a request shares this session. That is what makes a multi-step write
    — creating a zone plus its SOA and NS records — atomic without a separate
    UnitOfWork abstraction.
    """
    session = SessionLocal()
    try:
        yield session
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def ping_database() -> bool:
    """Return True if the database answers a trivial query, for /healthz."""
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))
    return True
