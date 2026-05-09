import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function NormalUserRoute() {
  const { profile } = useAuth();
  if (profile?.role === "super_admin") {
    return <Navigate to="/admin" replace />;
  }
  return <Outlet />;
}
