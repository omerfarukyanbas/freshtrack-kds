import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { GuestRoute } from "./components/GuestRoute";
import { Layout } from "./components/Layout";
import { AdminLayout } from "./components/AdminLayout";
import { NormalUserRoute } from "./components/NormalUserRoute";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { RoleHomeRedirect } from "./components/RoleHomeRedirect";
import { SuperAdminRoute } from "./components/SuperAdminRoute";
import { AIPredictionsPage } from "./pages/AIPredictionsPage";
import { AdminBusinessesPage } from "./pages/AdminBusinessesPage";
import { AdminPendingBusinessesPage } from "./pages/AdminPendingBusinessesPage";
import { AdminBusinessDetailPage } from "./pages/AdminBusinessDetailPage";
import { AdminBusinessProductsPage } from "./pages/AdminBusinessProductsPage";
import { AdminOverviewPage } from "./pages/AdminOverviewPage";
import { AdminSystemDataPage } from "./pages/AdminSystemDataPage";
import { AdminSystemStatsPage } from "./pages/AdminSystemStatsPage";
import { AlertsPage } from "./pages/AlertsPage";
import { CriticalPage } from "./pages/CriticalPage";
import { DashboardPage } from "./pages/DashboardPage";
import { DiscountSuggestionsPage } from "./pages/DiscountSuggestionsPage";
import { LoginPage } from "./pages/LoginPage";
import { ProductsPage } from "./pages/ProductsPage";
import { PricingPage } from "./pages/PricingPage";
import { ProfilePage } from "./pages/ProfilePage";
import { RegisterPage } from "./pages/RegisterPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SalesForecastPage } from "./pages/SalesForecastPage";
import { SettingsPage } from "./pages/SettingsPage";
import { StockPage } from "./pages/StockPage";
import { UnknownRedirect } from "./components/UnknownRedirect";
import { WasteAnalysisPage } from "./pages/WasteAnalysisPage";
import { ProfitAnalysisPage } from "./pages/ProfitAnalysisPage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<GuestRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<RoleHomeRedirect />} />

            <Route element={<NormalUserRoute />}>
              <Route path="/" element={<Layout />}>
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="products" element={<ProductsPage />} />
                <Route path="products/new" element={<ProductsPage />} />
                <Route path="stock" element={<StockPage />} />
                <Route path="pricing" element={<PricingPage />} />
                <Route path="ai-predictions" element={<AIPredictionsPage />} />
                <Route path="discount-suggestions" element={<DiscountSuggestionsPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="sales-forecast" element={<SalesForecastPage />} />
                <Route path="waste-analysis" element={<WasteAnalysisPage />} />
                <Route path="profit-analysis" element={<ProfitAnalysisPage />} />
                <Route path="critical" element={<CriticalPage />} />
                <Route path="alerts" element={<AlertsPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Route>
            </Route>

            <Route element={<SuperAdminRoute />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminOverviewPage />} />
                <Route path="pending-businesses" element={<AdminPendingBusinessesPage />} />
                <Route path="businesses" element={<AdminBusinessesPage />} />
                <Route path="businesses/:userId" element={<AdminBusinessDetailPage />} />
                <Route path="businesses/:userId/products" element={<AdminBusinessProductsPage />} />
                <Route path="system-data" element={<AdminSystemDataPage />} />
                <Route path="stats" element={<AdminSystemStatsPage />} />
                <Route path="*" element={<Navigate to="/admin" replace />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<UnknownRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
