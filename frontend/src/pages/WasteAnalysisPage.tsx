import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { shouldRedirectToLogin } from "../api/http";
import * as api from "../api/products";
import { StatCard } from "../components/StatCard";
import type { Product } from "../types/product";

type WasteRow = Product & {
  discount_rate: number;
  new_price: number;
  estimated_waste_cost: number;
  preventable_loss: number;
  risk: "high" | "medium" | "low";
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

function getRisk(stock: number, remainingDays: number): "high" | "medium" | "low" {
  if (remainingDays <= 3 && stock > 20) return "high";
  if (remainingDays <= 7 && stock > 10) return "medium";
  return "low";
}

function riskLabel(risk: "high" | "medium" | "low"): string {
  if (risk === "high") return "Yuksek Risk";
  if (risk === "medium") return "Orta Risk";
  return "Dusuk Risk";
}

function riskBadgeClass(risk: "high" | "medium" | "low"): string {
  if (risk === "high") return "badge badge--danger";
  if (risk === "medium") return "badge badge--warn";
  return "badge badge--ok";
}

export function WasteAnalysisPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<WasteRow[]>([]);
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

        const merged: WasteRow[] = products.map((p, i) => {
          const outcome = pricingOutcomes[i];
          const discountRate =
            outcome.status === "fulfilled" ? outcome.value.discount_rate : 0;
          const newPrice =
            outcome.status === "fulfilled" ? outcome.value.new_price : p.selling_price;
          const estimatedWasteCost = p.purchase_price * p.stock_quantity;
          const preventableLoss = estimatedWasteCost * discountRate;
          return {
            ...p,
            discount_rate: discountRate,
            new_price: newPrice,
            estimated_waste_cost: estimatedWasteCost,
            preventable_loss: preventableLoss,
            risk: getRisk(p.stock_quantity, p.remaining_days),
            pricingError:
              outcome.status === "rejected"
                ? outcome.reason instanceof Error
                  ? outcome.reason.message
                  : "Fiyat hesaplanamadi"
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
        setError(e instanceof Error ? e.message : "Israf analizi yuklenemedi");
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
    const riskyProducts = rows.filter((r) => r.risk !== "low");
    const high = rows.filter((r) => r.risk === "high").length;
    const medium = rows.filter((r) => r.risk === "medium").length;
    const low = rows.filter((r) => r.risk === "low").length;
    const estimatedWaste = rows.reduce((sum, r) => sum + r.estimated_waste_cost, 0);
    const preventable = rows.reduce((sum, r) => sum + r.preventable_loss, 0);
    return {
      riskyCount: riskyProducts.length,
      high,
      medium,
      low,
      estimatedWaste,
      preventable,
    };
  }, [rows]);

  const sortedRows = useMemo(
    () =>
      [...rows].sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 };
        if (order[a.risk] !== order[b.risk]) return order[a.risk] - order[b.risk];
        return a.remaining_days - b.remaining_days;
      }),
    [rows],
  );

  const total = Math.max(rows.length, 1);
  const highPct = (summary.high / total) * 100;
  const medPct = (summary.medium / total) * 100;
  const lowPct = (summary.low / total) * 100;

  if (loading) return <div className="muted">Israf analizi yukleniyor...</div>;
  if (error) return <div className="alert alert--error">{error}</div>;

  return (
    <div className="stack">
      <div className="grid-stats">
        <StatCard
          title="Toplam israf riski tasiyan urun"
          value={summary.riskyCount}
          variant="danger"
        />
        <StatCard title="Yuksek riskli urun sayisi" value={summary.high} variant="danger" />
        <StatCard
          title="Tahmini israf maliyeti"
          value={formatMoney(summary.estimatedWaste)}
          variant="accent"
        />
        <StatCard
          title="Onlenebilir tahmini kayip"
          value={formatMoney(summary.preventable)}
          variant="success"
        />
      </div>

      <section className="panel">
        <div className="panel__head">
          <h2>Risk Dagilimi</h2>
        </div>
        <div className="waste-risk-grid">
          <div className="waste-risk-card waste-risk-card--high">
            <div>Yuksek Risk</div>
            <strong>{summary.high}</strong>
          </div>
          <div className="waste-risk-card waste-risk-card--medium">
            <div>Orta Risk</div>
            <strong>{summary.medium}</strong>
          </div>
          <div className="waste-risk-card waste-risk-card--low">
            <div>Dusuk Risk</div>
            <strong>{summary.low}</strong>
          </div>
        </div>
        <div className="waste-bars">
          <div className="bars__label">Risk dagilimi (yuzde)</div>
          <div className="bar-track">
            <div className="waste-segment waste-segment--high" style={{ width: `${highPct}%` }} />
            <div className="waste-segment waste-segment--medium" style={{ width: `${medPct}%` }} />
            <div className="waste-segment waste-segment--low" style={{ width: `${lowPct}%` }} />
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel__head">
          <h2>Urun Bazli Israf Tablosu</h2>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Urun</th>
                <th>Kategori</th>
                <th>Stok</th>
                <th>Kalan Gun</th>
                <th>Alis Fiyati</th>
                <th>Satis Fiyati</th>
                <th>Israf Riski</th>
                <th>Tahmini Israf Maliyeti</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((r) => (
                <tr key={r.id}>
                  <td className="cell-strong">{r.name}</td>
                  <td>{r.category}</td>
                  <td>{r.stock_quantity}</td>
                  <td>
                    <span className={r.remaining_days <= 7 ? "badge badge--danger" : "badge badge--ok"}>
                      {r.remaining_days}
                    </span>
                  </td>
                  <td>{formatMoney(r.purchase_price)}</td>
                  <td>{formatMoney(r.selling_price)}</td>
                  <td>
                    <span className={riskBadgeClass(r.risk)}>{riskLabel(r.risk)}</span>
                  </td>
                  <td>{formatMoney(r.estimated_waste_cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {sortedRows.length === 0 ? (
            <p className="empty-hint muted">Israf analizi icin urun bulunamadi.</p>
          ) : null}
        </div>
      </section>

      <section className="panel">
        <div className="panel__head">
          <h2>Dinamik Fiyatlandirma Etkisi</h2>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Urun</th>
                <th>Indirim Orani</th>
                <th>Onerilen Yeni Fiyat</th>
                <th>Onlenebilir Kayip</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((r) => (
                <tr key={r.id}>
                  <td className="cell-strong">{r.name}</td>
                  <td>{fmtPercent(r.discount_rate)}</td>
                  <td>{formatMoney(r.new_price)}</td>
                  <td className="text-danger-strong">{formatMoney(r.preventable_loss)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
