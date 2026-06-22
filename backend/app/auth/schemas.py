from datetime import datetime

from pydantic import BaseModel


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class UserResponse(BaseModel):
    id: int
    organization_id: int
    name: str
    email: str
    role: str
    phone: str | None = None
    avatar_url: str | None = None
    is_active: bool
    created_at: datetime


class RegisterRequest(BaseModel):
    organization_slug: str
    name: str
    email: str
    password: str
    phone: str | None = None
