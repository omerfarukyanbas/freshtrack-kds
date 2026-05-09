import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function SuperAdminRoute() {
  const { profile } = useAuth();
  if (profile?.role !== "super_admin") {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
}
