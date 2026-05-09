import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function ProtectedRoute() {
  const { token, ready } = useAuth();
  const location = useLocation();

  if (!ready) {
    return (
      <div className="auth-loading">
        <div className="loading-spinner" aria-hidden />
        <p>Oturum kontrol ediliyor…</p>
      </div>
    );
  }

  if (!token) {
    const from =
      location.pathname === "/login" || location.pathname === "/register"
        ? "/"
        : location.pathname + location.search;
    return <Navigate to="/login" replace state={{ from }} />;
  }

  return <Outlet />;
}
