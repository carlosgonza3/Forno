import { lazy, Suspense } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "../features/auth/AuthProvider";
import LoginPage from "../features/auth/LoginPage";
import MfaPage from "../features/auth/MfaPage";
import ProtectedRoute from "../features/auth/ProtectedRoute";
import ResetPasswordPage from "../features/auth/ResetPasswordPage";
import SetupPage from "../features/auth/SetupPage";

const OperationsPage = lazy(() => import("../features/dashboard/pages/OperationsPage"));

function RouteLoading() {
  return <main className="system-state"><div className="system-state-card"><div className="state-spinner" /><h1>Cargando módulo</h1><p>Preparando tu espacio de trabajo…</p></div></main>;
}

export default function AppRouter() {
  return <HashRouter>
    <AuthProvider>
      <Routes>
        <Route path="/setup" element={<SetupPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/mfa" element={<MfaPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/app/*" element={<Suspense fallback={<RouteLoading />}><OperationsPage /></Suspense>} />
        </Route>
        <Route path="/preview" element={<Suspense fallback={<RouteLoading />}><OperationsPage /></Suspense>} />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </AuthProvider>
  </HashRouter>;
}
