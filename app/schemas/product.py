from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator


class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    category: str = Field(..., min_length=1, max_length=128)
    purchase_price: float = Field(..., ge=0)
    selling_price: float = Field(..., ge=0)
    expiration_date: date
    stock_quantity: int = Field(..., ge=0)
    last_30_days_sales: float = Field(
        ...,
        ge=0,
        description="Son 30 günde satılan adet.",
    )

    @model_validator(mode="after")
    def selling_not_below_purchase(self) -> "ProductBase":
        if self.selling_price < self.purchase_price:
            raise ValueError("Satış fiyatı alış fiyatından düşük olamaz")
        return self


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    category: str | None = Field(None, min_length=1, max_length=128)
    purchase_price: float | None = Field(None, ge=0)
    selling_price: float | None = Field(None, ge=0)
    expiration_date: date | None = None
    stock_quantity: int | None = Field(None, ge=0)
    last_30_days_sales: float | None = Field(None, ge=0)


class ProductRead(ProductBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    remaining_days: int
    shelf_status: str
    created_at: datetime | None = Field(
        default=None,
        description="Kayıt zamanı; eski DB satırlarında geçici olarak None olabilir.",
    )
    daily_sales_rate: float = Field(
        ...,
        description="last_30_days_sales / 30",
    )


class DynamicPricingResult(BaseModel):
    discount_rate: float = Field(
        ...,
        ge=0,
        le=1,
        description="İndirim oranı (0 ile 1 arası).",
    )
    new_price: float = Field(..., ge=0)
    remaining_days: int
    last_30_days_sales: float = Field(..., ge=0)
    daily_sales_rate: float = Field(..., ge=0)
    estimated_days_to_sell: float = Field(..., ge=0)
    pricing_reason: str


class ProductSalesHistoryResponse(BaseModel):
    product_id: int
    last_30_days_sales: float = Field(..., ge=0)


class ProductImportFailedRow(BaseModel):
    row_number: int
    row_data: dict[str, str]
    errors: list[str]


class ProductImportCsvResponse(BaseModel):
    imported_count: int = Field(..., ge=0)
    failed_count: int = Field(..., ge=0)
    failed_rows: list[ProductImportFailedRow]
