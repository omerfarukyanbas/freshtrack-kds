import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
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

export function AdminBusinessDetailPage() {
  const { userId } = useParams();
  const numericId = Number(userId);
  const [detail, setDetail] = useState<adminApi.AdminBusinessDetail | null>(null);
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
        const [business, productRes] = await Promise.all([
          adminApi.fetchBusinessDetail(numericId),
          adminApi.fetchBusinessProducts(numericId),
        ]);
        if (!mounted) return;
        setDetail(business);
        setProducts(productRes.products);
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

  const criticalProducts = useMemo(
    () => products.filter((product) => product.remaining_days <= 7).sort((a, b) => a.remaining_days - b.remaining_days),
    [products],
  );
  const recentProducts = useMemo(
    () =>
      [...products]
        .sort((a, b) => {
          const at = a.created_at ? new Date(a.created_at).getTime() : 0;
          const bt = b.created_at ? new Date(b.created_at).getTime() : 0;
          return bt - at;
        })
        .slice(0, 5),
    [products],
  );

  const summary = useMemo(() => {
    const totalStock = products.reduce((acc, product) => acc + product.stock_quantity, 0);
    const riskAmount = criticalProducts.reduce(
      (acc, product) => acc + product.stock_quantity * product.purchase_price,
      0,
    );
    return { totalStock, riskAmount };
  }, [products, criticalProducts]);

  if (loading) return <p className="muted">Isletme detaylari yukleniyor...</p>;
  if (error) return <div className="alert alert--error">{error}</div>;
  if (!detail) return <div className="alert alert--error">Isletme bulunamadi.</div>;

  return (
    <div className="stack">
      <section className="panel">
        <div className="panel__head">
          <h2>Profil bilgileri</h2>
          <Link to={`/admin/businesses/${detail.id}/products`} className="link-muted">
            Tum urunleri gor
          </Link>
        </div>
        <dl className="profile-info-grid">
          <div>
            <dt>Isletme</dt>
            <dd>{detail.business_name}</dd>
          </div>
          <div>
            <dt>Yetkili</dt>
            <dd>{detail.owner_name}</dd>
          </div>
          <div>
            <dt>E-posta</dt>
            <dd>{detail.email}</dd>
          </div>
          <div>
            <dt>Telefon</dt>
            <dd>{detail.phone || "-"}</dd>
          </div>
          <div>
            <dt>Adres</dt>
            <dd>{detail.address || "-"}</dd>
          </div>
          <div>
            <dt>Kayit tarihi</dt>
            <dd>{formatDate(detail.created_at)}</dd>
          </div>
        </dl>
      </section>

      <section className="panel">
        <div className="panel__head">
          <h2>Urun ozeti</h2>
        </div>
        <div className="grid-stats grid-stats--2">
          <div className="stat-card">
            <div className="stat-card__title">Toplam urun</div>
            <div className="stat-card__value">{products.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__title">Toplam stok</div>
            <div className="stat-card__value">{summary.totalStock}</div>
          </div>
          <div className="stat-card stat-card--danger">
            <div className="stat-card__title">Kritik urun</div>
            <div className="stat-card__value">{criticalProducts.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__title">Tahmini risk</div>
            <div className="stat-card__value">{formatMoney(summary.riskAmount)}</div>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel__head">
          <h2>Kritik urunler</h2>
        </div>
        {criticalProducts.length === 0 ? (
          <p className="muted">Kritik urun yok.</p>
        ) : (
          <ul className="mini-list">
            {criticalProducts.slice(0, 8).map((product) => (
              <li key={product.id} className="mini-list__item">
                <span className="mini-list__name">{product.name}</span>
                <span className="badge badge--danger">{product.remaining_days} gun</span>
                <span className="muted">{product.stock_quantity} adet</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <div className="panel__head">
          <h2>Son eklenen urunler</h2>
        </div>
        {recentProducts.length === 0 ? (
          <p className="muted">Kayitli urun yok.</p>
        ) : (
          <ul className="mini-list">
            {recentProducts.map((product) => (
              <li key={product.id} className="mini-list__item">
                <span className="mini-list__name">{product.name}</span>
                <span className="muted">{product.category}</span>
                <span className="muted">{product.created_at ? formatDate(product.created_at) : "-"}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
