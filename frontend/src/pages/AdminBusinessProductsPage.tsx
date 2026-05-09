import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import * as adminApi from "../api/admin";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("tr-TR");
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(value);
}

export function AdminBusinessProductsPage() {
  const { userId } = useParams();
  const numericId = Number(userId);
  const [products, setProducts] = useState<adminApi.AdminBusinessProductsResponse["products"]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isFinite(numericId)) {
      setError("Gecersiz isletme kimligi");
      setLoading(false);
      return;
    }
    let mounted = true;
    (async () => {
      try {
        const data = await adminApi.fetchBusinessProducts(numericId);
        if (mounted) setProducts(data.products);
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : "Veri alinamadi");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [numericId]);

  if (loading) return <p className="muted">Urunler yukleniyor...</p>;
  if (error) return <div className="alert alert--error">{error}</div>;

  return (
    <section className="panel">
      <div className="panel__head">
        <h2>Isletme urunleri</h2>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Urun</th>
              <th>Kategori</th>
              <th>Stok</th>
              <th>SKT</th>
              <th>Kalan gun</th>
              <th>Alis</th>
              <th>Satis</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td className="cell-strong">{product.name}</td>
                <td>{product.category}</td>
                <td>{product.stock_quantity}</td>
                <td>{formatDate(product.expiration_date)}</td>
                <td>
                  <span className={product.remaining_days <= 7 ? "badge badge--danger" : "badge badge--ok"}>
                    {product.remaining_days}
                  </span>
                </td>
                <td>{formatMoney(product.purchase_price)}</td>
                <td>{formatMoney(product.selling_price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
