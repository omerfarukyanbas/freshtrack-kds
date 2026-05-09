import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function UnknownRedirect() {
  const { token, ready } = useAuth();
  if (!ready) {
    return (
      <div className="auth-loading">
        <div className="loading-spinner" aria-hidden />
      </div>
    );
  }
  return <Navigate to={token ? "/" : "/login"} replace />;
}
