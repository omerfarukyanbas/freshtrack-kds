"""
Kural tabanlı talep tahmini: fiyat, stok ve geçmiş satıştan stokun tükenme günü.
Üretim ortamında numpy / scikit-learn gerektirmez.
"""

from __future__ import annotations


def train_demand_model(
    prices: list[float],
    stock_quantities: list[int],
    past_sales_list: list[float],
    days_to_sell: list[float],
) -> None:
    """
    Geçmiş örnekleri doğrular. Tahmin kural tabanlı olduğu için model eğitimi yoktur.
    Her liste aynı uzunlukta olmalıdır.
    """
    if len(prices) != len(stock_quantities) or len(prices) != len(past_sales_list):
        raise ValueError("Tüm girdi listeleri aynı uzunlukta olmalıdır.")
    if len(prices) != len(days_to_sell):
        raise ValueError("days_to_sell listesi diğerleriyle aynı uzunlukta olmalıdır.")
    if len(prices) < 3:
        raise ValueError("Eğitim için en az 3 örnek gerekir.")


class DemandPredictor:
    """Kural tabanlı tahmin; harici ML kütüphanesi kullanılmaz."""

    def __init__(self) -> None:
        pass

    def fit_default(self) -> None:
        """Uyumluluk için no-op; tahmin her zaman kural tabanlıdır."""

    def fit_from_samples(
        self,
        prices: list[float],
        stock_quantities: list[int],
        past_sales_list: list[float],
        days_to_sell: list[float],
    ) -> None:
        train_demand_model(
            prices, stock_quantities, past_sales_list, days_to_sell
        )

    @property
    def is_fitted(self) -> bool:
        return True

    def set_trained_model(self, _: object | None = None) -> None:
        """Uyumluluk için no-op (eskiden sklearn modeli atanır idi)."""

    def predict_days(
        self,
        price: float,
        stock_quantity: int,
        past_sales: float,
        discount_rate: float = 0.0,
    ) -> float:
        base_days = float(stock_quantity) / max(float(past_sales), 1.0)

        # Fiyat düşükse satış hızı artar -> tahmini gün azalır.
        if price <= 8:
            price_factor = 0.75
        elif price <= 12:
            price_factor = 0.85
        elif price <= 18:
            price_factor = 0.93
        else:
            price_factor = 1.0

        safe_discount = min(max(float(discount_rate), 0.0), 1.0)
        discount_factor = max(0.5, 1.0 - 0.7 * safe_discount)

        predicted = base_days * price_factor * discount_factor
        predicted = min(max(predicted, 1.0), 30.0)
        return round(predicted, 2)


_predictor: DemandPredictor | None = None


def get_predictor() -> DemandPredictor:
    global _predictor
    if _predictor is None:
        _predictor = DemandPredictor()
        _predictor.fit_default()
    return _predictor
