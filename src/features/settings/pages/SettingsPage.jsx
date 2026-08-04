import {useEffect, useState} from "react";
import {Check, Moon, Save, Sun, UserRound} from "lucide-react";
import {useAuth} from "../../auth/AuthProvider";

const THEME_CHOICES = [
  {
    id: "light",
    label: "Modo claro",
    description: "Una interfaz luminosa para espacios bien iluminados.",
    icon: Sun,
  },
  {
    id: "dark",
    label: "Modo oscuro",
    description: "Menos brillo y mayor comodidad durante el servicio nocturno.",
    icon: Moon,
  },
];

export default function SettingsPage({theme, onThemeChange}) {
  const {profile, updateDisplayName} = useAuth();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState("");
  const [nameSaved, setNameSaved] = useState(false);

  useEffect(() => {
    setDisplayName(profile?.display_name ?? "");
  }, [profile?.display_name]);

  async function saveName(event) {
    event.preventDefault();
    const normalized = displayName.trim().replace(/\s+/g, " ");
    if (!normalized) {
      setNameError("Ingresa el nombre que quieres mostrar.");
      return;
    }
    setSavingName(true);
    setNameError("");
    setNameSaved(false);
    try {
      const result = await updateDisplayName(normalized);
      if (result.error) {
        setNameError(result.error.code === "22023"
          ? "El nombre debe tener entre 1 y 80 caracteres."
          : "No pudimos guardar el nombre. Intenta nuevamente.");
        return;
      }
      setNameSaved(true);
    } catch {
      setNameError("No pudimos guardar el nombre. Intenta nuevamente.");
    } finally {
      setSavingName(false);
    }
  }

  return <div className="settings-layout">
    <section className="panel settings-card profile-settings-card">
      <div className="settings-heading"><span className="eyebrow">PERFIL</span>
        <h2>Tu nombre en Forno</h2>
        <p>Este nombre aparece en el saludo, en tu perfil y junto a la actividad que registras.</p>
      </div>
      <form className="profile-name-form" onSubmit={saveName}>
        <label htmlFor="profile-display-name">Nombre visible</label>
        <div className="profile-name-control">
          <span><UserRound size={18}/></span>
          <input id="profile-display-name" required maxLength="80" autoComplete="name"
            value={displayName} onChange={(event) => {
              setDisplayName(event.target.value);
              setNameError("");
              setNameSaved(false);
            }} placeholder="Ej. Carlos"/>
          <button className="primary-btn" disabled={savingName
            || displayName.trim().replace(/\s+/g, " ") === (profile?.display_name ?? "")}>
            {savingName ? "Guardando…" : <><Save size={15}/>Guardar nombre</>}
          </button>
        </div>
        {nameError && <p className="profile-name-message error">{nameError}</p>}
        {nameSaved && <p className="profile-name-message success"><Check size={14}/>Nombre actualizado</p>}
      </form>
    </section>
    <section className="panel settings-card">
      <div className="settings-heading"><span className="eyebrow">APARIENCIA</span>
        <h2>Elige cómo ver Forno</h2>
        <p>Tu preferencia se guarda en este dispositivo y se aplica también al inicio de sesión.</p>
      </div>
      <div className="theme-options" role="radiogroup" aria-label="Tema de color">
        {THEME_CHOICES.map(({id, label, description, icon: Icon}) =>
          <button key={id} role="radio" aria-checked={theme === id}
            className={`theme-option ${theme === id ? "selected" : ""}`}
            onClick={() => onThemeChange(id)}>
            <span className="theme-option-icon"><Icon size={22}/></span>
            <span><strong>{label}</strong><small>{description}</small></span>
            <i className="theme-check">{theme === id && <Check size={15}/>}</i>
          </button>)}
      </div>
    </section>
  </div>;
}
