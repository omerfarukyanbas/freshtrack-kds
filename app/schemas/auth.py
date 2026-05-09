import re

from pydantic import BaseModel, EmailStr, Field, field_validator


class RegisterRequest(BaseModel):
    business_name: str = Field(..., min_length=1, max_length=255)
    owner_name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not re.search(r"[A-Za-z]", v) or not re.search(r"\d", v):
            raise ValueError("Şifre en az bir harf ve bir rakam içermelidir.")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    business_name: str
    owner_name: str
    email: str
    role: str


class RegisterResponse(BaseModel):
    message: str
    business_name: str
    owner_name: str
    email: str
    role: str


class ProfileResponse(BaseModel):
    business_name: str
    owner_name: str
    email: str
    role: str = "normal_user"
    phone: str | None = None
    address: str | None = None
    business_type: str = "market"
    created_at: str
    account_status: str = "Aktif"


class UpdateProfileRequest(BaseModel):
    business_name: str = Field(..., min_length=1, max_length=255)
    owner_name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=32)
    address: str | None = Field(default=None, max_length=512)
    business_type: str = Field(default="market")

    @field_validator("business_type")
    @classmethod
    def business_type_allowed(cls, v: str) -> str:
        normalized = v.strip().lower()
        allowed = {"market", "bakkal", "mini market"}
        if normalized not in allowed:
            raise ValueError("business_type yalnizca market, bakkal veya mini market olabilir.")
        return normalized


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1, max_length=128)
    new_password: str = Field(..., min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not re.search(r"[A-Za-z]", v) or not re.search(r"\d", v):
            raise ValueError("Yeni sifre en az bir harf ve bir rakam icermelidir.")
        return v
