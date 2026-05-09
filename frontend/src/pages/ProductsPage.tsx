import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ProductFormModal } from "../components/ProductFormModal";
import { useProducts } from "../hooks/useProducts";
import * as api from "../api/products";
import type {
  Product,
  ProductCreate,
  ProductImportCsvResult,
  ProductUpdate,
} from "../types/product";

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("tr-TR");
  } catch {
    return iso;
  }
}

export function ProductsPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { products, loading, error, reload } = useProducts({
    onUnauthorized: () => {
      logout();
      navigate("/login", { replace: true });
    },
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<Product | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importSummary, setImportSummary] = useState<ProductImportCsvResult | null>(null);
  const [showCsvImporter, setShowCsvImporter] = useState(false);
  const csvInputRef = useRef<HTMLInputElement | null>(null);

  const sortedProducts = useMemo(
    () => [...products].sort((a, b) => a.remaining_days - b.remaining_days),
    [products],
  );

  useEffect(() => {
    if (location.pathname !== "/products/new") return;
    setModalMode("create");
    setEditing(null);
    setModalOpen(true);
  }, [location.pathname]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(t);
  }, [toast]);

  function closeModal() {
    setModalOpen(false);
    if (location.pathname === "/products/new") {
      navigate("/products", { replace: true });
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Bu ürünü silmek istiyor musunuz?")) return;
    setBusyId(id);
    setActionError(null);
    try {
      await api.deleteProduct(id);
      await reload();
      setToast("Ürün silindi.");
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Silme başarısız");
    } finally {
      setBusyId(null);
    }
  }

  async function handleSubmit(payload: ProductCreate | ProductUpdate) {
    setActionError(null);
    try {
      if (modalMode === "create") {
        await api.createProduct(payload as ProductCreate);
        setToast("Ürün başarıyla eklendi.");
      } else if (editing) {
        await api.updateProduct(editing.id, payload as ProductUpdate);
        setToast("Ürün güncellendi.");
      }
      await reload();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Kaydetme başarısız";
      setActionError(msg);
      throw e;
    }
  }

  async function handleImportCsv() {
    if (!csvFile) {
      setActionError("Lutfen once bir CSV dosyasi secin.");
      return;
    }
    setActionError(null);
    setImportLoading(true);
    try {
      const result = await api.importProductsCsv(csvFile);
      setImportSummary(result);
      await reload();
      if (result.failed_count > 0) {
        setToast(
          `CSV ice aktarma tamamlandi: ${result.imported_count} basarili, ${result.failed_count} hatali satir.`,
        );
      } else {
        setToast(`CSV ice aktarma basarili: ${result.imported_count} urun eklendi.`);
      }
      setCsvFile(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "CSV yukleme basarisiz";
      setActionError(msg);
      setToast("CSV ice aktarma sirasinda hata olustu.");
    } finally {
      setImportLoading(false);
    }
  }

  if (loading) return <div className="muted">Yükleniyor…</div>;
  if (error) return <div className="alert alert--error">{error}</div>;

  return (
    <div className="stack">
      {toast ? <div className="toast toast--success">{toast}</div> : null}
      <div className="toolbar">
        <h2 className="toolbar__title">Ürünler</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="btn btn--ghost" onClick={() => setShowCsvImporter(true)}>
            CSV Içe Aktar
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => {
              setModalMode("create");
              setEditing(null);
              setModalOpen(true);
            }}
          >
            + Yeni ürün
          </button>
        </div>
      </div>

      {actionError ? <div className="alert alert--error">{actionError}</div> : null}

      {showCsvImporter ? (
        <section className="panel">
          <div className="panel__head">
            <h2>CSV Ice Aktar</h2>
          </div>
          <div className="stack">
            <div className="field field--full">
              <span>CSV upload alani</span>
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv,text/csv"
                style={{ display: "none" }}
                onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)}
              />
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => csvInputRef.current?.click()}
                >
                  Dosya sec
                </button>
                <button
                  type="button"
                  className="btn btn--primary"
                  disabled={importLoading || !csvFile}
                  onClick={() => void handleImportCsv()}
                >
                  {importLoading ? "Yukleniyor..." : "Yukle"}
                </button>
                {csvFile ? <span className="muted">Secilen: {csvFile.name}</span> : null}
              </div>
            </div>
            <div className="panel">
              <strong>Ornek CSV formati</strong>
              <pre className="muted" style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>
                {"name,category,purchase_price,selling_price,expiration_date,stock_quantity,last_30_days_sales\nSut,Sut Urunleri,20,35,2026-12-01,40,18"}
              </pre>
            </div>
            {importSummary ? (
              <div className="alert alert--success">
                Import Ozeti: {importSummary.imported_count} basarili, {importSummary.failed_count} hatali.
              </div>
            ) : null}
            {importSummary && importSummary.failed_rows.length > 0 ? (
              <div className="panel">
                <strong>Hatali satirlar</strong>
                <div className="stack" style={{ marginTop: 8 }}>
                  {importSummary.failed_rows.map((row) => (
                    <div key={row.row_number} className="alert alert--error">
                      Satir {row.row_number}: {row.errors.join(" | ")}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <div className="dashboard-product-grid">
        {sortedProducts.map((p) => {
          const critical = p.shelf_status === "CRITICAL" || p.remaining_days <= 7;
          return (
            <article
              key={p.id}
              className={
                "product-dash-card product-dash-card--actions" +
                (critical ? " product-dash-card--critical" : "")
              }
            >
              <div className="product-dash-card__head">
                <h3 className="product-dash-card__title">{p.name}</h3>
                {critical ? (
                  <span className="badge badge--danger">KRITIK</span>
                ) : (
                  <span className="badge badge--ok">Normal</span>
                )}
              </div>
              <dl className="product-dash-card__dl">
                <div>
                  <dt>Kategori</dt>
                  <dd>{p.category}</dd>
                </div>
                <div>
                  <dt>Alis / Satis</dt>
                  <dd>
                    ₺{p.purchase_price.toFixed(2)} / ₺{p.selling_price.toFixed(2)}
                  </dd>
                </div>
                <div>
                  <dt>SKT</dt>
                  <dd>{fmtDate(p.expiration_date)}</dd>
                </div>
                <div>
                  <dt>Stok</dt>
                  <dd>{p.stock_quantity}</dd>
                </div>
                <div>
                  <dt>30g satis</dt>
                  <dd>{p.last_30_days_sales.toFixed(2)}</dd>
                </div>
                <div>
                  <dt>Kalan gun</dt>
                  <dd className={critical ? "text-danger-strong" : undefined}>{p.remaining_days}</dd>
                </div>
              </dl>
              <div className="card-actions">
                <button
                  type="button"
                  className="btn btn--sm btn--ghost"
                  onClick={() => {
                    setModalMode("edit");
                    setEditing(p);
                    setModalOpen(true);
                  }}
                >
                  Guncelle
                </button>
                <button
                  type="button"
                  className="btn btn--sm btn--danger"
                  onClick={() => void handleDelete(p.id)}
                  disabled={busyId === p.id}
                >
                  {busyId === p.id ? "Siliniyor..." : "Sil"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
      {products.length === 0 ? (
        <div className="panel">
          <p className="empty-hint muted">Henuz urun yok. Yeni urun ekleyin.</p>
        </div>
      ) : null}

      <ProductFormModal
        open={modalOpen}
        mode={modalMode}
        product={editing}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
