import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import * as api from "../api/products";
import { shouldRedirectToLogin } from "../api/http";
import { StatCard } from "../components/StatCard";
import type { Product } from "../types/product";

type ReportRow = Product & {
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

function getRiskLevel(remainingDays: number): "high" | "medium" | "low" {
  if (remainingDays <= 3) return "high";
  if (remainingDays <= 7) return "medium";
  return "low";
}

function getRiskLabel(level: "high" | "medium" | "low"): string {
  if (level === "high") return "Yuksek Risk";
  if (level === "medium") return "Orta Risk";
  return "Dusuk Risk";
}

function getRiskBadgeClass(level: "high" | "medium" | "low"): string {
  if (level === "high") return "badge badge--danger";
  if (level === "medium") return "badge badge--warn";
  return "badge badge--ok";
}

function getRecommendedDiscount(remainingDays: number, stock: number): number {
  if (remainingDays <= 3 && stock > 30) return 0.3;
  if (remainingDays <= 7 && stock > 10) return 0.2;
  if (remainingDays <= 7) return 0.1;
  return 0;
}

export function ReportsPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<ReportRow[]>([]);
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
        const merged: ReportRow[] = products.map((p, i) => {
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
        setError(e instanceof Error ? e.message : "Rapor verileri yuklenemedi");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void load();
    return () => {
      mounted = false;
    };
  }, [logout, navigate]);

  const criticalRows = useMemo(
    () => [...rows].filter((r) => r.remaining_days <= 7).sort((a, b) => a.remaining_days - b.remaining_days),
    [rows],
  );

  const summary = useMemo(() => {
    const total = rows.length;
    const critical = rows.filter((r) => r.remaining_days <= 7).length;
    const estimatedWaste = rows.reduce((acc, r) => {
      const risk = r.remaining_days <= 3 ? 0.45 : r.remaining_days <= 7 ? 0.25 : 0.08;
      return acc + r.purchase_price * r.stock_quantity * risk;
    }, 0);
    const protectedProfit = rows.reduce((acc, r) => {
      const oldRevenue = r.selling_price * r.stock_quantity;
      const newRevenue = r.new_price * r.stock_quantity;
      const discountImpact = oldRevenue - newRevenue;
      return acc + Math.max(0, oldRevenue - discountImpact * 0.5);
    }, 0);
    return { total, critical, estimatedWaste, protectedProfit };
  }, [rows]);

  const profitRows = useMemo(
    () =>
      [...rows]
        .map((r) => {
          const oldRevenue = r.selling_price * r.stock_quantity;
          const newRevenue = r.new_price * r.stock_quantity;
          const discountImpact = oldRevenue - newRevenue;
          return {
            ...r,
            oldRevenue,
            newRevenue,
            discountImpact,
          };
        })
        .sort((a, b) => b.discountImpact - a.discountImpact),
    [rows],
  );

  if (loading) return <div className="muted">Raporlar yukleniyor...</div>;
  if (error) return <div className="alert alert--error">{error}</div>;

  return (
    <div className="stack">
      <div className="grid-stats">
        <StatCard title="Toplam urun sayisi" value={summary.total} variant="default" />
        <StatCard title="Kritik urun sayisi" value={summary.critical} variant="danger" />
        <StatCard title="Tahmini israf tutari" value={formatMoney(summary.estimatedWaste)} variant="accent" />
        <StatCard title="Tahmini korunan kar" value={formatMoney(summary.protectedProfit)} variant="success" />
      </div>

      <section className="panel">
        <div className="panel__head">
          <h2>Kritik Urun Raporu</h2>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Urun Adi</th>
                <th>Kategori</th>
                <th>Stok</th>
                <th>Kalan Gun</th>
                <th>Onerilen Indirim</th>
                <th>Yeni Fiyat</th>
              </tr>
            </thead>
            <tbody>
              {criticalRows.map((r) => {
                const rec = getRecommendedDiscount(r.remaining_days, r.stock_quantity);
                return (
                  <tr key={r.id}>
                    <td className="cell-strong">{r.name}</td>
                    <td>{r.category}</td>
                    <td>{r.stock_quantity}</td>
                    <td>
                      <span className="badge badge--danger">{r.remaining_days}</span>
                    </td>
                    <td>{fmtPercent(rec)}</td>
                    <td>{formatMoney(r.new_price)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {criticalRows.length === 0 ? (
            <p className="empty-hint muted">Kritik urun bulunmuyor.</p>
          ) : null}
        </div>
      </section>

      <section className="panel">
        <div className="panel__head">
          <h2>Israf Riski Raporu</h2>
        </div>
        <div className="dashboard-product-grid">
          {rows.map((r) => {
            const level = getRiskLevel(r.remaining_days);
            return (
              <article
                key={r.id}
                className={"product-dash-card" + (r.remaining_days <= 7 ? " product-dash-card--critical" : "")}
              >
                <div className="product-dash-card__head">
                  <h3 className="product-dash-card__title">{r.name}</h3>
                  <span className={getRiskBadgeClass(level)}>{getRiskLabel(level)}</span>
                </div>
                <dl className="product-dash-card__dl">
                  <div>
                    <dt>Kalan gun</dt>
                    <dd>{r.remaining_days}</dd>
                  </div>
                  <div>
                    <dt>Stok</dt>
                    <dd>{r.stock_quantity}</dd>
                  </div>
                  <div>
                    <dt>Yeni fiyat</dt>
                    <dd className="product-dash-card__highlight">{formatMoney(r.new_price)}</dd>
                  </div>
                </dl>
              </article>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <div className="panel__head">
          <h2>Kar Analizi</h2>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Urun</th>
                <th>Eski Gelir</th>
                <th>Yeni Gelir</th>
                <th>Indirim Etkisi</th>
              </tr>
            </thead>
            <tbody>
              {profitRows.map((r) => (
                <tr key={r.id}>
                  <td className="cell-strong">{r.name}</td>
                  <td>{formatMoney(r.oldRevenue)}</td>
                  <td>{formatMoney(r.newRevenue)}</td>
                  <td className={r.discountImpact > 0 ? "text-danger-strong" : ""}>
                    {formatMoney(r.discountImpact)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
