import {useState} from "react";
import {ArrowRight, KeyRound, LockKeyhole, Mail, ShieldCheck} from "lucide-react";
import {Navigate, useLocation, useNavigate} from "react-router-dom";
import {useAuth} from "./AuthProvider";
import {getPasswordResetErrorMessage} from "./authErrors";
import NicoWineWhite from "../../assets/nico-whine-white.png";
import {InputGroup, InputGroupAddon, InputGroupInput} from "../../components/ui/input-group";

export default function LoginPage() {
    const {configured, session, signIn, requestPasswordReset} = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    if (!configured) return <Navigate to="/setup" replace/>;
    if (session) return <Navigate to="/app" replace/>;

    async function handleSubmit(event) {
        event.preventDefault();
        setBusy(true);
        setError("");
        setMessage("");
        const {error: signInError} = await signIn(email.trim(), password);
        setBusy(false);
        if (signInError) {
            setError("El correo o la contraseña no son correctos.");
            return;
        }
        navigate(location.state?.from?.pathname ?? "/app", {replace: true});
    }

    async function handleReset() {
        if (!email.trim()) {
            setError("Escribe tu correo para enviarte el enlace de recuperación.");
            return;
        }
        setBusy(true);
        const {error: resetError} = await requestPasswordReset(email.trim());
        setBusy(false);
        if (resetError) setError(getPasswordResetErrorMessage(resetError));
        else setMessage("Revisa tu correo para continuar con la recuperación.");
    }

    return <main className="auth-page">
        <section className="auth-brand-panel">
            <img className="auth-nico" src={NicoWineWhite} alt="" aria-hidden="true"/>
            <div className="auth-brand-copy">
                <span>FORNO · SAN BENITO</span>
                <h1>Control claro.<br/>Servicio con calma.</h1>
            </div>
        </section>
        <section className="auth-form-panel">
            <div className="auth-form-card">
                <span className="state-kicker">BIENVENIDO A FORNO</span>
                <h2 className={"label"}>Inicia sesión</h2>
                <form onSubmit={handleSubmit}><label>Correo electrónico
                    <InputGroup className="auth-input"><InputGroupInput type="email" autoComplete="email" value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        required placeholder="nombre@forno.restaurant"/>
                        <InputGroupAddon><Mail size={18}/></InputGroupAddon>
                    </InputGroup>
                </label><label>Contraseña
                    <InputGroup className="auth-input"><InputGroupInput type="password"
                        autoComplete="current-password" value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        required placeholder="••••••••••••"/>
                        <InputGroupAddon><LockKeyhole size={18}/></InputGroupAddon>
                    </InputGroup>
                </label>{error && <div className="form-message error" role="alert">{error}</div>}{message &&
                    <div className="form-message success" role="status">{message}</div>}
                    <button className="primary-btn auth-submit"
                            disabled={busy}>{busy ? "Verificando…" : <>Continuar <ArrowRight size={17}/></>}</button>
                    <button type="button" className="auth-link" onClick={handleReset} disabled={busy}>¿Olvidaste tu
                        contraseña?
                    </button>
                </form>
            </div>
        </section>
    </main>;
}
