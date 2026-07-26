"""Application settings, read from the environment exactly once at import time.

No configuration value is ever written as a literal in source. Everything the
application needs arrives through the environment, so the same image runs
locally and in production with different values.
"""

from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Environment-backed configuration for the API."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    environment: Literal["development", "production"] = "development"

    database_url: str = "sqlite:///./route53.db"

    # Length is enforced rather than suggested: a short secret silently weakens
    # every session identifier derived from it.
    session_secret: str = Field(min_length=32)
    session_ttl_hours: int = 12

    cors_origins: str = "http://localhost:3000"

    demo_user_email: str = "demo@route53clone.dev"
    demo_user_password: str = Field(min_length=8)

    login_rate_limit: str = "5/minute"

    # "lax" is correct when the browser talks to one origin — locally, or behind
    # a proxy that puts the API and the console on the same site.
    #
    # A split deployment (console on vercel.app, API on fly.dev) is *cross-site*,
    # and a Lax cookie is simply not sent on those requests: login would appear
    # to succeed and every call after it would 401. "none" is the only value
    # that works there, and it requires Secure, which `cookie_secure` enforces.
    #
    # SameSite is defence in depth here, not the CSRF control. The double-submit
    # token in `security.py` is, and it keeps working under either setting.
    cookie_samesite: Literal["lax", "none"] = "lax"

    @field_validator("cors_origins")
    @classmethod
    def reject_wildcard_origin(cls, value: str) -> str:
        """Reject "*", which browsers refuse to honour alongside credentials."""
        if "*" in value:
            raise ValueError("CORS_ORIGINS cannot contain '*' when credentials are allowed")
        return value

    @property
    def cors_origin_list(self) -> list[str]:
        """The CORS allowlist as a list of exact origins."""
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def is_production(self) -> bool:
        """True when running with production hardening enabled."""
        return self.environment == "production"

    @property
    def cookie_secure(self) -> bool:
        """Whether session cookies carry the Secure flag.

        False in development only, because localhost is served over plain HTTP
        and a Secure cookie would never be sent back.
        """
        return self.is_production or self.cookie_samesite == "none"


@lru_cache
def get_settings() -> Settings:
    """Return the process-wide settings singleton.

    Fields without defaults are supplied by pydantic-settings from the
    environment, which is why the constructor takes no arguments here.
    """
    return Settings()
