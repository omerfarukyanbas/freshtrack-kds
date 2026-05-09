import { useEffect, useState, type FormEvent } from "react";
import type { Product, ProductCreate, ProductUpdate } from "../types/product";

type Mode = "create" | "edit";

type Props = {
  open: boolean;
  mode: Mode;
  product: Product | null;
  onClose: () => void;
  onSubmit: (payload: ProductCreate | ProductUpdate) => Promise<void>;
};

const empty: ProductCreate = {
  name: "",
  category: "",
  purchase_price: 0,
  selling_price: 0,
  expiration_date: "",
  stock_quantity: 0,
  last_30_days_sales: 0,
};

function defaultExpirationDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ProductFormModal({
  open,
  mode,
  product,
  onClose,
  onSubmit,
}: Props) {
  const [form, setForm] = useState<ProductCreate>(empty);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setErr(null);
    if (mode === "edit" && product) {
      setForm({
        name: product.name,
        category: product.category,
        purchase_price: Number(product.purchase_price),
        selling_price: Number(product.selling_price),
        expiration_date: product.expiration_date.slice(0, 10),
        stock_quantity: Number(product.stock_quantity),
        last_30_days_sales: Number(product.last_30_days_sales),
      });
    } else {
      setForm({
        ...empty,
        expiration_date: defaultExpirationDate(),
      });
    }
  }, [open, mode, product]);

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const today = defaultExpirationDate();
    const selectedDate = form.expiration_date.slice(0, 10);
    if (selectedDate < today) {
      setErr("Geçmiş tarihli SKT seçemezsiniz.");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const purchase_price = Number(form.purchase_price);
      const selling_price = Number(form.selling_price);
      const stock_quantity = Number(form.stock_quantity);
      const last_30_days_sales = Number(form.last_30_days_sales);

      if (mode === "create") {
        const payload: ProductCreate = {
          name: form.name.trim(),
          category: form.category.trim(),
          purchase_price,
          selling_price,
          expiration_date: form.expiration_date.slice(0, 10),
          stock_quantity,
          last_30_days_sales,
        };
        await onSubmit(payload);
        setForm({ ...empty, expiration_date: defaultExpirationDate() });
      } else {
        const patch: ProductUpdate = {
          name: form.name.trim(),
          category: form.category.trim(),
          purchase_price,
          selling_price,
          expiration_date: form.expiration_date.slice(0, 10),
          stock_quantity,
          last_30_days_sales,
        };
        await onSubmit(patch);
      }
      onClose();
    } catch (e) {
      const msg =
        e instanceof TypeError && e.message === "Failed to fetch"
          ? "Sunucuya bağlanılamadı (ağ/CORS). Konsoldaki [API] loglarına bakın."
          : e instanceof Error
            ? e.message
            : "Kayıt başarısız";
      setErr(msg);
      const extra =
        e instanceof Error
          ? { name: e.name, message: e.message, stack: e.stack }
          : { value: String(e) };
      console.log("[ProductForm] submit error", extra);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal>
      <div className="modal">
        <div className="modal__head">
          <h2>{mode === "create" ? "Yeni ürün" : "Ürünü düzenle"}</h2>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Kapat
          </button>
        </div>
        <form className="modal__body form-grid" onSubmit={handleSubmit}>
          {err ? (
            <div className="alert alert--error field--full">{err}</div>
          ) : null}
          <label className="field field--full">
            <span>Ad</span>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </label>
          <label className="field field--full">
            <span>Kategori</span>
            <input
              required
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            />
          </label>
          <label className="field">
            <span>Alış (₺)</span>
            <input
              required
              type="number"
              min={0}
              step="0.01"
              value={form.purchase_price === 0 ? "" : form.purchase_price}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  purchase_price: e.target.value === "" ? 0 : Number(e.target.value),
                }))
              }
            />
          </label>
          <label className="field">
            <span>Satış (₺)</span>
            <input
              required
              type="number"
              min={0}
              step="0.01"
              value={form.selling_price === 0 ? "" : form.selling_price}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  selling_price: e.target.value === "" ? 0 : Number(e.target.value),
                }))
              }
            />
          </label>
          <label className="field">
            <span>SKT</span>
            <input
              required
              type="date"
              min={defaultExpirationDate()}
              value={form.expiration_date}
              onChange={(e) =>
                setForm((f) => ({ ...f, expiration_date: e.target.value }))
              }
            />
          </label>
          <label className="field">
            <span>Stok</span>
            <input
              required
              type="number"
              min={0}
              step={1}
              value={form.stock_quantity === 0 ? "" : form.stock_quantity}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  stock_quantity: e.target.value === "" ? 0 : Number(e.target.value),
                }))
              }
            />
          </label>
          <label className="field">
            <span>Son 30 gun satis</span>
            <input
              required
              type="number"
              min={0}
              step="0.01"
              value={form.last_30_days_sales === 0 ? "" : form.last_30_days_sales}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  last_30_days_sales: e.target.value === "" ? 0 : Number(e.target.value),
                }))
              }
            />
          </label>
          <div className="modal__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Vazgeç
            </button>
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? "Kaydediliyor…" : "Kaydet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
