import { useEffect, useState } from "react";
import { KeyRound, LogOut, ShieldCheck } from "lucide-react";
import { Navigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "./AuthProvider";

export default function MfaPage() {
  const { user, profile, assuranceLevel, refreshIdentity, signOut } = useAuth();
  const [factor, setFactor] = useState(null);
  const [enrollment, setEnrollment] = useState(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function prepareFactor() {
      if (!supabase || !user || !profile || assuranceLevel === "aal2") {
        setLoading(false);
        return;
      }
      const listed = await supabase.auth.mfa.listFactors();
      if (!active) return;
      if (listed.error) {
        setError("No pudimos consultar el segundo factor.");
        setLoading(false);
        return;
      }
      const verified = listed.data.totp[0];
      if (verified) {
        setFactor(verified);
        setLoading(false);
        return;
      }

      const stale = listed.data.all.filter((item) => item.factor_type === "totp" && item.status === "unverified");
      await Promise.all(stale.map((item) => supabase.auth.mfa.unenroll({ factorId: item.id })));
      const enrolled = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: profile.role === "admin" ? "Forno Admin" : "Forno",
      });
      if (!active) return;
      if (enrolled.error) {
        setError("No pudimos preparar el autenticador. Cierra sesión e intenta nuevamente.");
      } else {
        setFactor(enrolled.data);
        setEnrollment(enrolled.data.totp);
      }
      setLoading(false);
    }
    prepareFactor();
    return () => { active = false; };
  }, [assuranceLevel, profile, user]);

  if (!user) return <Navigate to="/login" replace />;
  if (!profile || assuranceLevel === "aal2") return <Navigate to="/app" replace />;

  async function verify(event) {
    event.preventDefault();
    if (!factor || code.length !== 6) return;
    setVerifying(true);
    setError("");
    const result = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
    if (result.error) {
      setError("El código no es válido o ya venció. Usa el código actual de tu aplicación.");
      setVerifying(false);
      return;
    }
    await refreshIdentity();
  }

  return <main className="mfa-page">
    <section className="mfa-card">
      <div className="mfa-icon"><ShieldCheck size={28} /></div>
      <span className="state-kicker">SEGUNDO FACTOR REQUERIDO</span>
      <h1>{enrollment ? "Protege tu cuenta" : "Confirma que eres tú"}</h1>
      <p>{enrollment ? "Escanea este código con 1Password, Google Authenticator, Microsoft Authenticator o tu gestor TOTP preferido." : "Ingresa el código de seis dígitos de tu aplicación autenticadora."}</p>

      {loading ? <div className="mfa-loading"><div className="state-spinner" />Preparando acceso seguro…</div> : <>
        {enrollment && <div className="mfa-enrollment">
          <img src={enrollment.qr_code} alt="Código QR para configurar el segundo factor" />
          <div><span>Clave manual</span><code>{enrollment.secret}</code></div>
        </div>}
        <form onSubmit={verify}>
          <label htmlFor="mfa-code">Código de seguridad</label>
          <div className="mfa-code-input"><KeyRound size={19} /><input id="mfa-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength="6" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" autoFocus /></div>
          {error && <div className="form-message error">{error}</div>}
          <button className="primary-btn mfa-submit" disabled={!factor || code.length !== 6 || verifying}>{verifying ? "Verificando…" : enrollment ? "Activar y continuar" : "Verificar y continuar"}</button>
        </form>
      </>}
      <button className="mfa-signout" onClick={signOut}><LogOut size={16} /> Cerrar sesión</button>
    </section>
  </main>;
}
