import { useEffect, useState } from "react";
import * as adminApi from "../api/admin";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatDateOnly(iso: string): string {
  return new Date(iso).toLocaleDateString("tr-TR");
}

export function AdminSystemDataPage() {
  const [data, setData] = useState<adminApi.AdminDbSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const summary = await adminApi.fetchDbSummary();
        if (mounted) setData(summary);
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : "Veri alınamadı");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return <p className="muted">Sistem verileri yükleniyor…</p>;
  if (error) return <div className="alert alert--error">{error}</div>;
  if (!data) return null;

  return (
    <div className="stack">
      <section className="panel">
        <div className="panel__head">
          <h2>Sistem verileri</h2>
        </div>
        <div className="grid-stats grid-stats--2">
          <div className="stat-card">
            <div className="stat-card__title">Toplam kullanıcı</div>
            <div className="stat-card__value">{data.users_count}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__title">Toplam ürün</div>
            <div className="stat-card__value">{data.products_count}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__title">Bekleyen işletme</div>
            <div className="stat-card__value">{data.pending_businesses_count}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__title">Onaylı işletme</div>
            <div className="stat-card__value">{data.approved_businesses_count}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__title">Reddedilen işletme</div>
            <div className="stat-card__value">{data.rejected_businesses_count}</div>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel__head">
          <h2>Son kullanıcılar</h2>
        </div>
        {data.latest_users.length === 0 ? (
          <p className="empty-hint muted">Kayıt yok</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>İşletme</th>
                  <th>Yetkili</th>
                  <th>E-posta</th>
                  <th>Rol</th>
                  <th>Hesap</th>
                  <th>Kayıt</th>
                </tr>
              </thead>
              <tbody>
                {data.latest_users.map((row) => (
                  <tr key={row.id}>
                    <td>{row.id}</td>
                    <td className="cell-strong">{row.business_name}</td>
                    <td>{row.owner_name}</td>
                    <td>{row.email}</td>
                    <td>{row.role}</td>
                    <td>{row.account_status}</td>
                    <td>{formatDateTime(row.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel__head">
          <h2>Son ürünler</h2>
        </div>
        {data.latest_products.length === 0 ? (
          <p className="empty-hint muted">Kayıt yok</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Ad</th>
                  <th>Kategori</th>
                  <th>Stok</th>
                  <th>SKT</th>
                  <th>Sahip ID</th>
                </tr>
              </thead>
              <tbody>
                {data.latest_products.map((row) => (
                  <tr key={row.id}>
                    <td>{row.id}</td>
                    <td className="cell-strong">{row.name}</td>
                    <td>{row.category}</td>
                    <td>{row.stock_quantity}</td>
                    <td>{formatDateOnly(row.expiration_date)}</td>
                    <td>{row.owner_id ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
