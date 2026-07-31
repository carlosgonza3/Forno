import {Check, Moon, Sun} from "lucide-react";

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
  return <div className="settings-layout">
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
