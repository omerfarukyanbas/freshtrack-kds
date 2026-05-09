import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import * as api from "../api/products";
import { shouldRedirectToLogin } from "../api/http";
import type { Product } from "../types/product";

type DiscountRow = Product & {
  discount_rate: number;
  new_price: number;
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

function getSuggestion(p: DiscountRow): string {
  const highStock = p.stock_quantity > 30;
  const lowStock = p.stock_quantity <= 10;
  const critical = p.remaining_days <= 7;

  if (critical && highStock) return "Agresif indirim onerilir";
  if (lowStock) return "Indirim gereksiz";
  if (!critical) return "Fiyat korunabilir";
  return "Orta seviye indirim degerlendir";
}

export function DiscountSuggestionsPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<DiscountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const products = await api.fetchProducts();
        const pricingOutcomes = await Promise.allSettled(
          products.map((p) => api.fetchProductPricing(p.id)),
        );
        if (!mounted) return;
        const merged: DiscountRow[] = products.map((p, i) => {
          const outcome = pricingOutcomes[i];
          if (outcome.status === "fulfilled") {
            return {
              ...p,
              discount_rate: outcome.value.discount_rate,
              new_price: outcome.value.new_price,
            };
          }
          return {
            ...p,
            discount_rate: 0,
            new_price: p.selling_price,
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
        if (!mounted) return;
        setRows([]);
        setError(e instanceof Error ? e.message : "Indirim onerileri yuklenemedi");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void load();
    return () => {
      mounted = false;
    };
  }, [logout, navigate]);

  const sortedRows = useMemo(
    () =>
      [...rows].sort((a, b) => {
        const aCritical = a.remaining_days <= 7 ? 0 : 1;
        const bCritical = b.remaining_days <= 7 ? 0 : 1;
        if (aCritical !== bCritical) return aCritical - bCritical;
        return a.remaining_days - b.remaining_days;
      }),
    [rows],
  );

  if (loading) return <div className="muted">Indirim onerileri yukleniyor...</div>;
  if (error) return <div className="alert alert--error">{error}</div>;

  return (
    <section className="panel">
      <div className="panel__head">
        <h2>Indirim Onerileri</h2>
      </div>
      {sortedRows.length === 0 ? (
        <p className="muted">Oneri olusturulacak urun bulunamadi.</p>
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
                    <span className="badge badge--ok">Guvenli</span>
                  )}
                </div>
                <dl className="product-dash-card__dl">
                  <div>
                    <dt>Kalan gun</dt>
                    <dd className={critical ? "text-danger-strong" : undefined}>
                      {p.remaining_days}
                    </dd>
                  </div>
                  <div>
                    <dt>Stok</dt>
                    <dd>{p.stock_quantity}</dd>
                  </div>
                  <div>
                    <dt>Indirim orani</dt>
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
                </dl>
                <div className="discount-suggestion">{getSuggestion(p)}</div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
