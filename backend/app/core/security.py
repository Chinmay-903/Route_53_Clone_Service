"""Password hashing, session tokens, and CSRF tokens.

"Mocked authentication" in the brief means there is no IAM integration. It does
not mean credentials may be handled carelessly, so passwords are hashed with
Argon2id and session tokens are stored only as digests.
"""

import hashlib
import hmac
import secrets
from datetime import UTC, datetime, timedelta

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError

SESSION_COOKIE_NAME = "r53_session"
CSRF_COOKIE_NAME = "r53_csrf"
CSRF_HEADER_NAME = "X-CSRF-Token"

_hasher = PasswordHasher()


def hash_password(password: str) -> str:
    """Return an Argon2id hash, including its salt and parameters."""
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    """Return True if `password` matches `password_hash`.

    A malformed stored hash returns False rather than raising, so a corrupted
    row degrades to "login failed" instead of a 500 that leaks the shape of the
    stored data.
    """
    try:
        return _hasher.verify(password_hash, password)
    except (VerifyMismatchError, InvalidHashError):
        return False


def generate_session_token() -> str:
    """Return a fresh opaque session token to hand to the browser."""
    return secrets.token_urlsafe(48)


def hash_session_token(token: str) -> str:
    """Return the digest stored as the session row's primary key.

    SHA-256 rather than Argon2 is correct here: the token is 384 bits of
    entropy, so there is no dictionary to attack and lookup must stay fast
    enough to run on every request.
    """
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def now_timestamp() -> str:
    """Return the current UTC time in the format sessions store expiries in.

    Timestamps are compared as strings throughout, which is only sound because
    this one format is used everywhere: ISO-8601 sorts chronologically.
    """
    return datetime.now(UTC).replace(microsecond=0, tzinfo=None).isoformat(sep=" ")


def session_expiry(hours: int) -> str:
    """Return the absolute expiry timestamp for a new session."""
    expires = datetime.now(UTC) + timedelta(hours=hours)
    return expires.replace(microsecond=0, tzinfo=None).isoformat(sep=" ")


def is_expired(expires_at: str) -> bool:
    """Return True if a stored expiry timestamp is in the past."""
    return expires_at <= now_timestamp()


def generate_csrf_token() -> str:
    """Return a token for the double-submit cookie pattern."""
    return secrets.token_urlsafe(32)


def csrf_tokens_match(cookie_value: str | None, header_value: str | None) -> bool:
    """Compare the CSRF cookie against the header in constant time.

    Defence in depth beyond SameSite=Lax: a cross-site page cannot read the
    cookie, so it cannot reproduce the header, even if a future browser or
    redirect chain relaxes the SameSite guarantee.
    """
    if not cookie_value or not header_value:
        return False
    return hmac.compare_digest(cookie_value, header_value)
