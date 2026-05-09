import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { shouldRedirectToLogin } from "../api/http";
import { predictDaysToSell } from "../api/predict";
import * as productsApi from "../api/products";
import type { DynamicPricing, Product } from "../types/product";
import { StatCard } from "../components/StatCard";

type AlertRow = Product &
  DynamicPricing & {
    predicted_days_to_sell: number;
    pricingError?: string;
    predictError?: string;
  };

function fmtMoney(value: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(value);
}

function fmtDays(value: number): string {
  return `${Math.max(0, value).toFixed(1)} gun`;
}

function pricingFallback(product: Product): DynamicPricing {
  const dailySales = Math.max(product.daily_sales_rate, 0.1);
  return {
    discount_rate: 0,
    new_price: product.selling_price,
    remaining_days: product.remaining_days,
    last_30_days_sales: product.last_30_days_sales,
    daily_sales_rate: product.daily_sales_rate,
    estimated_days_to_sell: product.stock_quantity / dailySales,
    pricing_reason: "",
  };
}

function predictFallback(product: Product): number {
  const dailySales = Math.max(product.daily_sales_rate, 0.1);
  return product.stock_quantity / dailySales;
}

export function AlertsPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const products = await productsApi.fetchProducts();
        const pricingOutcomes = await Promise.allSettled(
          products.map((p) => productsApi.fetchProductPricing(p.id)),
        );
        const predictOutcomes = await Promise.allSettled(
          products.map((p, i) => {
            const pricing = pricingOutcomes[i];
            const price = pricing.status === "fulfilled" ? pricing.value.new_price : p.selling_price;
            const discountRate = pricing.status === "fulfilled" ? pricing.value.discount_rate : 0;
            return predictDaysToSell({
              price,
              stock_quantity: p.stock_quantity,
              past_sales: Math.max(1, Math.round(p.last_30_days_sales)),
              discount_rate: discountRate,
            });
          }),
        );

        if (!mounted) return;

        const merged: AlertRow[] = products.map((p, i) => {
          const pricing = pricingOutcomes[i];
          const prediction = predictOutcomes[i];
          const resolvedPricing =
            pricing.status === "fulfilled" ? pricing.value : pricingFallback(p);
          const predicted =
            prediction.status === "fulfilled"
              ? prediction.value.predicted_days_to_sell
              : predictFallback(p);

          return {
            ...p,
            ...resolvedPricing,
            predicted_days_to_sell: predicted,
            pricingError:
              pricing.status === "rejected"
                ? pricing.reason instanceof Error
                  ? pricing.reason.message
                  : "Fiyat onerisi alinamadi"
                : undefined,
            predictError:
              prediction.status === "rejected"
                ? prediction.reason instanceof Error
                  ? prediction.reason.message
                  : "Satis tahmini alinamadi"
                : undefined,
          };
        });

        setRows(merged);
      } catch (e) {
        if (shouldRedirectToLogin(e)) {
          logout();
          navigate("/login", { replace: true });
          return;
        }
        setRows([]);
        setError(e instanceof Error ? e.message : "Uyari paneli yuklenemedi");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, [logout, navigate]);

  const criticalSkt = useMemo(
    () =>
      rows
        .filter((p) => p.remaining_days <= 3)
        .sort((a, b) => a.remaining_days - b.remaining_days),
    [rows],
  );
  const upcomingSkt = useMemo(
    () =>
      rows
        .filter((p) => p.remaining_days >= 4 && p.remaining_days <= 7)
        .sort((a, b) => a.remaining_days - b.remaining_days),
    [rows],
  );
  const overStock = useMemo(
    () => rows.filter((p) => p.stock_quantity > 50).sort((a, b) => b.stock_quantity - a.stock_quantity),
    [rows],
  );
  const salesRisk = useMemo(
    () =>
      rows
        .filter((p) => p.predicted_days_to_sell > p.remaining_days)
        .sort((a, b) => b.predicted_days_to_sell - b.remaining_days - (a.predicted_days_to_sell - a.remaining_days)),
    [rows],
  );
  const dynamicPricing = useMemo(
    () =>
      rows
        .filter((p) => p.new_price < p.selling_price || p.discount_rate > 0)
        .sort((a, b) => b.discount_rate - a.discount_rate),
    [rows],
  );

  const estimatedRiskAmount = useMemo(() => {
    return salesRisk.reduce((sum, p) => {
      const gap = p.predicted_days_to_sell - p.remaining_days;
      const ratio = Math.max(0, Math.min(1, gap / Math.max(p.predicted_days_to_sell, 1)));
      return sum + p.stock_quantity * p.purchase_price * ratio;
    }, 0);
  }, [salesRisk]);

  if (loading) {
    return (
      <div className="loading-block">
        <div className="loading-spinner" />
        <p className="loading-block__text">Uyari paneli hazirlaniyor...</p>
        <p className="loading-block__sub">
          Urunler, dinamik fiyatlar ve AI satis riskleri getiriliyor.
        </p>
      </div>
    );
  }

  if (error) return <div className="alert alert--error">{error}</div>;

  return (
    <div className="stack">
      <div className="grid-stats">
        <StatCard title="Kritik Uyari Sayisi" value={criticalSkt.length} variant="danger" />
        <StatCard title="Stok Fazlasi Sayisi" value={overStock.length} />
        <StatCard title="Satis Riski Sayisi" value={salesRisk.length} variant="accent" />
        <StatCard
          title="Tahmini Risk Tutari"
          value={fmtMoney(estimatedRiskAmount)}
          hint="SKT oncesi tuketilememe riski"
          variant="danger"
        />
      </div>

      <section className="panel">
        <div className="panel__head">
          <h2>Kritik SKT Uyarilari</h2>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Urun</th>
                <th>Kategori</th>
                <th>Stok</th>
                <th>Kalan Gun</th>
                <th>Durum</th>
              </tr>
            </thead>
            <tbody>
              {criticalSkt.map((p) => (
                <tr key={`critical-${p.id}`}>
                  <td className="cell-strong">{p.name}</td>
                  <td>{p.category}</td>
                  <td>{p.stock_quantity}</td>
                  <td>{p.remaining_days}</td>
                  <td>
                    <span className="badge badge--danger">Kritik</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {criticalSkt.length === 0 ? (
            <p className="empty-hint muted">Kritik seviyede SKT uyarisi yok.</p>
          ) : null}
        </div>
      </section>

      <section className="panel">
        <div className="panel__head">
          <h2>Yaklasan SKT Uyarilari (4-7 Gun)</h2>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Urun</th>
                <th>Kategori</th>
                <th>Stok</th>
                <th>Kalan Gun</th>
                <th>Durum</th>
              </tr>
            </thead>
            <tbody>
              {upcomingSkt.map((p) => (
                <tr key={`upcoming-${p.id}`}>
                  <td className="cell-strong">{p.name}</td>
                  <td>{p.category}</td>
                  <td>{p.stock_quantity}</td>
                  <td>{p.remaining_days}</td>
                  <td>
                    <span className="badge badge--warn">Warning</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {upcomingSkt.length === 0 ? (
            <p className="empty-hint muted">4-7 gun araliginda SKT uyarisi yok.</p>
          ) : null}
        </div>
      </section>

      <section className="panel">
        <div className="panel__head">
          <h2>Asiri Stok Uyarilari</h2>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Urun</th>
                <th>Kategori</th>
                <th>Stok</th>
                <th>Etiket</th>
              </tr>
            </thead>
            <tbody>
              {overStock.map((p) => (
                <tr key={`overstock-${p.id}`}>
                  <td className="cell-strong">{p.name}</td>
                  <td>{p.category}</td>
                  <td>{p.stock_quantity}</td>
                  <td>
                    <span className="badge badge--warn">Stok Fazlasi</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {overStock.length === 0 ? (
            <p className="empty-hint muted">Asiri stok uyarisi yok.</p>
          ) : null}
        </div>
      </section>

      <section className="panel">
        <div className="panel__head">
          <h2>Satis Riski Uyarilari</h2>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Urun</th>
                <th>SKT Kalan Gun</th>
                <th>AI Tahmini Tukenme</th>
                <th>Uyari</th>
              </tr>
            </thead>
            <tbody>
              {salesRisk.map((p) => (
                <tr key={`risk-${p.id}`}>
                  <td className="cell-strong">{p.name}</td>
                  <td>{p.remaining_days}</td>
                  <td>{fmtDays(p.predicted_days_to_sell)}</td>
                  <td>
                    <span className="badge badge--danger">SKT'ye kadar tukenmeyebilir</span>
                    {p.predictError ? <div className="text-warn">{p.predictError}</div> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {salesRisk.length === 0 ? (
            <p className="empty-hint muted">AI tahminlerine gore satis riski gorunmuyor.</p>
          ) : null}
        </div>
      </section>

      <section className="panel">
        <div className="panel__head">
          <h2>Dinamik Fiyat Onerileri</h2>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Urun</th>
                <th>Mevcut Fiyat</th>
                <th>Yeni Fiyat</th>
                <th>Onerilen Indirim</th>
                <th>Not</th>
              </tr>
            </thead>
            <tbody>
              {dynamicPricing.map((p) => (
                <tr key={`pricing-${p.id}`}>
                  <td className="cell-strong">{p.name}</td>
                  <td>{fmtMoney(p.selling_price)}</td>
                  <td>{fmtMoney(p.new_price)}</td>
                  <td>%{(p.discount_rate * 100).toFixed(1)}</td>
                  <td>{p.pricingError ? p.pricingError : p.pricing_reason || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {dynamicPricing.length === 0 ? (
            <p className="empty-hint muted">Su an aktif bir fiyat indirimi onerisi yok.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
