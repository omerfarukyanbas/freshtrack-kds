"""Super admin kullanıcıyı veritabanında garanti altına alır (bcrypt, auth ile aynı)."""

from app.database.session import SessionLocal
from app.services.super_admin_seed import SUPER_ADMIN_EMAIL, ensure_super_admin


def main() -> None:
    db = SessionLocal()
    try:
        action = ensure_super_admin(db)
        print(f"[{action}] super_admin: {SUPER_ADMIN_EMAIL}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
