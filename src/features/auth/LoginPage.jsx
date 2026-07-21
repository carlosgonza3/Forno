import { useState } from "react";
import { ArrowRight, KeyRound, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { getPasswordResetErrorMessage } from "./authErrors";

export default function LoginPage() {
  const { configured, session, signIn, requestPasswordReset } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  if (!configured) return <Navigate to="/setup" replace />;
  if (session) return <Navigate to="/app" replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const { error: signInError } = await signIn(email.trim(), password);
    setBusy(false);
    if (signInError) {
      setError("El correo o la contraseña no son correctos.");
      return;
    }
    navigate(location.state?.from?.pathname ?? "/app", { replace: true });
  }

  async function handleReset() {
    if (!email.trim()) {
      setError("Escribe tu correo para enviarte el enlace de recuperación.");
      return;
    }
    setBusy(true);
    const { error: resetError } = await requestPasswordReset(email.trim());
    setBusy(false);
    if (resetError) setError(getPasswordResetErrorMessage(resetError));
    else setMessage("Revisa tu correo para continuar con la recuperación.");
  }

  return <main className="auth-page">
    <section className="auth-brand-panel">
      <div className="auth-brand-copy"><span>FORNO · SAN BENITO</span><h1>Control claro.<br />Servicio con calma.</h1><p>Inventario, preparación, recetas y compras conectadas en un solo sistema.</p></div>
      <div className="auth-security"><ShieldCheck size={20} /><div><strong>Acceso protegido</strong><span>Sesiones seguras y permisos por rol</span></div></div>
    </section>
    <section className="auth-form-panel"><div className="auth-form-card"><div className="auth-mark"><KeyRound size={24} /></div><span className="state-kicker">BIENVENIDO A FORNO</span><h2>Inicia sesión</h2><p>Usa la cuenta asignada por el administrador.</p><form onSubmit={handleSubmit}><label>Correo electrónico<div className="auth-input"><Mail size={18} /><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="nombre@forno.restaurant" /></div></label><label>Contraseña<div className="auth-input"><LockKeyhole size={18} /><input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required placeholder="••••••••••••" /></div></label>{error && <div className="form-message error" role="alert">{error}</div>}{message && <div className="form-message success" role="status">{message}</div>}<button className="primary-btn auth-submit" disabled={busy}>{busy ? "Verificando…" : <>Continuar <ArrowRight size={17} /></>}</button><button type="button" className="auth-link" onClick={handleReset} disabled={busy}>¿Olvidaste tu contraseña?</button></form></div></section>
  </main>;
}
