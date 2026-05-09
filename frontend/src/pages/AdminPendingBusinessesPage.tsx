import { useCallback, useEffect, useState } from "react";
import * as adminApi from "../api/admin";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  if (s === "approved") {
    return <span className="badge badge--ok">Onaylandı</span>;
  }
  if (s === "rejected") {
    return <span className="badge badge--danger">Reddedildi</span>;
  }
  return <span className="badge badge--warn">Beklemede</span>;
}

export function AdminPendingBusinessesPage() {
  const [rows, setRows] = useState<adminApi.AdminPendingBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [actionId, setActionId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    const data = await adminApi.fetchPendingBusinesses();
    setRows(data);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await load();
      } catch (e) {
        if (mounted) setLoadError(e instanceof Error ? e.message : "Veri alınamadı");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(t);
  }, [toast]);

  async function onApprove(id: number) {
    setActionId(id);
    setActionError(null);
    try {
      await adminApi.approveBusiness(id);
      setToast("İşletme onaylandı");
      await load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "İşlem başarısız");
    } finally {
      setActionId(null);
    }
  }

  async function onReject(id: number) {
    setActionId(id);
    setActionError(null);
    try {
      await adminApi.rejectBusiness(id);
      setToast("İşletme reddedildi");
      await load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "İşlem başarısız");
    } finally {
      setActionId(null);
    }
  }

  if (loading) return <p className="muted">Yükleniyor…</p>;
  if (loadError) return <div className="alert alert--error">{loadError}</div>;

  return (
    <div className="stack">
      {toast ? <div className="toast toast--success">{toast}</div> : null}
      <section className="panel">
        <div className="panel__head">
          <h2>Bekleyen işletmeler</h2>
        </div>
        {actionError ? <div className="alert alert--error">{actionError}</div> : null}
        {rows.length === 0 ? (
          <p className="empty-hint muted">Bekleyen işletme bulunmuyor</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>İşletme adı</th>
                  <th>Yetkili kişi</th>
                  <th>E-posta</th>
                  <th>İşletme tipi</th>
                  <th>Telefon</th>
                  <th>Kayıt tarihi</th>
                  <th>Durum</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="cell-strong">{row.business_name}</td>
                    <td>{row.owner_name}</td>
                    <td>{row.email}</td>
                    <td>{row.business_type}</td>
                    <td>{row.phone ?? "—"}</td>
                    <td>{formatDate(row.created_at)}</td>
                    <td>
                      <StatusBadge status={row.account_status} />
                    </td>
                    <td className="cell-actions">
                      <button
                        type="button"
                        className="btn btn--primary btn--sm"
                        disabled={actionId === row.id}
                        onClick={() => onApprove(row.id)}
                      >
                        Onayla
                      </button>
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        disabled={actionId === row.id}
                        onClick={() => onReject(row.id)}
                      >
                        Reddet
                      </button>
                    </td>
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
