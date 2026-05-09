"""Tek e-posta için super_admin garantisi (CLI ve güvenli HTTP seed)."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.user import User

SUPER_ADMIN_EMAIL = "admin@freshtrack.com"
SUPER_ADMIN_PASSWORD = "Admin123456"
LEGACY_SUPER_ADMIN_EMAIL = "admin@freshtrack.local"
DEFAULT_OWNER_NAME = "System Admin"
DEFAULT_BUSINESS_NAME = "FreshTrack HQ"


def ensure_super_admin(db: Session) -> str:
    """
    Super admin kullanıcıyı oluşturur veya günceller.

    - Legacy `admin@freshtrack.local` kaydı varsa e-posta canonical adrese taşınır;
      rol, durum ve şifre hedef değerlere çekilir.
    - Canonical e-posta varsa: role=super_admin, account_status=approved (şifre dokunulmaz).
    - Yoksa: tam kayıt bcrypt hash ile oluşturulur.
    """
    normalized = SUPER_ADMIN_EMAIL.strip().lower()

    legacy = db.scalars(select(User).where(User.email == LEGACY_SUPER_ADMIN_EMAIL)).first()
    if legacy is not None:
        legacy.email = normalized
        legacy.role = "super_admin"
        legacy.account_status = "approved"
        db.add(legacy)
        db.commit()
        return "migrated"

    existing = db.scalars(select(User).where(User.email == normalized)).first()
    if existing is not None:
        existing.role = "super_admin"
        existing.account_status = "approved"
        db.add(existing)
        db.commit()
        return "updated"

    admin = User(
        business_name=DEFAULT_BUSINESS_NAME,
        owner_name=DEFAULT_OWNER_NAME,
        email=normalized,
        password_hash=hash_password(SUPER_ADMIN_PASSWORD),
        role="super_admin",
        account_status="approved",
        business_type="market",
    )
    db.add(admin)
    db.commit()
    return "created"
