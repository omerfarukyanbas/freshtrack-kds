import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { changePassword, fetchProfile, updateProfile } from "../api/auth";
import { fetchProducts } from "../api/products";
import { shouldRedirectToLogin } from "../api/http";
import { useAuth } from "../auth/AuthContext";
import { StatCard } from "../components/StatCard";
import { criticalCount, estimateWaste } from "../lib/metrics";
import type { Product } from "../types/product";

type BusinessType = "market" | "bakkal" | "mini market";

type ProfileData = {
  business_name?: string;
  owner_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  business_type?: BusinessType;
  username?: string;
  created_at?: string;
  account_status?: string;
  preferences?: {
    notifications_enabled?: boolean;
    critical_skt_alerts?: boolean;
    overstock_alerts?: boolean;
    ai_suggestion_alerts?: boolean;
  };
};

const PROFILE_KEY = "freshtrack_profile";
const TOKEN_KEY = "freshtrack_access_token";

function money(v: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(v);
}

function formatDate(raw?: string): string {
  if (!raw) return "Bilinmiyor";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("tr-TR");
}

function businessTypeLabel(value?: string): string {
  if (!value) return "Belirtilmedi";
  if (value === "market") return "Market";
  if (value === "bakkal") return "Bakkal";
  if (value === "mini market") return "Mini market";
  return value;
}

