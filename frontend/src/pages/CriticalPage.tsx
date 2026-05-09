import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { StatCard } from "../components/StatCard";
import { useProducts } from "../hooks/useProducts";
import { criticalCount, estimateWaste, isCritical } from "../lib/metrics";

export function CriticalPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { products, loading, error } = useProducts({
    onUnauthorized: () => {
      logout();
      navigate("/login", { replace: true });
    },
  });

  const critical = useMemo(
    () =>
      products
        .filter(isCritical)
        .sort((a, b) => a.remaining_days - b.remaining_days),
    [products],
  );

  const waste = useMemo(() => estimateWaste(products), [products]);

  if (loading) return <div className="muted">Yükleniyor…</div>;
  if (error) return <div className="alert alert--error">{error}</div>;

  return (
    <div className="stack">
      <div className="grid-stats grid-stats--2">
        <StatCard
          title="Kritik ürün sayısı"
          value={criticalCount(products)}
          variant="danger"
        />
        <StatCard
          title="Tahmini israf riski"
          value={
            "₺" +
            waste.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })
          }
          hint="Panel simülasyonu"
          variant="accent"
        />
      </div>

      <div className="toolbar">
        <h2 className="toolbar__title">Kritik SKT listesi</h2>
        <Link to="/products" className="btn btn--ghost">
          Ürün yönetimi
        </Link>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Ad</th>
              <th>Kategori</th>
              <th>Kalan gün</th>
              <th>Stok</th>
              <th>Maliyet riski (₺)</th>
            </tr>
          </thead>
          <tbody>
            {critical.map((p) => {
              const risk = Math.max(0, (7 - Math.min(7, Math.max(0, p.remaining_days))) / 7);
              const atRisk = Math.round(p.purchase_price * p.stock_quantity * risk * 0.35);
              return (
                <tr key={p.id}>
                  <td className="cell-strong">{p.name}</td>
                  <td>{p.category}</td>
                  <td>
                    <span className="badge badge--danger">{p.remaining_days}</span>
                  </td>
                  <td>{p.stock_quantity}</td>
                  <td>₺{atRisk.toLocaleString("tr-TR")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {critical.length === 0 ? (
          <p className="empty-hint muted">Kritik ürün bulunmuyor.</p>
        ) : null}
      </div>
    </div>
  );
}
