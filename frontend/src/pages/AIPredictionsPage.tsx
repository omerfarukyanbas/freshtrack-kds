import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import * as productsApi from "../api/products";
import { shouldRedirectToLogin } from "../api/http";
import { predictDaysToSell } from "../api/predict";
import type { Product } from "../types/product";

type PredictionRow = Product & {
  price_for_prediction: number;
  predicted_days_to_sell: number;
  predictionError?: string;
};

function formatMoney(n: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(n);
}

function clampDays(days: number): number {
  return Math.min(30, Math.max(1, days));
}

export function AIPredictionsPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<PredictionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const products = await productsApi.fetchProducts();
        const pricingOutcomes = await Promise.allSettled(
          products.map((p) => productsApi.fetchProductPricing(p.id)),
        );
        const predictOutcomes = await Promise.allSettled(
          products.map((p, i) => {
            const pricing = pricingOutcomes[i];
            const price =
              pricing.status === "fulfilled"
                ? pricing.value.new_price
                : p.selling_price;
            return predictDaysToSell({
              price,
              stock_quantity: p.stock_quantity,
              past_sales: 10,
            });
          }),
        );
        if (!mounted) return;

        const merged: PredictionRow[] = products.map((p, i) => {
          const pricing = pricingOutcomes[i];
          const price =
            pricing.status === "fulfilled" ? pricing.value.new_price : p.selling_price;
          const predict = predictOutcomes[i];
          if (predict.status === "fulfilled") {
            return {
              ...p,
              price_for_prediction: price,
              predicted_days_to_sell: clampDays(predict.value.predicted_days_to_sell),
            };
          }
          return {
            ...p,
            price_for_prediction: price,
            predicted_days_to_sell: clampDays(p.stock_quantity / 10),
            predictionError:
              predict.reason instanceof Error
                ? predict.reason.message
                : "Tahmin alinamadi",
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
        setError(e instanceof Error ? e.message : "AI tahminleri yuklenemedi");
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
    () => [...rows].sort((a, b) => a.predicted_days_to_sell - b.predicted_days_to_sell),
    [rows],
  );

  if (loading) return <div className="muted">AI tahminleri yukleniyor...</div>;
  if (error) return <div className="alert alert--error">{error}</div>;

  return (
    <section className="panel">
      <div className="panel__head">
        <h2>AI Tahminler</h2>
      </div>
      {sortedRows.length === 0 ? (
        <p className="muted">Tahmin gosterilecek urun bulunamadi.</p>
      ) : (
        <div className="dashboard-product-grid">
          {sortedRows.map((p) => {
            const critical = p.remaining_days <= 7;
            return (
              <article
                key={p.id}
                className={
                  "product-dash-card" + (critical ? " product-dash-card--critical" : "")
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
                    <dt>Stok</dt>
                    <dd>{p.stock_quantity}</dd>
                  </div>
                  <div>
                    <dt>Fiyat</dt>
                    <dd>{formatMoney(p.price_for_prediction)}</dd>
                  </div>
                  <div>
                    <dt>Tahmini tukenme</dt>
                    <dd className="product-dash-card__highlight">
                      {p.predicted_days_to_sell.toFixed(2)} gun
                    </dd>
                  </div>
                </dl>
                <p className="product-dash-card__predict">
                  {p.predictionError
                    ? `Bu urun icin tahmin alinamadi: ${p.predictionError}`
                    : `Bu urun yaklasik ${p.predicted_days_to_sell.toFixed(2)} gunde tukenir`}
                </p>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
