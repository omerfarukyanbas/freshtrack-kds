import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const navSections = [
  {
    title: "GENEL",
    items: [{ to: "/dashboard", label: "Dashboard", icon: "DB", end: true }],
  },
  {
    title: "URUN YONETIMI",
    items: [
      { to: "/products", label: "Urunler", icon: "UR" },
      { to: "/products/new", label: "Urun Ekle", icon: "EK" },
      { to: "/stock", label: "Stok Takibi", icon: "ST" },
      { to: "/critical", label: "SKT Takibi", icon: "SK" },
    ],
  },
  {
    title: "FIYATLANDIRMA & AI",
    items: [
      { to: "/pricing", label: "Dinamik Fiyatlandirma", icon: "FY" },
      { to: "/ai-predictions", label: "AI Tahminler", icon: "AI" },
      { to: "/discount-suggestions", label: "Indirim Onerileri", icon: "IN" },
    ],
  },
  {
    title: "ANALIZ",
    items: [
      { to: "/reports", label: "Raporlar", icon: "RP" },
      { to: "/sales-forecast", label: "Satis Tahmini", icon: "SA" },
      { to: "/waste-analysis", label: "Israf Analizi", icon: "IS" },
      { to: "/profit-analysis", label: "Kar Analizi", icon: "KR" },
    ],
  },
  {
    title: "BILDIRIMLER",
    items: [
      { to: "/critical", label: "Kritik Urunler", icon: "KU" },
      { to: "/alerts", label: "Uyarilar", icon: "UY" },
    ],
  },
  {
    title: "SISTEM",
    items: [
      { to: "/profile", label: "Profil", icon: "PR" },
      { to: "/settings", label: "Ayarlar", icon: "AY" },
    ],
  },
];

export function Layout() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();

  function onLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark" aria-hidden />
          <div>
            <div className="brand-title">FreshTrack</div>
            <div className="brand-sub">KDS Yönetim</div>
          </div>
        </div>
        {profile ? (
          <div className="sidebar-user">
            <div className="sidebar-user__biz">{profile.business_name}</div>
            <div className="sidebar-user__owner muted">{profile.owner_name}</div>
            <div className="sidebar-user__email muted">{profile.email}</div>
          </div>
        ) : null}
        <nav className="side-nav">
          {navSections.map((section) => (
            <section key={section.title} className="side-group">
              <h2 className="side-group__title">{section.title}</h2>
              <div className="side-group__links">
                {section.items.map((item) => (
                  <NavLink
                    key={item.to + item.label}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      "side-link" + (isActive ? " side-link--active" : "")
                    }
                  >
                    <span className="side-link__icon" aria-hidden>
                      {item.icon}
                    </span>
                    <span className="side-link__label">{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </section>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="side-group__title side-group__title--system">SISTEM</div>
          <button type="button" className="btn btn--ghost btn--block btn--sm" onClick={onLogout}>
            Cikis Yap
          </button>
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <h1 className="page-heading">Mutfak & stok paneli</h1>
          <div className="topbar-meta">
            <span className="pill pill--live">Oturum açık</span>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