export function ProfilePage() {
  const navigate = useNavigate();
  const { logout, profile: authProfile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [notifyEnabled, setNotifyEnabled] = useState(true);
  const [criticalAlerts, setCriticalAlerts] = useState(true);
  const [overstockAlerts, setOverstockAlerts] = useState(true);
  const [aiAlerts, setAiAlerts] = useState(true);
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    new_password_repeat: "",
  });
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [businessForm, setBusinessForm] = useState({
    business_name: "",
    owner_name: "",
    email: "",
    phone: "",
    address: "",
    business_type: "market" as BusinessType,
  });
  const [businessMessage, setBusinessMessage] = useState<string | null>(null);
  const [businessError, setBusinessError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem(TOKEN_KEY)?.trim();
      if (!token) {
        logout();
        navigate("/login", { replace: true });
        return;
      }

      const raw = localStorage.getItem(PROFILE_KEY);
      let parsed: ProfileData | null = null;

      if (raw) {
        try {
          parsed = JSON.parse(raw) as ProfileData;
        } catch {
          setError("Profil verisi okunamadı. Lütfen tekrar giriş yapın.");
        }
      }

      const baseProfile: ProfileData = {
        business_name: parsed?.business_name ?? authProfile?.business_name ?? "-",
        owner_name: parsed?.owner_name ?? authProfile?.owner_name ?? "-",
        email: parsed?.email ?? authProfile?.email ?? "-",
        phone: parsed?.phone ?? "Belirtilmedi",
        address: parsed?.address ?? "Belirtilmedi",
        business_type: parsed?.business_type ?? "market",
        username: parsed?.username ?? parsed?.email ?? authProfile?.email ?? "-",
        created_at: parsed?.created_at ?? new Date().toISOString(),
        account_status: parsed?.account_status ?? "Aktif",
        preferences: {
          notifications_enabled: parsed?.preferences?.notifications_enabled ?? true,
          critical_skt_alerts: parsed?.preferences?.critical_skt_alerts ?? true,
          overstock_alerts: parsed?.preferences?.overstock_alerts ?? true,
          ai_suggestion_alerts: parsed?.preferences?.ai_suggestion_alerts ?? true,
        },
      };

      try {
        const serverProfile = await fetchProfile();
        baseProfile.business_name = serverProfile.business_name;
        baseProfile.owner_name = serverProfile.owner_name;
        baseProfile.email = serverProfile.email;
        baseProfile.phone = serverProfile.phone ?? "Belirtilmedi";
        baseProfile.address = serverProfile.address ?? "Belirtilmedi";
        baseProfile.business_type = serverProfile.business_type;
        baseProfile.created_at = serverProfile.created_at;
        baseProfile.account_status = serverProfile.account_status;
      } catch (e) {
        if (shouldRedirectToLogin(e)) {
          logout();
          navigate("/login", { replace: true });
          return;
        }
      }

      localStorage.setItem(PROFILE_KEY, JSON.stringify(baseProfile));
      setProfileData(baseProfile);
      setBusinessForm({
        business_name: baseProfile.business_name ?? "",
        owner_name: baseProfile.owner_name ?? "",
        email: baseProfile.email ?? "",
        phone: baseProfile.phone ?? "",
        address: baseProfile.address ?? "",
        business_type: baseProfile.business_type ?? "market",
      });
      setNotifyEnabled(Boolean(baseProfile.preferences?.notifications_enabled));
      setCriticalAlerts(Boolean(baseProfile.preferences?.critical_skt_alerts));
      setOverstockAlerts(Boolean(baseProfile.preferences?.overstock_alerts));
      setAiAlerts(Boolean(baseProfile.preferences?.ai_suggestion_alerts));

      try {
        const items = await fetchProducts();
        setProducts(items);
      } catch (e) {
        if (shouldRedirectToLogin(e)) {
          logout();
          navigate("/login", { replace: true });
          return;
        }
        setProducts([]);
        setError(e instanceof Error ? e.message : "Profil verileri yüklenemedi.");
      } finally {
        setLoading(false);
      }
    }

    void loadProfile();
  }, [authProfile?.business_name, authProfile?.email, authProfile?.owner_name, logout, navigate]);

  const stats = useMemo(() => {
    const totalProducts = products.length;
    const criticalProducts = criticalCount(products);
    const stockRisk = totalProducts > 0 ? Math.round((criticalProducts / totalProducts) * 100) : 0;
    const estimatedLoss = estimateWaste(products);
    return { totalProducts, criticalProducts, stockRisk, estimatedLoss };
  }, [products]);

  function updatePreference<K extends keyof NonNullable<ProfileData["preferences"]>>(
    key: K,
    value: boolean,
  ) {
    setProfileData((prev) => {
      if (!prev) return prev;
      const next: ProfileData = {
        ...prev,
        preferences: {
          ...prev.preferences,
          [key]: value,
        },
      };
      localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
      return next;
    });
  }

  async function onSubmitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordMessage(null);
    setPasswordError(null);

    if (!passwordForm.current_password || !passwordForm.new_password || !passwordForm.new_password_repeat) {
      setPasswordError("Tum alanlari doldurun.");
      return;
    }
    if (passwordForm.new_password.length < 8) {
      setPasswordError("Yeni sifre en az 8 karakter olmali.");
      return;
    }
    if (passwordForm.new_password !== passwordForm.new_password_repeat) {
      setPasswordError("Yeni sifre tekrar alani eslesmiyor.");
      return;
    }
    if (passwordForm.current_password === passwordForm.new_password) {
      setPasswordError("Yeni sifre mevcut sifre ile ayni olamaz.");
      return;
    }

    try {
      const res = await changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
      setPasswordMessage(res.message);
      setPasswordForm({
        current_password: "",
        new_password: "",
        new_password_repeat: "",
      });
    } catch (e) {
      if (shouldRedirectToLogin(e)) {
        logout();
        navigate("/login", { replace: true });
        return;
      }
      setPasswordError(e instanceof Error ? e.message : "Sifre guncellenemedi.");
    }
  }

  async function onSubmitBusiness(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusinessMessage(null);
    setBusinessError(null);

    if (!businessForm.business_name.trim()) {
      setBusinessError("Isletme adi bos birakilamaz.");
      return;
    }
    if (!businessForm.owner_name.trim()) {
      setBusinessError("Sahip adi bos birakilamaz.");
      return;
    }
    if (!businessForm.email.trim()) {
      setBusinessError("E-posta bos birakilamaz.");
      return;
    }

    try {
      const updated = await updateProfile({
        business_name: businessForm.business_name.trim(),
        owner_name: businessForm.owner_name.trim(),
        email: businessForm.email.trim(),
        phone: businessForm.phone.trim() || null,
        address: businessForm.address.trim() || null,
        business_type: businessForm.business_type,
      });

      setProfileData((prev) => {
        if (!prev) return prev;
        const next: ProfileData = {
          ...prev,
          business_name: updated.business_name,
          owner_name: updated.owner_name,
          email: updated.email,
          phone: updated.phone ?? "Belirtilmedi",
          address: updated.address ?? "Belirtilmedi",
          business_type: updated.business_type,
          created_at: updated.created_at,
          account_status: updated.account_status,
          username: prev.username ?? updated.email,
        };
        localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
        return next;
      });

      setBusinessMessage("Isletme bilgileri backend uzerinden guncellendi.");
    } catch (e) {
      if (shouldRedirectToLogin(e)) {
        logout();
        navigate("/login", { replace: true });
        return;
      }
      setBusinessError(
        e instanceof Error ? e.message : "Isletme bilgileri guncellenemedi.",
      );
    }
  }

  function onLogoutClick() {
    logout();
    navigate("/login", { replace: true });
  }

  if (loading) {
    return (
      <div className="loading-block" role="status" aria-live="polite">
        <div className="loading-spinner" aria-hidden />
        <p className="loading-block__text">Profil verileri yukleniyor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="stack">
        <div className="alert alert--error" role="alert">
          <strong>Profil sayfasi acilamadi.</strong> {error}
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="grid-stats">
        <StatCard title="Toplam urun" value={stats.totalProducts} hint="Envanterdeki urun adedi" />
        <StatCard
          title="Kritik urun"
          value={stats.criticalProducts}
          hint="SKT <= 7 gun"
          variant={stats.criticalProducts > 0 ? "danger" : "success"}
        />
        <StatCard
          title="Stok riski"
          value={`%${stats.stockRisk}`}
          hint="Kritik urun / toplam urun"
          variant={stats.stockRisk >= 40 ? "danger" : "accent"}
        />
        <StatCard
          title="Tahmini kayip"
          value={money(stats.estimatedLoss)}
          hint="Kritik urun bazli simule kayip"
          variant={stats.estimatedLoss > 0 ? "danger" : "success"}
        />
      </div>

      <section className="panel">
        <div className="panel__head">
          <h2>Isletme Bilgileri</h2>
        </div>
        <form className="profile-business-form" onSubmit={onSubmitBusiness}>
          <label className="field field--stack">
            <span>Isletme adi</span>
            <input
              type="text"
              value={businessForm.business_name}
              onChange={(e) =>
                setBusinessForm((prev) => ({ ...prev, business_name: e.target.value }))
              }
              placeholder="Isletme adini girin"
            />
          </label>
          <label className="field field--stack">
            <span>Sahip adi</span>
            <input
              type="text"
              value={businessForm.owner_name}
              onChange={(e) => setBusinessForm((prev) => ({ ...prev, owner_name: e.target.value }))}
              placeholder="Sahip adini girin"
            />
          </label>
          <label className="field field--stack">
            <span>E-posta</span>
            <input
              type="email"
              value={businessForm.email}
              onChange={(e) => setBusinessForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="ornek@firma.com"
            />
          </label>
          <label className="field field--stack">
            <span>Telefon</span>
            <input
              type="text"
              value={businessForm.phone}
              onChange={(e) => setBusinessForm((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder="+90 ..."
            />
          </label>
          <label className="field field--stack field--full">
            <span>Adres</span>
            <input
              type="text"
              value={businessForm.address}
              onChange={(e) => setBusinessForm((prev) => ({ ...prev, address: e.target.value }))}
              placeholder="Acik adres"
            />
          </label>
          <label className="field field--stack">
            <span>Isletme tipi</span>
            <select
              className="profile-select"
              value={businessForm.business_type}
              onChange={(e) =>
                setBusinessForm((prev) => ({
                  ...prev,
                  business_type: e.target.value as BusinessType,
                }))
              }
            >
              <option value="market">Market</option>
              <option value="bakkal">Bakkal</option>
              <option value="mini market">Mini market</option>
            </select>
          </label>
          <div className="profile-business-actions">
            <button type="submit" className="btn btn--primary">
              Isletme Bilgilerini Kaydet
            </button>
          </div>
          {businessError ? (
            <p className="alert alert--error profile-inline-alert" role="alert">
              {businessError}
            </p>
          ) : null}
          {businessMessage ? <p className="profile-success-text">{businessMessage}</p> : null}
        </form>
        <dl className="profile-info-grid">
          <div>
            <dt>Kayitli isletme tipi</dt>
            <dd>{businessTypeLabel(profileData?.business_type)}</dd>
          </div>
        </dl>
      </section>

      <section className="panel">
        <div className="panel__head">
          <h2>Hesap Bilgileri</h2>
        </div>
        <dl className="profile-info-grid">
          <div>
            <dt>Kullanici adi / email</dt>
            <dd>{profileData?.username ?? profileData?.email ?? "-"}</dd>
          </div>
          <div>
            <dt>Kayit tarihi</dt>
            <dd>{formatDate(profileData?.created_at)}</dd>
          </div>
          <div>
            <dt>Hesap durumu</dt>
            <dd>
              <span className="badge badge--ok">{profileData?.account_status ?? "Aktif"}</span>
            </dd>
          </div>
        </dl>
      </section>

      <section className="panel">
        <div className="panel__head">
          <h2>Guvenlik</h2>
        </div>
        <form className="profile-security-form" onSubmit={onSubmitPassword}>
          <label className="field field--stack">
            <span>Mevcut sifre</span>
            <input
              type="password"
              value={passwordForm.current_password}
              onChange={(e) =>
                setPasswordForm((prev) => ({ ...prev, current_password: e.target.value }))
              }
              placeholder="********"
            />
          </label>
          <label className="field field--stack">
            <span>Yeni sifre</span>
            <input
              type="password"
              value={passwordForm.new_password}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, new_password: e.target.value }))}
              placeholder="En az 8 karakter"
            />
          </label>
          <label className="field field--stack">
            <span>Yeni sifre tekrar</span>
            <input
              type="password"
              value={passwordForm.new_password_repeat}
              onChange={(e) =>
                setPasswordForm((prev) => ({ ...prev, new_password_repeat: e.target.value }))
              }
              placeholder="Yeni sifreyi tekrar girin"
            />
          </label>
          <div className="profile-security-actions">
            <button type="submit" className="btn btn--primary">
              Sifreyi Guncelle
            </button>
            <button type="button" className="btn btn--danger" onClick={onLogoutClick}>
              Cikis Yap
            </button>
          </div>
          {passwordError ? (
            <p className="alert alert--error profile-inline-alert" role="alert">
              {passwordError}
            </p>
          ) : null}
          {passwordMessage ? <p className="profile-success-text">{passwordMessage}</p> : null}
        </form>
      </section>

      <section className="panel">
        <div className="panel__head">
          <h2>Tercihler</h2>
        </div>
        <div className="profile-preferences">
          <div className="profile-pref-row">
            <span>Tema</span>
            <strong>Dark mode aktif</strong>
          </div>
          <label className="profile-toggle">
            <span>Bildirim tercihleri</span>
            <input
              type="checkbox"
              checked={notifyEnabled}
              onChange={(e) => {
                const checked = e.target.checked;
                setNotifyEnabled(checked);
                updatePreference("notifications_enabled", checked);
              }}
            />
          </label>
          <label className="profile-toggle">
            <span>Kritik SKT uyarilari</span>
            <input
              type="checkbox"
              checked={criticalAlerts}
              disabled={!notifyEnabled}
              onChange={(e) => {
                const checked = e.target.checked;
                setCriticalAlerts(checked);
                updatePreference("critical_skt_alerts", checked);
              }}
            />
          </label>
          <label className="profile-toggle">
            <span>Stok fazlasi uyarilari</span>
            <input
              type="checkbox"
              checked={overstockAlerts}
              disabled={!notifyEnabled}
              onChange={(e) => {
                const checked = e.target.checked;
                setOverstockAlerts(checked);
                updatePreference("overstock_alerts", checked);
              }}
            />
          </label>
          <label className="profile-toggle">
            <span>AI onerileri uyarilari</span>
            <input
              type="checkbox"
              checked={aiAlerts}
              disabled={!notifyEnabled}
              onChange={(e) => {
                const checked = e.target.checked;
                setAiAlerts(checked);
                updatePreference("ai_suggestion_alerts", checked);
              }}
            />
          </label>
        </div>
      </section>
    </div>
  );
}
