"""Authentication request and response bodies."""

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class LoginRequest(BaseModel):
    """Credentials submitted to `POST /auth/login`."""

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [{"email": "demo@route53clone.dev", "password": "your-demo-password"}]
        }
    )

    email: EmailStr = Field(max_length=320)
    # Bounded because Argon2's cost is proportional to input length, so an
    # unbounded password is a cheap way to consume server CPU.
    password: str = Field(min_length=8, max_length=256)


class UserResponse(BaseModel):
    """The authenticated account.

    `password_hash` is absent by construction: it is not a field here, so no
    change to the ORM model can leak it through this response.
    """

    model_config = ConfigDict(from_attributes=True)

    email: str
    created_at: str


class LoginResponse(BaseModel):
    """Returned on successful login, alongside the session cookie."""

    user: UserResponse
    csrf_token: str = Field(
        description="Echo this in the X-CSRF-Token header on state-changing requests."
    )
