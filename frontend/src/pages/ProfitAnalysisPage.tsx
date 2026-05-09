import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import * as api from "../api/products";
import { shouldRedirectToLogin } from "../api/http";
import { StatCard } from "../components/StatCard";
import type { Product } from "../types/product";

type ProfitRow = Product & {
  discount_rate: number;
  new_price: number;
  current_revenue: number;
  discounted_revenue: number;
  purchase_cost: number;
  current_profit: number;
  profit_after_discount: number;
  profit_diff: number;
  recommendation: string;
  recommendationTone: "danger" | "warn" | "success";
  pricingError?: string;
};

function formatMoney(n: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(n);
}

function getRecommendation(
  p: Product,
  profitAfterDiscount: number,
): { text: string; tone: "danger" | "warn" | "success" } {
  if (profitAfterDiscount < 0) {
    return {
      text: "Zarar riski var, indirim orani gozden gecirilmeli",
      tone: "danger",
    };
  }
  if (p.remaining_days <= 7 && p.stock_quantity > 30) {
    return {
      text: "Kar dusse de israfi onlemek icin indirim onerilir",
      tone: "warn",
    };
  }
  if (p.remaining_days > 7) {
    return {
      text: "Mevcut fiyat korunabilir",
      tone: "success",
    };
  }
  return {
    text: "SKT kritik; indirim dikkatle degerlendirilmeli",
    tone: "warn",
  };
}

