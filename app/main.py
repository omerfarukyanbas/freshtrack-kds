"""
FreshTrack KDS — FastAPI giriş noktası.

Swagger: http://127.0.0.1:8000/docs
ReDoc:   http://127.0.0.1:8000/redoc
OpenAPI: http://127.0.0.1:8000/openapi.json
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database.migrate import (
    ensure_product_created_at_column,
    ensure_product_last_30_days_sales_column,
    ensure_product_past_sales_30d_column,
    ensure_product_user_id_column,
    ensure_products_created_at_not_null,
    ensure_user_address_column,
    ensure_user_business_type_column,
    ensure_user_phone_column,
    ensure_user_account_status_column,
    ensure_user_role_column,
)
from app.core.config import CORS_ALLOW_ORIGINS
from app.database.session import Base, engine
import app.models  # noqa: F401 - register SQLAlchemy models on Base.metadata
from app.routes.auth import router as auth_router
from app.routes.predict import router as predict_router
from app.routes.products import router as products_router
from app.routes.admin import router as admin_router
from app.routes.internal_seed import router as internal_seed_router


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    ensure_product_user_id_column()
    ensure_product_past_sales_30d_column()
    ensure_product_created_at_column()
    ensure_products_created_at_not_null()
    ensure_product_last_30_days_sales_column()
    ensure_user_phone_column()
    ensure_user_address_column()
    ensure_user_business_type_column()
    ensure_user_account_status_column()
    ensure_user_role_column()
    yield


# docs_url / redoc_url / openapi_url: None yapılırsa UI kapanır; burada açıkça etkin.
app = FastAPI(
    title="FreshTrack KDS",
    description="Ürün ve SKT odaklı mutfak ekranı (KDS) backend API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    swagger_ui_parameters={"displayRequestDuration": True},
    openapi_tags=[
        {"name": "auth", "description": "İşletme kaydı ve JWT ile giriş."},
        {"name": "products", "description": "Ürün CRUD ve fiyatlama (Authorization: Bearer)."},
        {"name": "predict", "description": "Stok tüketim tahmini (kural tabanlı)."},
        {"name": "admin", "description": "Super admin işletme yönetimi."},
    ],
)

# Yerel geliştirme + FRONTEND_URL / CORS_ORIGINS ile üretim ön yüzü.
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOW_ORIGINS,
    # Aynı makinede farklı porttan (ör. Swagger denemesi) gelen Origin için yedek
    allow_origin_regex=r"^https?://(127\.0\.0\.1|localhost)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(products_router, prefix="/api")
app.include_router(predict_router)
app.include_router(admin_router)
app.include_router(internal_seed_router)


@app.get("/health", tags=["meta"])
def health() -> dict[str, str]:
    return {"status": "ok"}
