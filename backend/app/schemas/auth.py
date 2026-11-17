from pydantic import BaseModel, EmailStr
from app.models.user import Role


class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    requested_role: str = "USER"
    requested_categories: list[str] = []


class LoginRequest(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
