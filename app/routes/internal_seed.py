"""Üretim bootstrap: env sırrı ile super_admin upsert (PUBLIC_URL üzerinden çağrılabilir)."""

import secrets

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database.session import get_db
from app.services.super_admin_seed import SUPER_ADMIN_EMAIL, ensure_super_admin

router = APIRouter(tags=["internal"])


@router.post("/internal/seed-super-admin")
def seed_super_admin_http(
    db: Session = Depends(get_db),
    x_super_admin_seed_secret: str | None = Header(default=None, alias="X-Super-Admin-Seed-Secret"),
) -> dict[str, str]:
    expected = settings.super_admin_seed_secret
    if not expected:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="SUPER_ADMIN_SEED_SECRET tanımlı değil; endpoint devre dışı.",
        )
    provided = (x_super_admin_seed_secret or "").strip()
    if len(provided) != len(expected):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Geçersiz sırr")
    if not secrets.compare_digest(provided, expected):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Geçersiz sırr")

    action = ensure_super_admin(db)
    return {"action": action, "email": SUPER_ADMIN_EMAIL.strip().lower()}
