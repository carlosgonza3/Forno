import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";

export default function ProtectedRoute() {
  const { configured, loading, session, profile, needsMfa } = useAuth();
  const location = useLocation();

  if (!configured) return <Navigate to="/setup" replace />;
  if (loading) return <AppLoading />;
  if (!session) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!profile) return <IdentityError />;
  if (needsMfa) return <Navigate to="/mfa" replace />;

  return <Outlet />;
}

function AppLoading() {
  return <main className="system-state"><div className="system-state-card"><div className="state-spinner" /><h1>Cargando Forno</h1><p>Restaurando tu sesión segura…</p></div></main>;
}

function IdentityError() {
  const { signOut } = useAuth();
  return <main className="system-state"><div className="system-state-card"><span className="state-kicker">ACCESO INCOMPLETO</span><h1>Tu cuenta no tiene un perfil operativo</h1><p>Pide a un administrador que asigne tu rol antes de continuar.</p><button className="primary-btn" onClick={signOut}>Cerrar sesión</button></div></main>;
}
