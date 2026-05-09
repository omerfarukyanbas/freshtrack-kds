"""
Dinamik fiyatlandırma: SKT, stok, son 30 gün satışı ve tükenme riski.
"""

from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class DynamicPricingBreakdown:
    discount_rate: float
    new_price: float
    remaining_days: int
    last_30_days_sales: float
    daily_sales_rate: float
    estimated_days_to_sell: float
    pricing_reason: str


def _expiry_pressure(remaining_days: int, *, window_days: float = 28.0) -> float:
    if remaining_days <= 0:
        return 1.0
    if remaining_days >= window_days:
        return 0.0
    return 1.0 - (remaining_days / window_days)


def _stock_pressure(stock_quantity: int, *, cap_units: float = 60.0) -> float:
    return min(1.0, max(0.0, stock_quantity / cap_units))


def _sales_pressure(daily_sales_rate: float, *, fast_ref_per_day: float = 8.0) -> float:
    """Düşük günlük satış → yüksek baskı (0..1)."""
    if fast_ref_per_day <= 0:
        return 1.0
    return max(0.0, min(1.0, 1.0 - (daily_sales_rate / fast_ref_per_day)))


def _sellout_risk(
    remaining_days: int,
    estimated_days_to_sell: float,
) -> float:
    """
    Tahmini tükenme SKT'den uzunsa risk yüksek; erken tükenme riski düşük tutulur.
    """
    if remaining_days <= 0:
        return 1.0
    if estimated_days_to_sell > remaining_days:
        overrun = estimated_days_to_sell - remaining_days
        return min(1.0, 0.35 + 0.65 * min(1.0, overrun / max(estimated_days_to_sell, 1e-9)))
    ratio = min(1.0, estimated_days_to_sell / max(float(remaining_days), 1e-9))
    return max(0.0, 0.18 * (1.0 - ratio))


def _build_pricing_reason(
    discount_rate: float,
    remaining_days: int,
    expiry_p: float,
    stock_p: float,
    sales_p: float,
    sellout_p: float,
) -> str:
    pct = int(round(discount_rate * 100))
    thr = 0.28
    parts: list[str] = []

    if expiry_p >= thr:
        if remaining_days <= 0:
            parts.append("son kullanma tarihinin kritik veya geçmiş olması")
        else:
            parts.append(f"SKT'ye {remaining_days} gün kaldığı")
    if stock_p >= thr:
        parts.append("stokun yüksek olması")
    if sales_p >= thr:
        parts.append("son 30 günlük satış hızının düşük olması")
    if sellout_p >= thr:
        parts.append("stokun kalan ömür içinde tükenmeyebileceğinin tahmin edilmesi")

    if not parts:
        parts.append("talep, stok ve SKT riskinin birlikte değerlendirilmesi")

    if len(parts) == 1:
        body = parts[0][0].upper() + parts[0][1:]
    else:
        joined = ", ".join(parts[:-1]) + " ve " + parts[-1]
        body = joined[0].upper() + joined[1:]

    return f"{body} nedeniyle %{pct} indirim önerildi."


def compute_dynamic_pricing(
    *,
    selling_price: float,
    purchase_price: float,
    remaining_days: int,
    stock_quantity: int,
    last_30_days_sales: float,
    created_at: datetime | None = None,
    max_discount: float = 0.55,
    time_window_days: float = 28.0,
) -> DynamicPricingBreakdown:
    """
    Ağırlıklar: SKT %40, stok %20, satış baskısı %25, tükenme riski %15.
    created_at şimdilik API uyumluluğu için kabul edilir (ileride kullanılabilir).
    """
    _ = created_at

    if selling_price <= 0:
        return DynamicPricingBreakdown(
            discount_rate=0.0,
            new_price=0.0,
            remaining_days=remaining_days,
            last_30_days_sales=last_30_days_sales,
            daily_sales_rate=0.0,
            estimated_days_to_sell=0.0,
            pricing_reason="Geçersiz satış fiyatı nedeniyle indirim uygulanmadı.",
        )

    daily_sales_rate = last_30_days_sales / 30.0
    estimated_days_to_sell = stock_quantity / max(daily_sales_rate, 1.0)

    expiry_p = _expiry_pressure(remaining_days, window_days=time_window_days)
    stock_p = _stock_pressure(stock_quantity)
    sales_p = _sales_pressure(daily_sales_rate)
    sellout_p = _sellout_risk(remaining_days, estimated_days_to_sell)

    composite = (
        0.40 * expiry_p
        + 0.20 * stock_p
        + 0.25 * sales_p
        + 0.15 * sellout_p
    )
    discount_rate = max(0.0, min(max_discount, composite))

    new_price = round(selling_price * (1.0 - discount_rate), 2)
    if purchase_price and purchase_price > 0:
        new_price = max(round(purchase_price, 2), new_price)

    effective = max(0.0, min(1.0, 1.0 - (new_price / selling_price)))
    reason = _build_pricing_reason(
        effective,
        remaining_days,
        expiry_p,
        stock_p,
        sales_p,
        sellout_p,
    )

    return DynamicPricingBreakdown(
        discount_rate=round(effective, 4),
        new_price=new_price,
        remaining_days=remaining_days,
        last_30_days_sales=last_30_days_sales,
        daily_sales_rate=round(daily_sales_rate, 4),
        estimated_days_to_sell=round(estimated_days_to_sell, 2),
        pricing_reason=reason,
    )
