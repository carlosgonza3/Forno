import { CheckCircle2, Copy, Database, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { environmentIssues, isSupabaseConfigured } from "../../config/env";

export default function SetupPage() {
  if (isSupabaseConfigured) return <main className="system-state"><div className="system-state-card"><CheckCircle2 className="state-success" size={38} /><h1>Supabase está configurado</h1><p>La conexión está lista. Ya puedes autenticarte.</p><Link className="primary-btn state-link" to="/login">Ir al inicio de sesión</Link></div></main>;

  return <main className="setup-page"><section className="setup-card"><div className="setup-icon"><Database size={26} /></div><span className="state-kicker">CONFIGURACIÓN REQUERIDA</span><h1>Conecta el proyecto de Supabase</h1><p>La interfaz real no utiliza datos simulados. Añade las credenciales públicas del entorno de desarrollo para comenzar.</p><ol><li>Copia <code>.env.example</code> como <code>.env.local</code>.</li><li>Abre el panel de Supabase y copia la URL del proyecto y su publishable key.</li><li>Reinicia el servidor de desarrollo.</li></ol><pre><code>VITE_SUPABASE_URL=https://…supabase.co{"\n"}VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_…</code><Copy size={16} /></pre>{environmentIssues.length > 0 && <div className="setup-issues"><strong>Valores pendientes</strong>{environmentIssues.map((issue) => <span key={issue.field}>{issue.field || "environment"}: {issue.message}</span>)}</div>}<a className="secondary-btn setup-docs" href="https://supabase.com/docs/guides/auth/quickstarts/react" target="_blank" rel="noreferrer">Abrir documentación oficial <ExternalLink size={15} /></a></section></main>;
}
