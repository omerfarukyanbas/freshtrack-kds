import { useEffect, useMemo, useState } from "react";

type RefreshInterval = 15 | 30 | 60;
type DateFormat = "tr-TR" | "en-GB" | "en-US";
type PressureLevel = "Dusuk" | "Orta" | "Yuksek";
type Density = "compact" | "normal";
type CardView = "standard" | "detailed";

type SettingsState = {
  system: {
    autoDataRefresh: boolean;
    dashboardRefreshInterval: RefreshInterval;
    defaultCurrency: "TRY";
    dateFormat: DateFormat;
    criticalExpiryThresholdDays: 3 | 5 | 7;
  };
  notifications: {
    criticalExpiry: boolean;
    overstock: boolean;
    aiSalesRisk: boolean;
    dynamicPricing: boolean;
    system: boolean;
  };
  pricing: {
    maxDiscountRate: number;
    stockPressureLevel: PressureLevel;
    salesVelocityWeight: number;
    expiryWeight: number;
    aiPricingEnabled: boolean;
  };
  ai: {
    salesForecastModelEnabled: boolean;
    autoForecastUpdate: boolean;
    showAiOnDashboard: boolean;
  };
  appearance: {
    panelDensity: Density;
    cardView: CardView;
  };
};

type ToastState = {
  kind: "success" | "error" | "loading";
  message: string;
} | null;

const SETTINGS_KEY = "freshtrack_settings_v1";

const defaultSettings: SettingsState = {
  system: {
    autoDataRefresh: true,
    dashboardRefreshInterval: 30,
    defaultCurrency: "TRY",
    dateFormat: "tr-TR",
    criticalExpiryThresholdDays: 5,
  },
  notifications: {
    criticalExpiry: true,
    overstock: true,
    aiSalesRisk: true,
    dynamicPricing: true,
    system: true,
  },
  pricing: {
    maxDiscountRate: 30,
    stockPressureLevel: "Orta",
    salesVelocityWeight: 50,
    expiryWeight: 50,
    aiPricingEnabled: true,
  },
  ai: {
    salesForecastModelEnabled: true,
    autoForecastUpdate: true,
    showAiOnDashboard: true,
  },
  appearance: {
    panelDensity: "normal",
    cardView: "standard",
  },
};

function parseSettings(raw: string | null): SettingsState {
  if (!raw) return defaultSettings;
  try {
    const parsed = JSON.parse(raw) as Partial<SettingsState>;
    return {
      system: { ...defaultSettings.system, ...parsed.system, defaultCurrency: "TRY" },
      notifications: { ...defaultSettings.notifications, ...parsed.notifications },
      pricing: { ...defaultSettings.pricing, ...parsed.pricing },
      ai: { ...defaultSettings.ai, ...parsed.ai },
      appearance: { ...defaultSettings.appearance, ...parsed.appearance },
    };
  } catch {
    return defaultSettings;
  }
}

