import { Bell, Menu, Upload } from "lucide-react";
import { PAGE_TITLES } from "../../app/navigation";

export default function AppHeader({ page, onOpenMenu, onUpload, showUpload }) {
  return (
    <header className="topbar">
      <button className="icon-btn mobile-menu" onClick={onOpenMenu} aria-label="Abrir menú">
        <Menu size={20} />
      </button>
      <div className="page-title">
        <h1>{PAGE_TITLES[page] ?? PAGE_TITLES.dashboard}</h1>
        <p />
      </div>
      {showUpload ? (
        <div className="top-actions">
          <button className="icon-btn notification" aria-label="Notificaciones">
            <Bell size={19} />
            <i />
          </button>
          {/*<button className="primary-btn" onClick={onUpload}>*/}
          {/*  <Upload size={17} />*/}
          {/*  <span>Subir factura</span>*/}
          {/*</button>*/}
        </div>
      ) : null}
    </header>
  );
}
