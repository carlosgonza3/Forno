import { useState } from "react";
import { CheckCircle2, KeyRound } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "./AuthProvider";

export default function ResetPasswordPage() {
  const { loading, session } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    if (!supabase || !session) {
      setError("La sesión de recuperación expiró. Solicita un enlace nuevo.");
      return;
    }
    if (password.length < 12) {
      setError("La contraseña debe tener al menos 12 caracteres.");
      return;
    }
    if (password !== confirmation) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updateError?.code === "same_password") setError("La nueva contraseña debe ser diferente de la contraseña anterior.");
    else if (updateError?.code === "weak_password") setError("La contraseña no cumple los requisitos de seguridad.");
    else if (updateError) setError("La sesión de recuperación expiró. Solicita un enlace nuevo.");
    else setComplete(true);
  }

  if (loading) return <main className="system-state"><div className="system-state-card"><div className="state-spinner" /><h1>Verificando enlace</h1><p>Estamos validando tu sesión de recuperación…</p></div></main>;

  if (!session) return <main className="system-state"><div className="system-state-card"><span className="state-kicker">ENLACE NO VÁLIDO</span><h1>Solicita un enlace nuevo</h1><p>Este enlace expiró, ya fue utilizado o no contiene una sesión de recuperación válida.</p><Link className="primary-btn state-link" to="/login">Volver al inicio de sesión</Link></div></main>;

  if (complete) return <main className="system-state"><div className="system-state-card"><CheckCircle2 className="state-success" size={40} /><h1>Contraseña actualizada</h1><p>Ya puedes iniciar sesión con tu nueva contraseña.</p><Link className="primary-btn state-link" to="/login">Continuar</Link></div></main>;

  return <main className="system-state"><div className="auth-form-card reset-card"><div className="auth-mark"><KeyRound size={24} /></div><span className="state-kicker">RECUPERAR ACCESO</span><h2>Nueva contraseña</h2><p>Usa al menos 12 caracteres y evita contraseñas utilizadas en otros servicios.</p><form onSubmit={handleSubmit}><label>Nueva contraseña<div className="auth-input"><input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></div></label><label>Confirmar contraseña<div className="auth-input"><input type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required /></div></label>{error && <div className="form-message error" role="alert">{error}</div>}<button className="primary-btn auth-submit" disabled={busy}>{busy ? "Guardando…" : "Guardar contraseña"}</button></form></div></main>;
}
