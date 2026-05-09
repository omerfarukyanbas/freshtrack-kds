from sqlalchemy import select

from app.core.security import hash_password
from app.database.session import SessionLocal
from app.models.user import User


def seed_super_admin(
    *,
    email: str = "admin@freshtrack.com",
    password: str = "Admin12345",
    owner_name: str = "System Admin",
) -> None:
    db = SessionLocal()
    try:
        normalized_email = email.strip().lower()
        legacy_email = "admin@freshtrack.local"

        # Legacy seed compatibility: convert old .local admin email to a valid domain.
        legacy_user = db.scalars(select(User).where(User.email == legacy_email)).first()
        if legacy_user and normalized_email != legacy_email:
            legacy_user.email = normalized_email
            legacy_user.role = "super_admin"
            legacy_user.account_status = "approved"
            legacy_user.owner_name = owner_name
            db.add(legacy_user)
            db.commit()
            print(f"Migrated legacy super_admin email to: {normalized_email}")
            return
        existing = db.scalars(select(User).where(User.email == normalized_email)).first()
        if existing:
            existing.role = "super_admin"
            existing.account_status = "approved"
            existing.owner_name = owner_name
            db.add(existing)
            db.commit()
            print(f"Updated existing user as super_admin: {normalized_email}")
            return

        admin = User(
            business_name="FreshTrack HQ",
            owner_name=owner_name,
            email=normalized_email,
            password_hash=hash_password(password),
            role="super_admin",
            account_status="approved",
            business_type="market",
        )
        db.add(admin)
        db.commit()
        print(f"Created super_admin user: {normalized_email}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_super_admin()
