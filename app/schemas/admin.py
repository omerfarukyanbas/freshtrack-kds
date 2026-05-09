from datetime import date, datetime

from pydantic import BaseModel

from app.schemas.product import ProductRead


class AdminPendingBusinessItem(BaseModel):
    id: int
    business_name: str
    owner_name: str
    email: str
    phone: str | None = None
    business_type: str = "market"
    created_at: datetime
    account_status: str


class AdminBusinessListItem(BaseModel):
    id: int
    business_name: str
    owner_name: str
    email: str
    phone: str | None = None
    address: str | None = None
    business_type: str = "market"
    created_at: datetime
    total_products: int
    critical_products: int
    total_stock: int
    estimated_risk_amount: float


class AdminBusinessDetail(BaseModel):
    id: int
    business_name: str
    owner_name: str
    email: str
    phone: str | None = None
    address: str | None = None
    business_type: str = "market"
    role: str
    created_at: datetime


class AdminBusinessProductsResponse(BaseModel):
    user_id: int
    products: list[ProductRead]


class AdminDbSummaryUserItem(BaseModel):
    id: int
    business_name: str
    owner_name: str
    email: str
    role: str
    account_status: str
    created_at: datetime


class AdminDbSummaryProductItem(BaseModel):
    id: int
    name: str
    category: str
    stock_quantity: int
    expiration_date: date
    owner_id: int | None


class AdminDbSummaryResponse(BaseModel):
    users_count: int
    products_count: int
    pending_businesses_count: int
    approved_businesses_count: int
    rejected_businesses_count: int
    latest_users: list[AdminDbSummaryUserItem]
    latest_products: list[AdminDbSummaryProductItem]
