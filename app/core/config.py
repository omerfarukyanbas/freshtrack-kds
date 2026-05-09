import os


def _normalize_database_url(url: str) -> str:
    """Railway/Heroku bazen postgres:// verir; SQLAlchemy postgresql:// bekler."""
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql://", 1)
    return url


def _parse_cors_origins() -> list[str]:
    """FRONTEND_URL ve CORS_ORIGINS ile üretim ön yüz adreslerini ekler."""
    local_defaults = [
        "http://127.0.0.1:8000",
        "http://localhost:8000",
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://localhost:3000",
    ]
    out: list[str] = []
    seen: set[str] = set()

    def add(url: str) -> None:
        u = url.strip().rstrip("/")
        if u and u not in seen:
            seen.add(u)
            out.append(u)

    for o in local_defaults:
        add(o)

    front = os.getenv("FRONTEND_URL", "").strip()
    if front:
        add(front)

    extra = os.getenv("CORS_ORIGINS", "").strip()
    if extra:
        for part in extra.split(","):
            add(part)

    return out


class Settings:
    jwt_algorithm: str = "HS256"

    def __init__(self) -> None:
        raw_db = os.getenv("DATABASE_URL", "").strip()
        if raw_db:
            self.database_url = _normalize_database_url(raw_db)
        else:
            self.database_url = "sqlite:///./freshtrack.db"

        self.jwt_secret = (
            os.getenv("SECRET_KEY")
            or os.getenv("JWT_SECRET")
            or "freshtrack-dev-secret-change-in-production"
        )
        self.access_token_expire_minutes = int(
            os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", str(60 * 24 * 7))
        )


settings = Settings()

CORS_ALLOW_ORIGINS = _parse_cors_origins()
