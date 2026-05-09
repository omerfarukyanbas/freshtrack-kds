import { useEffect, useMemo, useState } from "react";
import * as adminApi from "../api/admin";

function formatMoney(value: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(value);
}

export function AdminSystemStatsPage() {
  const [rows, setRows] = useState<adminApi.AdminBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await adminApi.fetchBusinesses();
        if (mounted) setRows(data);
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : "Veri alinamadi");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const metrics = useMemo(() => {
    const totalStock = rows.reduce((acc, row) => acc + row.total_stock, 0);
    const totalRisk = rows.reduce((acc, row) => acc + row.estimated_risk_amount, 0);
    const avgProducts = rows.length > 0 ? rows.reduce((acc, row) => acc + row.total_products, 0) / rows.length : 0;
    return { totalStock, totalRisk, avgProducts };
  }, [rows]);

  if (loading) return <p className="muted">Sistem istatistikleri yukleniyor...</p>;
  if (error) return <div className="alert alert--error">{error}</div>;

  return (
    <div className="stack">
      <section className="panel">
        <div className="panel__head">
          <h2>Sistem istatistikleri</h2>
        </div>
        <div className="grid-stats grid-stats--2">
          <div className="stat-card">
            <div className="stat-card__title">Toplam stok</div>
            <div className="stat-card__value">{metrics.totalStock}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__title">Toplam risk</div>
            <div className="stat-card__value">{formatMoney(metrics.totalRisk)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__title">Isletme basina ort. urun</div>
            <div className="stat-card__value">{metrics.avgProducts.toFixed(1)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__title">Izlenen isletme</div>
            <div className="stat-card__value">{rows.length}</div>
          </div>
        </div>
      </section>
    </div>
  );
}
