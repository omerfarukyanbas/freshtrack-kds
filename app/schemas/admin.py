from datetime import datetime

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
