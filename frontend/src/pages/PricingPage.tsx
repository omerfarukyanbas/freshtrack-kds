import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import * as api from "../api/products";
import { ApiError, shouldRedirectToLogin } from "../api/http";
import type { DynamicPricing, Product } from "../types/product";

type PricingRow = Product &
  DynamicPricing & {
    pricingError?: string;
  };

function formatMoney(n: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(n);
}

function fmtPercent(rate: number): string {
  return (rate * 100).toFixed(1).replace(/\.0$/, "") + "%";
}

function fmtNum(n: number, digits = 2): string {
  return new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  }).format(n);
}

function pricingDefaults(p: Product): DynamicPricing {
  const daily = p.daily_sales_rate;
  const est = p.stock_quantity / Math.max(daily, 1);
  return {
    discount_rate: 0,
    new_price: p.selling_price,
    remaining_days: p.remaining_days,
    last_30_days_sales: p.last_30_days_sales,
    daily_sales_rate: daily,
    estimated_days_to_sell: Math.round(est * 100) / 100,
    pricing_reason: "",
  };
}

export function PricingPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<PricingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [toastError, setToastError] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const products = await api.fetchProducts();
      const pricingOutcomes = await Promise.allSettled(
        products.map((p) => api.fetchProductPricing(p.id)),
      );
      const merged: PricingRow[] = products.map((p, i) => {
        const outcome = pricingOutcomes[i];
        if (outcome.status === "fulfilled") {
          return {
            ...p,
            ...outcome.value,
            pricingError: undefined,
          };
        }
        return {
          ...p,
          ...pricingDefaults(p),
          pricingError:
            outcome.reason instanceof Error
              ? outcome.reason.message
              : "Fiyat hesaplanamadi",
        };
      });
      setRows(merged);
    } catch (e) {
      if (shouldRedirectToLogin(e)) {
        logout();
        navigate("/login", { replace: true });
        return;
      }
      setRows([]);
      setError(e instanceof Error ? e.message : "Veriler yuklenemedi");
    } finally {
      setLoading(false);
    }
  }, [logout, navigate]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!toast && !toastError) return;
    const t = window.setTimeout(() => {
      setToast(null);
      setToastError(null);
    }, 3200);
    return () => window.clearTimeout(t);
  }, [toast, toastError]);

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => a.remaining_days - b.remaining_days),
    [rows],
  );

  async function applyDynamicPrice(p: PricingRow) {
    if (p.pricingError) return;
    setApplyingId(p.id);
    setToastError(null);
    try {
      const updated = await api.updateProduct(p.id, { selling_price: p.new_price });
      const pricing = await api.fetchProductPricing(p.id);
      setRows((prev) =>
        prev.map((row) =>
          row.id === p.id
            ? {
                ...row,
                ...updated,
                ...pricing,
                pricingError: undefined,
              }
            : row,
        ),
      );
      setToast(`${p.name} icin yeni fiyat ${formatMoney(pricing.new_price)} olarak uygulandi.`);
    } catch (e) {
      if (shouldRedirectToLogin(e)) {
        logout();
        navigate("/login", { replace: true });
        return;
      }
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Fiyat guncellenemedi";
      setToastError(msg);
    } finally {
      setApplyingId(null);
    }
  }

  if (loading) return <div className="muted">Dinamik fiyatlandirma verileri yukleniyor...</div>;
  if (error) return <div className="alert alert--error">{error}</div>;

  return (
    <div className="stack">
      {toast ? <div className="toast toast--success">{toast}</div> : null}
      {toastError ? <div className="toast toast--error">{toastError}</div> : null}
      <section className="panel">
        <div className="panel__head">
          <h2>Dinamik Fiyatlandirma</h2>
        </div>
        {sortedRows.length === 0 ? (
          <p className="muted">Fiyatlandirilacak urun bulunamadi.</p>
        ) : (
          <div className="dashboard-product-grid">
            {sortedRows.map((p) => {
              const critical = p.remaining_days <= 7;
              return (
                <article
                  key={p.id}
                  className={
                    "product-dash-card product-dash-card--actions" +
                    (critical ? " product-dash-card--critical" : "")
                  }
                >
                  <div className="product-dash-card__head">
                    <h3 className="product-dash-card__title">{p.name}</h3>
                    {critical ? (
                      <span className="badge badge--danger">Kritik</span>
                    ) : (
                      <span className="badge badge--ok">Normal</span>
                    )}
                  </div>
                  <dl className="product-dash-card__dl">
                    <div>
                      <dt>Kategori</dt>
                      <dd>{p.category}</dd>
                    </div>
                    <div>
                      <dt>Alis fiyati</dt>
                      <dd>{formatMoney(p.purchase_price)}</dd>
                    </div>
                    <div>
                      <dt>Mevcut satis fiyati</dt>
                      <dd>{formatMoney(p.selling_price)}</dd>
                    </div>
                    <div>
                      <dt>Son 30 gun satis</dt>
                      <dd>{fmtNum(p.last_30_days_sales, 2)} adet</dd>
                    </div>
                    <div>
                      <dt>Gunluk satis hizi</dt>
                      <dd>{fmtNum(p.daily_sales_rate, 3)} / gun</dd>
                    </div>
                    <div>
                      <dt>Tahmini tukenme</dt>
                      <dd>
                        {p.pricingError ? (
                          <span className="text-warn">-</span>
                        ) : (
                          `${fmtNum(p.estimated_days_to_sell, 2)} gun`
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Onerilen indirim</dt>
                      <dd>
                        {p.pricingError ? (
                          <span className="text-warn">Hesaplanamadi</span>
                        ) : (
                          fmtPercent(p.discount_rate)
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Yeni fiyat</dt>
                      <dd className="product-dash-card__highlight">
                        {p.pricingError ? (
                          <span className="text-warn">-</span>
                        ) : (
                          formatMoney(p.new_price)
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Kalan gun (SKT)</dt>
                      <dd className={critical ? "text-danger-strong" : undefined}>
                        {p.remaining_days}
                      </dd>
                    </div>
                  </dl>
                  {!p.pricingError && p.pricing_reason ? (
                    <p className="pricing-reason">{p.pricing_reason}</p>
                  ) : null}
                  <div className="card-actions">
                    <button
                      type="button"
                      className="btn btn--primary btn--sm"
                      disabled={Boolean(p.pricingError) || applyingId === p.id}
                      onClick={() => void applyDynamicPrice(p)}
                    >
                      {applyingId === p.id ? "Uygulaniyor..." : "Fiyati Uygula"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
