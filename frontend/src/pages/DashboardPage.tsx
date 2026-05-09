import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { StatCard } from "../components/StatCard";
import { useDashboardProducts } from "../hooks/useDashboardProducts";
import {
  criticalCount,
  estimateWaste,
  profitSimulation,
  isCritical,
} from "../lib/metrics";
import type { ProductDashboardRow } from "../types/product";

function formatMoney(n: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(n);
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("tr-TR");
  } catch {
    return iso;
  }
}

function fmtPercent(rate: number): string {
  return (rate * 100).toFixed(1).replace(/\.0$/, "") + "%";
}

function isCriticalCard(p: ProductDashboardRow): boolean {
  return p.remaining_days <= 7;
}

export function DashboardPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { rows, loading, error } = useDashboardProducts({
    onUnauthorized: () => {
      logout();
      navigate("/login", { replace: true });
    },
  });

  const stats = useMemo(() => {
    const crit = criticalCount(rows);
    const waste = estimateWaste(rows);
    const profit = profitSimulation(rows);
    const marginPct =
      profit.potentialRevenue > 0
        ? Math.min(
            100,
            Math.max(
              0,
              Math.round((profit.grossPotential / profit.potentialRevenue) * 100),
            ),
          )
        : 0;
    const adjPct =
      profit.potentialRevenue > 0
        ? Math.min(
            100,
            Math.max(
              0,
              Math.round((profit.adjustedMargin / profit.potentialRevenue) * 100),
            ),
          )
        : 0;
    return { crit, waste, profit, marginPct, adjPct };
  }, [rows]);

  const topCritical = useMemo(
    () =>
      [...rows]
        .filter(isCritical)
        .sort((a, b) => a.remaining_days - b.remaining_days)
        .slice(0, 5),
    [rows],
  );

  if (loading) {
    return (
      <div className="loading-block" role="status" aria-live="polite">
        <div className="loading-spinner" aria-hidden />
        <p className="loading-block__text">Ürünler ve dinamik fiyatlar yükleniyor…</p>
        <p className="muted loading-block__sub">
          <code>GET /api/products</code> ve her kayıt için{" "}
          <code>GET /api/products/&lt;id&gt;/pricing</code>
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="stack">
        <div className="alert alert--error" role="alert">
          <strong>Veri alınamadı.</strong> {error}
        </div>
        <p className="muted">
          Yerelde backend: <code>http://127.0.0.1:8000</code> —{" "}
          <code>uvicorn app.main:app --reload --host 127.0.0.1 --port 8000</code>. Konsolda{" "}
          <code>[API]</code> loglarına bakın. Geliştirmede <code>VITE_API_URL</code> kullanmayın
          (Vite proxy); <code>localhost</code> ile <code>127.0.0.1</code> karışırsa adres çubuğunu
          tutarlı yapın. Üretimde API ayrı hosttaysa build için{" "}
          <code>VITE_API_URL</code> gerekir (bkz. README).
        </p>
      </div>
    );
  }

  const sim = stats.profit;
  const barGross = Math.min(100, Math.max(0, stats.marginPct));
  const barAdj = Math.min(100, Math.max(0, stats.adjPct));

  return (
    <div className="stack">
      <div className="grid-stats">
        <StatCard
          title="Kritik ürün"
          value={stats.crit}
          hint="SKT ≤ 7 gün"
          variant={stats.crit > 0 ? "danger" : "success"}
        />
        <StatCard
          title="Tahmini israf riski"
          value={formatMoney(stats.waste)}
          hint="Kritik stok + zaman simülasyonu"
          variant="accent"
        />
        <StatCard
          title="Brüt kâr potansiyeli"
          value={formatMoney(sim.grossPotential)}
          hint="Tüm stok satılırsa (alıştan fark)"
          variant="default"
        />
        <StatCard
          title="İsraf sonrası kâr"
          value={formatMoney(sim.adjustedMargin)}
          hint="Basit senaryo"
          variant={sim.adjustedMargin >= 0 ? "success" : "danger"}
        />
      </div>

      <section className="panel">
        <div className="panel__head">
          <h2>Ürünler</h2>
          <Link to="/products" className="link-muted">
            CRUD yönetimi →
          </Link>
        </div>
        {rows.length === 0 ? (
          <p className="muted">Kayıtlı ürün yok.</p>
        ) : (
          <div className="dashboard-product-grid">
            {rows.map((p) => {
              const critical = isCriticalCard(p);
              return (
                <article
                  key={p.id}
                  className={
                    "product-dash-card" + (critical ? " product-dash-card--critical" : "")
                  }
                >
                  <div className="product-dash-card__head">
                    <h3 className="product-dash-card__title">{p.name}</h3>
                    {critical ? (
                      <span className="badge badge--danger">Kritik</span>
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
                      <dt>Stok</dt>
                      <dd>{p.stock_quantity}</dd>
                    </div>
                    <div>
                      <dt>Satış fiyatı</dt>
                      <dd>{formatMoney(p.selling_price)}</dd>
                    </div>
                    <div>
                      <dt>SKT</dt>
                      <dd>{fmtDate(p.expiration_date)}</dd>
                    </div>
                    <div>
                      <dt>Kalan gün</dt>
                      <dd className={critical ? "text-danger-strong" : undefined}>
                        {p.remaining_days}
                      </dd>
                    </div>
                    <div>
                      <dt>Kritik (API)</dt>
                      <dd>{p.shelf_status}</dd>
                    </div>
                    <div>
                      <dt>İndirim oranı</dt>
                      <dd>
                        {p.pricingError ? (
                          <span className="text-warn" title={p.pricingError}>
                            Alınamadı
                          </span>
                        ) : (
                          fmtPercent(p.discount_rate)
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Yeni fiyat</dt>
                      <dd className="product-dash-card__highlight">
                        {p.pricingError ? (
                          <span className="text-warn" title={p.pricingError}>
                            —
                          </span>
                        ) : (
                          formatMoney(p.new_price)
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>AI tahmini</dt>
                      <dd className="product-dash-card__predict">
                        {p.predictError ? (
                          <span className="text-warn" title={p.predictError}>
                            Tahmin yok
                          </span>
                        ) : (
                          `${p.predictedText}.`
                        )}
                      </dd>
                    </div>
                  </dl>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel__head">
          <h2>Kâr analizi (simülasyon)</h2>
          <Link to="/products" className="link-muted">
            Ürünlere git →
          </Link>
        </div>
        <div className="sim-grid">
          <div>
            <div className="sim-row">
              <span className="muted">Stok maliyeti</span>
              <strong>{formatMoney(sim.inventoryCost)}</strong>
            </div>
            <div className="sim-row">
              <span className="muted">Potansiyel ciro</span>
              <strong>{formatMoney(sim.potentialRevenue)}</strong>
            </div>
            <div className="sim-row">
              <span className="muted">İsraf baskısı</span>
              <strong className="text-danger">−{formatMoney(sim.wasteDrag)}</strong>
            </div>
          </div>
          <div className="bars">
            <div className="bars__label">Brüt marj / ciro (%{stats.marginPct})</div>
            <div className="bar-track">
              <div className="bar-fill bar-fill--blue" style={{ width: barGross + "%" }} />
            </div>
            <div className="bars__label">Düzeltilmiş marj / ciro (%{stats.adjPct})</div>
            <div className="bar-track">
              <div className="bar-fill bar-fill--green" style={{ width: barAdj + "%" }} />
            </div>
            <p className="bars__note muted">
              Çubuk genişliği ilgili yüzde ile orantılıdır (0–100%).
            </p>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel__head">
          <h2>En acil kritik ürünler</h2>
          <Link to="/critical" className="link-muted">
            Tümünü gör →
          </Link>
        </div>
        {topCritical.length === 0 ? (
          <p className="muted">Kritik ürün yok.</p>
        ) : (
          <ul className="mini-list">
            {topCritical.map((p) => (
              <li key={p.id} className="mini-list__item">
                <span className="mini-list__name">{p.name}</span>
                <span className="badge badge--danger">{p.remaining_days} gün</span>
                <span className="muted">{p.stock_quantity} adet</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
