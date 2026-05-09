import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const adminNav = [
  { to: "/admin", label: "Genel Bakis", icon: "GB", end: true },
  { to: "/admin/pending-businesses", label: "Bekleyen Isletmeler", icon: "BK" },
  { to: "/admin/businesses", label: "Isletmeler", icon: "IS" },
  { to: "/admin/system-data", label: "Sistem Verileri", icon: "SV" },
  { to: "/admin/stats", label: "Sistem Istatistikleri", icon: "ST" },
];

export function AdminLayout() {
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
            <div className="brand-sub">Super Admin</div>
          </div>
        </div>
        {profile ? (
          <div className="sidebar-user">
            <div className="sidebar-user__biz">Sistem Yoneticisi</div>
            <div className="sidebar-user__owner muted">{profile.owner_name}</div>
            <div className="sidebar-user__email muted">{profile.email}</div>
          </div>
        ) : null}
        <nav className="side-nav">
          <section className="side-group">
            <h2 className="side-group__title">SUPER ADMIN PANELI</h2>
            <div className="side-group__links">
              {adminNav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => "side-link" + (isActive ? " side-link--active" : "")}
                >
                  <span className="side-link__icon" aria-hidden>
                    {item.icon}
                  </span>
                  <span className="side-link__label">{item.label}</span>
                </NavLink>
              ))}
            </div>
          </section>
        </nav>
        <div className="sidebar-foot">
          <button type="button" className="btn btn--ghost btn--block btn--sm" onClick={onLogout}>
            Cikis Yap
          </button>
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <h1 className="page-heading">Super Admin Panel</h1>
          <div className="topbar-meta">
            <span className="pill">Sistem geneli</span>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
