import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function RoleHomeRedirect() {
  const { profile } = useAuth();
  if (profile?.role === "super_admin") {
    return <Navigate to="/admin" replace />;
  }
  return <Navigate to="/dashboard" replace />;
}
