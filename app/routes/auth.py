from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.deps.auth import get_current_user
from app.models.user import User
from app.schemas.auth import (
    ChangePasswordRequest,
    LoginRequest,
    ProfileResponse,
    RegisterRequest,
    RegisterResponse,
    TokenResponse,
    UpdateProfileRequest,
)
from app.services.auth_service import login_user, register_user
from app.core.security import hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


def _profile_account_label(status_raw: str) -> str:
    return {
        "pending": "Onay bekliyor",
        "approved": "Aktif",
        "rejected": "Reddedildi",
    }.get(status_raw, status_raw)


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, db: Session = Depends(get_db)) -> RegisterResponse:
    try:
        return register_user(db, body)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    result = login_user(db, body)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-posta veya şifre hatalı",
        )
    return result


@router.get("/profile", response_model=ProfileResponse)
def get_profile(current_user: User = Depends(get_current_user)) -> ProfileResponse:
    return ProfileResponse(
        business_name=current_user.business_name,
        owner_name=current_user.owner_name,
        email=current_user.email,
        role=current_user.role,
        phone=current_user.phone,
        address=current_user.address,
        business_type=current_user.business_type or "market",
        created_at=current_user.created_at.isoformat(),
        account_status=_profile_account_label(current_user.account_status),
    )


@router.put("/profile", response_model=ProfileResponse)
def update_profile(
    body: UpdateProfileRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProfileResponse:
    normalized_email = str(body.email).strip().lower()
    existing = db.scalars(select(User).where(User.email == normalized_email)).first()
    if existing and existing.id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bu e-posta baska bir hesap tarafindan kullaniliyor.",
        )

    current_user.business_name = body.business_name.strip()
    current_user.owner_name = body.owner_name.strip()
    current_user.email = normalized_email
    current_user.phone = body.phone.strip() if body.phone else None
    current_user.address = body.address.strip() if body.address else None
    current_user.business_type = body.business_type

    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    return ProfileResponse(
        business_name=current_user.business_name,
        owner_name=current_user.owner_name,
        email=current_user.email,
        role=current_user.role,
        phone=current_user.phone,
        address=current_user.address,
        business_type=current_user.business_type or "market",
        created_at=current_user.created_at.isoformat(),
        account_status=_profile_account_label(current_user.account_status),
    )


@router.post("/change-password")
def change_password(
    body: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    if not verify_password(body.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mevcut sifre hatali.",
        )
    if body.current_password == body.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Yeni sifre mevcut sifre ile ayni olamaz.",
        )

    current_user.password_hash = hash_password(body.new_password)
    db.add(current_user)
    db.commit()
    return {"message": "Sifre basariyla guncellendi."}