export function ProfitAnalysisPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<ProfitRow[]>([]);
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

        const merged: ProfitRow[] = products.map((p, i) => {
          const outcome = pricingOutcomes[i];
          const newPrice =
            outcome.status === "fulfilled" ? outcome.value.new_price : p.selling_price;
          const discountRate =
            outcome.status === "fulfilled" ? outcome.value.discount_rate : 0;

          const currentRevenue = p.selling_price * p.stock_quantity;
          const discountedRevenue = newPrice * p.stock_quantity;
          const purchaseCost = p.purchase_price * p.stock_quantity;
          const currentProfit = currentRevenue - purchaseCost;
          const profitAfterDiscount = discountedRevenue - purchaseCost;
          const profitDiff = currentProfit - profitAfterDiscount;
          const rec = getRecommendation(p, profitAfterDiscount);

          return {
            ...p,
            discount_rate: discountRate,
            new_price: newPrice,
            current_revenue: currentRevenue,
            discounted_revenue: discountedRevenue,
            purchase_cost: purchaseCost,
            current_profit: currentProfit,
            profit_after_discount: profitAfterDiscount,
            profit_diff: profitDiff,
            recommendation: rec.text,
            recommendationTone: rec.tone,
            pricingError:
              outcome.status === "rejected"
                ? outcome.reason instanceof Error
                  ? outcome.reason.message
                  : "Fiyat alinamadi"
                : undefined,
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
        setError(e instanceof Error ? e.message : "Kar analizi yuklenemedi");
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
    const totalCurrentRevenue = rows.reduce((s, r) => s + r.current_revenue, 0);
    const totalDiscountedRevenue = rows.reduce((s, r) => s + r.discounted_revenue, 0);
    const protectedProfit = rows.reduce((s, r) => s + r.profit_after_discount, 0);
    const profitAtRisk = rows
      .filter((r) => r.remaining_days <= 7)
      .reduce((s, r) => s + r.current_profit, 0);
    return {
      totalCurrentRevenue,
      totalDiscountedRevenue,
      protectedProfit,
      profitAtRisk,
    };
  }, [rows]);

  const sortedRows = useMemo(
    () =>
      [...rows].sort((a, b) => {
        if (a.profit_after_discount < 0 !== b.profit_after_discount < 0) {
          return a.profit_after_discount < 0 ? -1 : 1;
        }
        return b.profit_diff - a.profit_diff;
      }),
    [rows],
  );

  const chartMax = Math.max(
    summary.totalCurrentRevenue,
    summary.totalDiscountedRevenue,
    Math.abs(summary.profitAtRisk),
    1,
  );

  const barCurrent = (summary.totalCurrentRevenue / chartMax) * 100;
  const barDiscount = (summary.totalDiscountedRevenue / chartMax) * 100;
  const barRisk = (Math.abs(summary.profitAtRisk) / chartMax) * 100;

  if (loading) return <div className="muted">Kar analizi yukleniyor...</div>;
  if (error) return <div className="alert alert--error">{error}</div>;

  return (
    <div className="stack">
      <div className="grid-stats">
        <StatCard
          title="Toplam potansiyel gelir"
          value={formatMoney(summary.totalCurrentRevenue)}
          variant="default"
        />
        <StatCard
          title="Indirim sonrasi tahmini gelir"
          value={formatMoney(summary.totalDiscountedRevenue)}
          variant="accent"
        />
        <StatCard
          title="Korunan tahmini kar"
          value={formatMoney(summary.protectedProfit)}
          variant="success"
        />
        <StatCard
          title="Risk altindaki kar"
          value={formatMoney(summary.profitAtRisk)}
          variant="danger"
        />
      </div>

      <section className="panel">
        <div className="panel__head">
          <h2>Gelir ve risk ozeti</h2>
        </div>
        <div className="profit-chart">
          <div className="profit-chart__row">
            <span className="profit-chart__label">Mevcut gelir</span>
            <div className="profit-chart__track">
              <div
                className="profit-chart__fill profit-chart__fill--blue"
                style={{ width: `${barCurrent}%` }}
              />
            </div>
            <span className="profit-chart__value">{formatMoney(summary.totalCurrentRevenue)}</span>
          </div>
          <div className="profit-chart__row">
            <span className="profit-chart__label">Indirim sonrasi gelir</span>
            <div className="profit-chart__track">
              <div
                className="profit-chart__fill profit-chart__fill--cyan"
                style={{ width: `${barDiscount}%` }}
              />
            </div>
            <span className="profit-chart__value">
              {formatMoney(summary.totalDiscountedRevenue)}
            </span>
          </div>
          <div className="profit-chart__row">
            <span className="profit-chart__label">Risk altindaki kar</span>
            <div className="profit-chart__track">
              <div
                className="profit-chart__fill profit-chart__fill--danger"
                style={{ width: `${barRisk}%` }}
              />
            </div>
            <span className="profit-chart__value">{formatMoney(summary.profitAtRisk)}</span>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel__head">
          <h2>Urun bazli kar tablosu</h2>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Urun</th>
                <th>Kategori</th>
                <th>Stok</th>
                <th>Alis</th>
                <th>Satis</th>
                <th>Onerilen yeni fiyat</th>
                <th>Mevcut kar</th>
                <th>Indirim sonrasi kar</th>
                <th>Kar farki</th>
                <th>Karar onerisi</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((r) => {
                const posCurrent = r.current_profit >= 0;
                const posAfter = r.profit_after_discount >= 0;
                const recClass =
                  r.recommendationTone === "danger"
                    ? "badge badge--danger"
                    : r.recommendationTone === "warn"
                      ? "badge badge--warn"
                      : "badge badge--ok";
                return (
                  <tr key={r.id}>
                    <td className="cell-strong">{r.name}</td>
                    <td>{r.category}</td>
                    <td>{r.stock_quantity}</td>
                    <td>{formatMoney(r.purchase_price)}</td>
                    <td>{formatMoney(r.selling_price)}</td>
                    <td>
                      {r.pricingError ? (
                        <span className="text-warn">—</span>
                      ) : (
                        formatMoney(r.new_price)
                      )}
                    </td>
                    <td className={posCurrent ? "profit-pos" : "profit-neg"}>
                      {formatMoney(r.current_profit)}
                    </td>
                    <td className={posAfter ? "profit-pos" : "profit-neg"}>
                      {formatMoney(r.profit_after_discount)}
                    </td>
                    <td className={r.profit_diff > 0 ? "profit-neg" : "profit-pos"}>
                      {formatMoney(r.profit_diff)}
                    </td>
                    <td>
                      <span className={recClass}>{r.recommendation}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {sortedRows.length === 0 ? (
            <p className="empty-hint muted">Kar analizi icin urun bulunamadi.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
