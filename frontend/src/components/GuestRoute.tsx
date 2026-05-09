import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

/** Giriş yapmış kullanıcıyı panele yönlendirir. */
export function GuestRoute() {
  const { token, ready } = useAuth();

  if (!ready) {
    return (
      <div className="auth-loading">
        <div className="loading-spinner" aria-hidden />
      </div>
    );
  }

  if (token) return <Navigate to="/" replace />;
  return <Outlet />;
}
