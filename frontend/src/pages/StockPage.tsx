import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { StatCard } from "../components/StatCard";
import { useProducts } from "../hooks/useProducts";
import type { Product } from "../types/product";

type StockLevel = "low" | "medium" | "high";

function getStockLevel(stockQuantity: number): StockLevel {
  if (stockQuantity <= 10) return "low";
  if (stockQuantity <= 30) return "medium";
  return "high";
}

function getStockLabel(level: StockLevel): string {
  if (level === "low") return "Dusuk Stok";
  if (level === "medium") return "Orta Stok";
  return "Yeterli Stok";
}

function getStockBadgeClass(level: StockLevel): string {
  if (level === "low") return "badge badge--danger";
  if (level === "medium") return "badge badge--warn";
  return "badge badge--ok";
}

function getAction(product: Product): string {
  const level = getStockLevel(product.stock_quantity);
  if (level === "low" && product.remaining_days > 7) return "Siparis ver";
  if (level === "high" && product.remaining_days <= 7) return "Indirim uygula";
  if (product.remaining_days <= 7) return "SKT kritik, takip et";
  return "Normal takip";
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("tr-TR");
  } catch {
    return iso;
  }
}

export function StockPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { products, loading, error } = useProducts({
    onUnauthorized: () => {
      logout();
      navigate("/login", { replace: true });
    },
  });

  const stats = useMemo(() => {
    let low = 0;
    let medium = 0;
    let high = 0;
    let totalStock = 0;

    for (const p of products) {
      totalStock += p.stock_quantity;
      const level = getStockLevel(p.stock_quantity);
      if (level === "low") low += 1;
      else if (level === "medium") medium += 1;
      else high += 1;
    }

    return { low, medium, high, totalStock };
  }, [products]);

  const rows = useMemo(
    () => [...products].sort((a, b) => a.remaining_days - b.remaining_days),
    [products],
  );

  if (loading) return <div className="muted">Stok verileri yukleniyor...</div>;
  if (error) return <div className="alert alert--error">{error}</div>;

  return (
    <div className="stack">
      <div className="grid-stats">
        <StatCard title="Toplam stok adedi" value={stats.totalStock} variant="default" />
        <StatCard title="Dusuk stoktaki urun" value={stats.low} variant="danger" />
        <StatCard title="Orta stoktaki urun" value={stats.medium} variant="accent" />
        <StatCard title="Yeterli stoktaki urun" value={stats.high} variant="success" />
      </div>

      <section className="panel">
        <div className="panel__head">
          <h2>Stok Takibi</h2>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Urun Adi</th>
                <th>Kategori</th>
                <th>Mevcut Stok</th>
                <th>Stok Durumu</th>
                <th>SKT</th>
                <th>Kalan Gun</th>
                <th>Onerilen Aksiyon</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const level = getStockLevel(p.stock_quantity);
                return (
                  <tr key={p.id}>
                    <td className="cell-strong">{p.name}</td>
                    <td>{p.category}</td>
                    <td>{p.stock_quantity}</td>
                    <td>
                      <span className={getStockBadgeClass(level)}>{getStockLabel(level)}</span>
                    </td>
                    <td>{fmtDate(p.expiration_date)}</td>
                    <td>{p.remaining_days}</td>
                    <td>
                      <span className="stock-action">{getAction(p)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length === 0 ? (
            <p className="empty-hint muted">Stok takibi icin urun bulunamadi.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
