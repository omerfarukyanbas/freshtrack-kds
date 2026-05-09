import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import * as adminApi from "../api/admin";
import { StatCard } from "../components/StatCard";

function formatMoney(value: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(value);
}

export function AdminOverviewPage() {
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

  const totals = useMemo(() => {
    const totalBusinesses = rows.length;
    const totalProducts = rows.reduce((acc, row) => acc + row.total_products, 0);
    const criticalProducts = rows.reduce((acc, row) => acc + row.critical_products, 0);
    const totalRisk = rows.reduce((acc, row) => acc + row.estimated_risk_amount, 0);
    return { totalBusinesses, totalProducts, criticalProducts, totalRisk };
  }, [rows]);

  if (loading) {
    return <p className="muted">Sistem verileri yukleniyor...</p>;
  }
  if (error) {
    return <div className="alert alert--error">{error}</div>;
  }

  return (
    <div className="stack">
      <div className="grid-stats">
        <StatCard title="Toplam isletme" value={totals.totalBusinesses} hint="Kayitli market/bakkal" />
        <StatCard title="Toplam urun" value={totals.totalProducts} hint="Tum isletmeler" />
        <StatCard
          title="Kritik urun"
          value={totals.criticalProducts}
          hint="SKT <= 7 gun"
          variant={totals.criticalProducts > 0 ? "danger" : "success"}
        />
        <StatCard title="Tahmini risk" value={formatMoney(totals.totalRisk)} hint="Kritik stok maliyeti" />
      </div>
      <section className="panel">
        <div className="panel__head">
          <h2>Hizli erisim</h2>
        </div>
        <div className="admin-quick-links">
          <Link to="/admin/businesses" className="btn btn--ghost">
            Isletmelere git
          </Link>
          <Link to="/admin/stats" className="btn btn--ghost">
            Sistem istatistiklerini ac
          </Link>
        </div>
      </section>
    </div>
  );
}
