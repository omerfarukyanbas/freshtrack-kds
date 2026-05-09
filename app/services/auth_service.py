from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest, RegisterResponse, TokenResponse

ACCOUNT_PENDING_LOGIN_MSG = "Hesabınız yönetici onayı bekliyor."
ACCOUNT_REJECTED_LOGIN_MSG = "Hesabınız reddedildi."


def ensure_account_allows_login(user: User) -> None:
    if user.role == "super_admin":
        return
    if user.account_status == "pending":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=ACCOUNT_PENDING_LOGIN_MSG,
        )
    if user.account_status == "rejected":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=ACCOUNT_REJECTED_LOGIN_MSG,
        )


def register_user(db: Session, data: RegisterRequest) -> RegisterResponse:
    normalized = str(data.email).lower().strip()
    existing = db.scalars(select(User).where(User.email == normalized)).first()
    if existing:
        raise ValueError("Bu e-posta ile kayıtlı bir işletme zaten var.")

    user = User(
        business_name=data.business_name,
        owner_name=data.owner_name,
        email=normalized,
        password_hash=hash_password(data.password),
        role="normal_user",
        account_status="pending",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return RegisterResponse(
        message="Kayıt alındı. Hesabınız yönetici onayından sonra aktifleşecektir.",
        business_name=user.business_name,
        owner_name=user.owner_name,
        email=user.email,
        role=user.role,
    )


def login_user(db: Session, data: LoginRequest) -> TokenResponse | None:
    email = str(data.email).lower().strip()
    user = db.scalars(select(User).where(User.email == email)).first()
    if not user or not verify_password(data.password, user.password_hash):
        return None
    ensure_account_allows_login(user)
    token = create_access_token(subject_user_id=user.id, email=user.email)
    return TokenResponse(
        access_token=token,
        business_name=user.business_name,
        owner_name=user.owner_name,
        email=user.email,
        role=user.role,
    )
