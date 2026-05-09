"""
Basit talep tahmini: fiyat, stok ve geçmiş satıştan stokun tükenme günü (regresyon).
"""

from __future__ import annotations

import numpy as np
from sklearn.linear_model import LinearRegression

# Varsayılan sentetik veri boyutu (ilk açılışta model çalışır olsun)
_SYNTH_N = 250
_RANDOM_SEED = 42


def _features_matrix(
    price: np.ndarray,
    stock: np.ndarray,
    past_sales: np.ndarray,
) -> np.ndarray:
    """Regresyon için özellik matrisi (basit türetilmiş sütunlar)."""
    ps = np.maximum(past_sales, 1e-6)
    inv_velocity = 1.0 / (ps / 30.0)  # ~ günlük satışa ters
    return np.column_stack([price, stock, past_sales, inv_velocity])


def generate_synthetic_training_data(
    n: int = _SYNTH_N,
    seed: int = _RANDOM_SEED,
) -> tuple[np.ndarray, np.ndarray]:
    rng = np.random.default_rng(seed)
    price = rng.uniform(5.0, 200.0, n)
    stock = rng.integers(5, 400, n).astype(float)
    past_sales = rng.uniform(2.0, 120.0, n)

    daily = np.maximum(past_sales / 30.0, 0.05) + rng.normal(0.0, 0.08, n)
    daily = np.clip(daily, 0.05, None)
    noise = rng.normal(0.0, 1.5, n)
    days = stock / daily + 0.002 * price + noise
    days = np.clip(days, 0.5, 2000.0)

    X = _features_matrix(price, stock, past_sales)
    y = days
    return X, y


def train_demand_model(
    prices: list[float],
    stock_quantities: list[int],
    past_sales_list: list[float],
    days_to_sell: list[float],
) -> LinearRegression:
    """
    Verilen geçmiş örneklerle doğrusal regresyon modeli eğitir.
    Her liste aynı uzunlukta olmalıdır.
    """
    if len(prices) != len(stock_quantities) or len(prices) != len(past_sales_list):
        raise ValueError("Tüm girdi listeleri aynı uzunlukta olmalıdır.")
    if len(prices) != len(days_to_sell):
        raise ValueError("days_to_sell listesi diğerleriyle aynı uzunlukta olmalıdır.")
    if len(prices) < 3:
        raise ValueError("Eğitim için en az 3 örnek gerekir.")

    price = np.asarray(prices, dtype=float)
    stock = np.asarray(stock_quantities, dtype=float)
    past = np.asarray(past_sales_list, dtype=float)
    y = np.asarray(days_to_sell, dtype=float)

    X = _features_matrix(price, stock, past)
    model = LinearRegression()
    model.fit(X, y)
    return model


class DemandPredictor:
    """Tekil regresyon modeli; uygulama ömrü boyunca bellekte tutulur."""

    def __init__(self) -> None:
        self._model: LinearRegression | None = None

    def fit_default(self) -> None:
        X, y = generate_synthetic_training_data()
        self._model = LinearRegression()
        self._model.fit(X, y)

    def fit_from_samples(
        self,
        prices: list[float],
        stock_quantities: list[int],
        past_sales_list: list[float],
        days_to_sell: list[float],
    ) -> None:
        self._model = train_demand_model(
            prices, stock_quantities, past_sales_list, days_to_sell
        )

    @property
    def is_fitted(self) -> bool:
        return self._model is not None

    def set_trained_model(self, model: LinearRegression) -> None:
        self._model = model

    def predict_days(
        self,
        price: float,
        stock_quantity: int,
        past_sales: float,
        discount_rate: float = 0.0,
    ) -> float:
        # Kural tabanlı ana mantık: gün = stok / geçmiş satış.
        base_days = float(stock_quantity) / max(float(past_sales), 1.0)

        # Fiyat düşükse satış hızı artar -> gün sayısı azalır.
        if price <= 8:
            price_factor = 0.75
        elif price <= 12:
            price_factor = 0.85
        elif price <= 18:
            price_factor = 0.93
        else:
            price_factor = 1.0

        # İndirim oranı arttıkça gün sayısını azalt.
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
