"""Tek e-posta için super_admin garantisi (startup, CLI, güvenli HTTP seed)."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.user import User

SUPER_ADMIN_EMAIL = "admin@freshtrack.com"
SUPER_ADMIN_PASSWORD = "Admin123456"
LEGACY_SUPER_ADMIN_EMAIL = "admin@freshtrack.local"
DEFAULT_OWNER_NAME = "System Admin"
DEFAULT_BUSINESS_NAME = "FreshTrack Admin"


def _sync_super_admin_profile(user: User) -> None:
    """Rol, durum, bcrypt şifre hash ve görünen admin alanları (düz metin şifre yok)."""
    user.role = "super_admin"
    user.account_status = "approved"
    user.password_hash = hash_password(SUPER_ADMIN_PASSWORD)
    user.business_name = DEFAULT_BUSINESS_NAME
    user.owner_name = DEFAULT_OWNER_NAME


def ensure_super_admin(db: Session) -> str:
    """
    Super admin kullanıcıyı oluşturur veya günceller.

    - Legacy `admin@freshtrack.local` → canonical e-posta + tam senkron.
    - `admin@freshtrack.com` varsa → role, status, password_hash (yeniden hash),
      business_name, owner_name güncellenir.
    - Yoksa → yeni kayıt (hash_password ile uyumlu bcrypt).
    """
    normalized = SUPER_ADMIN_EMAIL.strip().lower()

    legacy = db.scalars(select(User).where(User.email == LEGACY_SUPER_ADMIN_EMAIL)).first()
    if legacy is not None:
        legacy.email = normalized
        _sync_super_admin_profile(legacy)
        db.add(legacy)
        db.commit()
        return "migrated"

    existing = db.scalars(select(User).where(User.email == normalized)).first()
    if existing is not None:
        _sync_super_admin_profile(existing)
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
