import {
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  UserRound,
  X,
} from "lucide-react";
import FornoBrand from "../branding/FornoBrand";

export default function AppSidebar({
  page,
  onNavigate,
  open,
  onClose,
  collapsed,
  onToggleCollapsed,
  identity,
  onSignOut,
  signingOut,
  navigationItems,
  showTeam,
}) {
  return (
    <aside className={`sidebar ${open ? "open" : ""} ${collapsed ? "collapsed" : ""}`}>
      <div className="side-head">
        <FornoBrand />
        <button className="icon-btn close-side" onClick={onClose} aria-label="Cerrar menú">
          <X size={18} />
        </button>
      </div>

      <button
        className="sidebar-collapse"
        onClick={onToggleCollapsed}
        aria-label={collapsed ? "Expandir menú lateral" : "Contraer menú lateral"}
        title={collapsed ? "Expandir menú" : "Contraer menú"}
      >
        {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
      </button>

      <nav>
        <p className="nav-label">OPERACIONES</p>
        {navigationItems.map(({ id, label, icon: Icon, count, nested }) => (
          <button
            key={id}
            title={collapsed ? label : undefined}
            className={`nav-item ${nested ? "nested" : ""} ${page === id ? "active" : ""}`}
            onClick={() => onNavigate(id)}
          >
            <Icon size={nested ? 16 : 19} />
            <span>{label}</span>
            {count ? <b>{count}</b> : null}
          </button>
        ))}

        <div className="admin-nav">
          <p className="nav-label bottom">ADMINISTRACIÓN</p>
          {showTeam ? (
            <button className="nav-item" title={collapsed ? "Equipo" : undefined}>
              <UserRound size={19} />
              <span>Equipo</span>
            </button>
          ) : null}
          <button
            className={`nav-item ${page === "settings" ? "active" : ""}`}
            title={collapsed ? "Configuración" : undefined}
            onClick={() => onNavigate("settings")}
          >
            <Settings size={19} />
            <span>Configuración</span>
          </button>
        </div>
      </nav>

      <div className="user-card">
        <div className="user-avatar">{identity.initials}</div>
        <div>
          <strong>{identity.name}</strong>
          <span>{identity.role}</span>
        </div>
        {identity.authenticated ? (
          <button
            className="signout-button"
            onClick={onSignOut}
            disabled={signingOut}
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
          >
            <LogOut size={17} />
          </button>
        ) : null}
      </div>
    </aside>
  );
}
