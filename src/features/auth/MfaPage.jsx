import { ShieldAlert } from "lucide-react";
import { useAuth } from "./AuthProvider";

export default function MfaPage() {
  const { signOut } = useAuth();
  return <main className="system-state"><div className="system-state-card"><ShieldAlert size={40} className="state-warning" /><span className="state-kicker">SEGUNDO FACTOR REQUERIDO</span><h1>Protege la cuenta de administrador</h1><p>La base ya detecta que esta sesión necesita nivel AAL2. El flujo de inscripción y desafío TOTP será la siguiente entrega de autenticación.</p><button className="primary-btn" onClick={signOut}>Cerrar sesión</button></div></main>;
}
