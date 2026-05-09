import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { shouldRedirectToLogin } from "../api/http";
import { predictDaysToSell } from "../api/predict";
import * as productsApi from "../api/products";
import { StatCard } from "../components/StatCard";
import type { Product } from "../types/product";

type ForecastRow = Product & {
  suggested_price: number;
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

function getSalesStatus(predictedDays: number, remainingDays: number): string {
  return predictedDays <= remainingDays ? "Zamaninda tukenir" : "Israf riski var";
}

export function SalesForecastPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<ForecastRow[]>([]);
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
            const suggestedPrice =
              pricing.status === "fulfilled" ? pricing.value.new_price : p.selling_price;
            return predictDaysToSell({
              price: suggestedPrice,
              stock_quantity: p.stock_quantity,
              past_sales: 10,
            });
          }),
        );
        if (!mounted) return;

        const merged: ForecastRow[] = products.map((p, i) => {
          const pricing = pricingOutcomes[i];
          const suggestedPrice =
            pricing.status === "fulfilled" ? pricing.value.new_price : p.selling_price;
          const predict = predictOutcomes[i];
          if (predict.status === "fulfilled") {
            return {
              ...p,
              suggested_price: suggestedPrice,
              predicted_days_to_sell: clampDays(predict.value.predicted_days_to_sell),
            };
          }
          return {
            ...p,
            suggested_price: suggestedPrice,
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
        setError(e instanceof Error ? e.message : "Satis tahmini verileri yuklenemedi");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void load();
    return () => {
      mounted = false;
    };
  }, [logout, navigate]);

  const summary = useMemo(() => {
    const totalProducts = rows.length;
    const avgPredictedDays =
      totalProducts > 0
        ? rows.reduce((sum, r) => sum + r.predicted_days_to_sell, 0) / totalProducts
        : 0;
    const expectedIn7Days = rows.filter((r) => r.predicted_days_to_sell <= 7).length;
    const criticalSktCount = rows.filter((r) => r.remaining_days <= 7).length;
    return { totalProducts, avgPredictedDays, expectedIn7Days, criticalSktCount };
  }, [rows]);

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => a.predicted_days_to_sell - b.predicted_days_to_sell),
    [rows],
  );

  if (loading) return <div className="muted">Satis tahminleri yukleniyor...</div>;
  if (error) return <div className="alert alert--error">{error}</div>;

  return (
    <div className="stack">
      <div className="grid-stats">
        <StatCard title="Toplam urun sayisi" value={summary.totalProducts} variant="default" />
        <StatCard
          title="Ort. tahmini tukenme"
          value={summary.avgPredictedDays.toFixed(2) + " gun"}
          variant="accent"
        />
        <StatCard
          title="7 gun icinde tukenmesi beklenen"
          value={summary.expectedIn7Days}
          variant="success"
        />
        <StatCard
          title="Kritik SKT urun sayisi"
          value={summary.criticalSktCount}
          variant="danger"
        />
      </div>

      <section className="panel">
        <div className="panel__head">
          <h2>Satis Tahmini</h2>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Urun</th>
                <th>Kategori</th>
                <th>Stok</th>
                <th>Satis Fiyati</th>
                <th>Onerilen Yeni Fiyat</th>
                <th>Tahmini Tukenme</th>
                <th>Kalan Gun</th>
                <th>Satis Durumu</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((r) => {
                const status = getSalesStatus(r.predicted_days_to_sell, r.remaining_days);
                const isRisk = status === "Israf riski var";
                return (
                  <tr key={r.id}>
                    <td className="cell-strong">{r.name}</td>
                    <td>{r.category}</td>
                    <td>{r.stock_quantity}</td>
                    <td>{formatMoney(r.selling_price)}</td>
                    <td>{formatMoney(r.suggested_price)}</td>
                    <td>{r.predicted_days_to_sell.toFixed(2)} gun</td>
                    <td>
                      <span className={r.remaining_days <= 7 ? "badge badge--danger" : "badge badge--ok"}>
                        {r.remaining_days} gun
                      </span>
                    </td>
                    <td>
                      <div className="sales-status-wrap">
                        <span className={isRisk ? "badge badge--danger" : "badge badge--ok"}>
                          {status}
                        </span>
                        {r.remaining_days <= 7 ? (
                          <span className="badge badge--warn">SKT kritik</span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {sortedRows.length === 0 ? (
            <p className="empty-hint muted">Satis tahmini gosterilecek urun bulunamadi.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
