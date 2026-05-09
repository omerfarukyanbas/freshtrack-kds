from fastapi import APIRouter, HTTPException, status

from app.schemas.predict import PredictRequest, PredictResponse, TrainRequest
from app.services.sales_predictor import get_predictor, train_demand_model

router = APIRouter(prefix="/predict", tags=["predict"])


@router.post("", response_model=PredictResponse)
def predict_days_to_sell(body: PredictRequest) -> PredictResponse:
    pred = get_predictor()
    days = pred.predict_days(
        body.price,
        body.stock_quantity,
        body.past_sales,
        body.discount_rate,
    )
    return PredictResponse(predicted_days_to_sell=days)


@router.post("/train", status_code=status.HTTP_204_NO_CONTENT)
def train_model(body: TrainRequest) -> None:
    """Gerçek satış geçmişi ile modeli yeniden eğitir (en az 5 örnek)."""
    samples = body.samples
    prices = [s.price for s in samples]
    stocks = [s.stock_quantity for s in samples]
    past = [s.past_sales for s in samples]
    targets = [s.days_to_sell for s in samples]
    try:
        model = train_demand_model(prices, stocks, past, targets)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e
    get_predictor().set_trained_model(model)
