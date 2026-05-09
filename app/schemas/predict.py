from pydantic import BaseModel, Field


class PredictRequest(BaseModel):
    """past_sales: ör. son 30 günde satılan adet (talep göstergesi)."""

    price: float = Field(..., ge=0)
    stock_quantity: int = Field(..., ge=0)
    past_sales: float = Field(..., ge=0)
    discount_rate: float = Field(
        default=0,
        ge=0,
        le=1,
        description="İndirim oranı (0-1). Örn: %20 için 0.2",
    )


class PredictResponse(BaseModel):
    predicted_days_to_sell: float = Field(..., ge=0)


class TrainSample(BaseModel):
    price: float = Field(..., ge=0)
    stock_quantity: int = Field(..., ge=0)
    past_sales: float = Field(..., ge=0)
    days_to_sell: float = Field(..., gt=0)


class TrainRequest(BaseModel):
    samples: list[TrainSample] = Field(..., min_length=5)