export function SettingsPage() {
  const [settings, setSettings] = useState<SettingsState>(() =>
    parseSettings(localStorage.getItem(SETTINGS_KEY)),
  );
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (!toast || toast.kind === "loading") return;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const pricingBalance = useMemo(
    () => Math.max(0, 100 - settings.pricing.salesVelocityWeight - settings.pricing.expiryWeight),
    [settings.pricing.expiryWeight, settings.pricing.salesVelocityWeight],
  );

  function showSuccess(message: string) {
    setToast({ kind: "success", message });
  }

  function showError(message: string) {
    setToast({ kind: "error", message });
  }

  function updateSettings(updater: (prev: SettingsState) => SettingsState) {
    setSettings((prev) => updater(prev));
  }

  async function handleCacheClear() {
    setToast({ kind: "loading", message: "Cache temizleniyor..." });
    await new Promise((resolve) => window.setTimeout(resolve, 650));
    localStorage.removeItem("freshtrack_dashboard_cache");
    localStorage.removeItem("freshtrack_products_cache");
    showSuccess("Cache temizlendi.");
  }

  async function handleResetDemo() {
    setToast({ kind: "loading", message: "Demo ayarlari sifirlaniyor..." });
    await new Promise((resolve) => window.setTimeout(resolve, 700));
    setSettings(defaultSettings);
    showSuccess("Demo ayarlari varsayilana donduruldu.");
  }

  function handleExportSettings() {
    try {
      const json = JSON.stringify(settings, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "freshtrack-settings.json";
      anchor.click();
      URL.revokeObjectURL(url);
      showSuccess("Ayarlar JSON olarak export edildi.");
    } catch {
      showError("Ayarlar export edilirken hata olustu.");
    }
  }

  return (
    <div className="stack">
      {toast ? (
        <div
          className={
            "toast " +
            (toast.kind === "success"
              ? "toast--success"
              : toast.kind === "error"
                ? "toast--error"
                : "toast--loading")
          }
          role="status"
          aria-live="polite"
        >
          {toast.message}
        </div>
      ) : null}

      <section className="panel">
        <div className="panel__head">
          <h2>Sistem Tercihleri</h2>
        </div>
        <div className="settings-grid">
          <label className="settings-item settings-item--toggle">
            <span>Otomatik veri yenileme</span>
            <input
              type="checkbox"
              checked={settings.system.autoDataRefresh}
              onChange={(e) =>
                updateSettings((prev) => ({
                  ...prev,
                  system: { ...prev.system, autoDataRefresh: e.target.checked },
                }))
              }
            />
          </label>

          <label className="field field--stack">
            <span>Dashboard auto refresh interval</span>
            <select
              className="profile-select"
              value={settings.system.dashboardRefreshInterval}
              onChange={(e) =>
                updateSettings((prev) => ({
                  ...prev,
                  system: {
                    ...prev.system,
                    dashboardRefreshInterval: Number(e.target.value) as RefreshInterval,
                  },
                }))
              }
            >
              <option value={15}>15 sn</option>
              <option value={30}>30 sn</option>
              <option value={60}>60 sn</option>
            </select>
          </label>

          <label className="field field--stack">
            <span>Varsayilan para birimi</span>
            <input value="TRY" disabled />
          </label>

          <label className="field field--stack">
            <span>Tarih formati</span>
            <select
              className="profile-select"
              value={settings.system.dateFormat}
              onChange={(e) =>
                updateSettings((prev) => ({
                  ...prev,
                  system: { ...prev.system, dateFormat: e.target.value as DateFormat },
                }))
              }
            >
              <option value="tr-TR">GG.AA.YYYY (tr-TR)</option>
              <option value="en-GB">DD/MM/YYYY (en-GB)</option>
              <option value="en-US">MM/DD/YYYY (en-US)</option>
            </select>
          </label>

          <label className="field field--stack">
            <span>Kritik SKT esik gunu</span>
            <select
              className="profile-select"
              value={settings.system.criticalExpiryThresholdDays}
              onChange={(e) =>
                updateSettings((prev) => ({
                  ...prev,
                  system: {
                    ...prev.system,
                    criticalExpiryThresholdDays: Number(e.target.value) as 3 | 5 | 7,
                  },
                }))
              }
            >
              <option value={3}>3 gun</option>
              <option value={5}>5 gun</option>
              <option value={7}>7 gun</option>
            </select>
          </label>
        </div>
      </section>

      <section className="panel">
        <div className="panel__head">
          <h2>Bildirim Ayarlari</h2>
        </div>
        <div className="settings-list">
          <label className="settings-item settings-item--toggle">
            <span>Kritik SKT bildirimleri</span>
            <input
              type="checkbox"
              checked={settings.notifications.criticalExpiry}
              onChange={(e) =>
                updateSettings((prev) => ({
                  ...prev,
                  notifications: { ...prev.notifications, criticalExpiry: e.target.checked },
                }))
              }
            />
          </label>
          <label className="settings-item settings-item--toggle">
            <span>Stok fazlasi bildirimleri</span>
            <input
              type="checkbox"
              checked={settings.notifications.overstock}
              onChange={(e) =>
                updateSettings((prev) => ({
                  ...prev,
                  notifications: { ...prev.notifications, overstock: e.target.checked },
                }))
              }
            />
          </label>
          <label className="settings-item settings-item--toggle">
            <span>AI satis riski bildirimleri</span>
            <input
              type="checkbox"
              checked={settings.notifications.aiSalesRisk}
              onChange={(e) =>
                updateSettings((prev) => ({
                  ...prev,
                  notifications: { ...prev.notifications, aiSalesRisk: e.target.checked },
                }))
              }
            />
          </label>
          <label className="settings-item settings-item--toggle">
            <span>Dinamik fiyat onerileri</span>
            <input
              type="checkbox"
              checked={settings.notifications.dynamicPricing}
              onChange={(e) =>
                updateSettings((prev) => ({
                  ...prev,
                  notifications: { ...prev.notifications, dynamicPricing: e.target.checked },
                }))
              }
            />
          </label>
          <label className="settings-item settings-item--toggle">
            <span>Sistem bildirimleri</span>
            <input
              type="checkbox"
              checked={settings.notifications.system}
              onChange={(e) =>
                updateSettings((prev) => ({
                  ...prev,
                  notifications: { ...prev.notifications, system: e.target.checked },
                }))
              }
            />
          </label>
        </div>
      </section>

      <section className="panel">
        <div className="panel__head">
          <h2>Dinamik Fiyatlandirma Ayarlari</h2>
        </div>
        <div className="settings-grid">
          <label className="field field--stack">
            <span>Maksimum indirim orani (%10-%70)</span>
            <input
              type="range"
              min={10}
              max={70}
              step={1}
              value={settings.pricing.maxDiscountRate}
              onChange={(e) =>
                updateSettings((prev) => ({
                  ...prev,
                  pricing: { ...prev.pricing, maxDiscountRate: Number(e.target.value) },
                }))
              }
            />
            <strong className="settings-value">%{settings.pricing.maxDiscountRate}</strong>
          </label>

          <label className="field field--stack">
            <span>Stok baskisi seviyesi</span>
            <select
              className="profile-select"
              value={settings.pricing.stockPressureLevel}
              onChange={(e) =>
                updateSettings((prev) => ({
                  ...prev,
                  pricing: {
                    ...prev.pricing,
                    stockPressureLevel: e.target.value as PressureLevel,
                  },
                }))
              }
            >
              <option value="Dusuk">Dusuk</option>
              <option value="Orta">Orta</option>
              <option value="Yuksek">Yuksek</option>
            </select>
          </label>

          <label className="field field--stack">
            <span>Satis hizi agirligi</span>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={settings.pricing.salesVelocityWeight}
              onChange={(e) =>
                updateSettings((prev) => ({
                  ...prev,
                  pricing: { ...prev.pricing, salesVelocityWeight: Number(e.target.value) },
                }))
              }
            />
            <strong className="settings-value">%{settings.pricing.salesVelocityWeight}</strong>
          </label>

          <label className="field field--stack">
            <span>SKT agirligi</span>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={settings.pricing.expiryWeight}
              onChange={(e) =>
                updateSettings((prev) => ({
                  ...prev,
                  pricing: { ...prev.pricing, expiryWeight: Number(e.target.value) },
                }))
              }
            />
            <strong className="settings-value">%{settings.pricing.expiryWeight}</strong>
          </label>

          <label className="settings-item settings-item--toggle">
            <span>AI pricing aktif/pasif</span>
            <input
              type="checkbox"
              checked={settings.pricing.aiPricingEnabled}
              onChange={(e) =>
                updateSettings((prev) => ({
                  ...prev,
                  pricing: { ...prev.pricing, aiPricingEnabled: e.target.checked },
                }))
              }
            />
          </label>
        </div>
        <p className="muted settings-note">
          Agirlik toplami %100 u asarsa kalan pay 0 olarak kabul edilir. Mevcut kalan pay: %{pricingBalance}
        </p>
      </section>

      <section className="panel">
        <div className="panel__head">
          <h2>Yapay Zeka Ayarlari</h2>
        </div>
        <div className="settings-list">
          <label className="settings-item settings-item--toggle">
            <span>Satis tahmin modeli aktif</span>
            <input
              type="checkbox"
              checked={settings.ai.salesForecastModelEnabled}
              onChange={(e) =>
                updateSettings((prev) => ({
                  ...prev,
                  ai: { ...prev.ai, salesForecastModelEnabled: e.target.checked },
                }))
              }
            />
          </label>
          <label className="settings-item settings-item--toggle">
            <span>Otomatik tahmin guncelleme</span>
            <input
              type="checkbox"
              checked={settings.ai.autoForecastUpdate}
              onChange={(e) =>
                updateSettings((prev) => ({
                  ...prev,
                  ai: { ...prev.ai, autoForecastUpdate: e.target.checked },
                }))
              }
            />
          </label>
          <label className="settings-item settings-item--toggle">
            <span>AI onerilerini dashboard'da goster</span>
            <input
              type="checkbox"
              checked={settings.ai.showAiOnDashboard}
              onChange={(e) =>
                updateSettings((prev) => ({
                  ...prev,
                  ai: { ...prev.ai, showAiOnDashboard: e.target.checked },
                }))
              }
            />
          </label>
        </div>
      </section>

      <section className="panel">
        <div className="panel__head">
          <h2>Tema ve Gorunum</h2>
        </div>
        <div className="settings-grid">
          <div className="settings-item">
            <span>Dark mode bilgisi</span>
            <strong>Dark mode aktif</strong>
          </div>
          <label className="field field--stack">
            <span>Panel yogunlugu</span>
            <select
              className="profile-select"
              value={settings.appearance.panelDensity}
              onChange={(e) =>
                updateSettings((prev) => ({
                  ...prev,
                  appearance: { ...prev.appearance, panelDensity: e.target.value as Density },
                }))
              }
            >
              <option value="compact">Compact</option>
              <option value="normal">Normal</option>
            </select>
          </label>
          <label className="field field--stack">
            <span>Kart gorunumu secimi</span>
            <select
              className="profile-select"
              value={settings.appearance.cardView}
              onChange={(e) =>
                updateSettings((prev) => ({
                  ...prev,
                  appearance: { ...prev.appearance, cardView: e.target.value as CardView },
                }))
              }
            >
              <option value="standard">Standart</option>
              <option value="detailed">Detayli</option>
            </select>
          </label>
        </div>
      </section>

      <section className="panel">
        <div className="panel__head">
          <h2>Entegrasyonlar</h2>
        </div>
        <div className="settings-integration-grid">
          {["POS entegrasyonu", "Barkod sistemi", "ERP entegrasyonu", "E-fatura entegrasyonu"].map(
            (item) => (
              <article key={item} className="settings-integration-card">
                <h3>{item}</h3>
                <p className="muted">YAKINDA</p>
              </article>
            ),
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel__head">
          <h2>Veri Yonetimi</h2>
        </div>
        <div className="settings-actions">
          <button type="button" className="btn btn--ghost" onClick={handleCacheClear}>
            Cache temizle
          </button>
          <button type="button" className="btn btn--danger" onClick={handleResetDemo}>
            Demo verileri sifirla
          </button>
          <button type="button" className="btn btn--primary" onClick={handleExportSettings}>
            Export settings JSON
          </button>
        </div>
      </section>
    </div>
  );
}
