import {
  Bell, CheckCircle2, ChefHat, Menu, PackagePlus, ShoppingBasket, Store,
} from "lucide-react";
import {PAGE_TITLES} from "../../app/navigation";
import {Popover, PopoverContent, PopoverTrigger} from "../../components/ui/popover";

function activityDateLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return `${date.toLocaleDateString("es-SV", {day: "numeric", month: "long"})} · ${date
    .toLocaleTimeString("es-SV", {hour: "2-digit", minute: "2-digit"})}`;
}

function countLabel(count, singular, plural) {
  const value = Number(count ?? 0);
  return `${value.toLocaleString("es-SV")} ${value === 1 ? singular : plural}`;
}

function activityPresentation(notification) {
  const actor = notification.actor_name || "Usuario";
  const name = notification.metadata?.name;
  switch (notification.event_type) {
    case "ingredients_updated":
      return {category: "INGREDIENTES", title: "Inventario actualizado",
        detail: `${countLabel(notification.item_count, "ingrediente", "ingredientes")} · ${actor}`,
        icon: PackagePlus, tone: "inventory"};
    case "processed_updated":
      return {category: "PREPARADOS", title: "Existencias actualizadas",
        detail: `${countLabel(notification.item_count, "preparado", "preparados")} · ${actor}`,
        icon: ChefHat, tone: "prepared"};
    case "ingredient_created":
      return {category: "INGREDIENTES", title: "Nuevo ingrediente",
        detail: `${name || "Ingrediente"} · ${actor}`, icon: PackagePlus, tone: "inventory"};
    case "ingredient_updated":
      return {category: "INGREDIENTES", title: "Ingrediente actualizado",
        detail: `${name || "Ingrediente"} · ${actor}`, icon: PackagePlus, tone: "inventory"};
    case "processed_item_created":
      return {category: "PREPARADOS", title: "Nuevo preparado",
        detail: `${name || "Preparado"} · ${actor}`, icon: ChefHat, tone: "prepared"};
    case "processed_item_updated":
      return {category: "PREPARADOS", title: "Preparado actualizado",
        detail: `${name || "Preparado"} · ${actor}`, icon: ChefHat, tone: "prepared"};
    case "supplier_created":
      return {category: "PROVEEDORES", title: "Nuevo proveedor",
        detail: `${name || "Proveedor"} · ${actor}`, icon: Store, tone: "supplier"};
    case "supplier_updated":
      return {category: "PROVEEDORES", title: "Proveedor actualizado",
        detail: `${name || "Proveedor"} · ${actor}`, icon: Store, tone: "supplier"};
    case "purchase_created":
      return {category: "COMPRAS", title: "Nueva compra creada",
        detail: `${countLabel(notification.item_count, "producto", "productos")} · ${actor}`,
        icon: ShoppingBasket, tone: "purchase"};
    case "purchase_status_changed":
      return {category: "COMPRAS", title: notification.metadata?.status === "received"
        ? "Orden completada" : "Estado de orden actualizado",
      detail: `${countLabel(notification.item_count, "producto", "productos")} · ${actor}`,
      icon: CheckCircle2, tone: "complete"};
    default:
      return {category: "ACTIVIDAD", title: "Actividad registrada", detail: actor,
        icon: Bell, tone: "user"};
  }
}

function ActivityNotifications({notifications, loading, unreadCount, onViewed}) {
  return <Popover onOpenChange={(open) => {
    if (open) onViewed?.();
  }}>
    <PopoverTrigger className="icon-btn notification"
      aria-label={`Notificaciones${unreadCount ? `, ${unreadCount} sin leer` : ", ninguna sin leer"}`}>
      <Bell size={19}/>
      {unreadCount > 0 && <span className="notification-count">
        {unreadCount > 99 ? "99+" : unreadCount}
      </span>}
    </PopoverTrigger>
    <PopoverContent className="notification-popover" align="end" sideOffset={10}>
      <header className="notification-popover-head">
        <div><span>ACTIVIDAD</span><h2>Notificaciones recientes</h2></div>
      </header>
      <div className="notification-feed">
        {loading && !notifications.length ? <p className="notification-empty">Cargando actividad…</p>
          : notifications.length ? notifications.map((notification) => {
            const presentation = activityPresentation(notification);
            const ActivityIcon = presentation.icon;
            return <article className="notification-movement" key={notification.id}>
              <span className={`notification-movement-icon is-${presentation.tone}`}>
                <ActivityIcon size={13}/>
              </span>
              <div className="notification-movement-copy">
                <span>{presentation.category}</span>
                <strong>{presentation.title}</strong>
                <small>{presentation.detail}</small>
              </div>
              <time title={new Date(notification.created_at).toLocaleString("es-SV")}>
                {activityDateLabel(notification.created_at)}
              </time>
            </article>;
          }) : <p className="notification-empty">Todavía no hay actividad registrada.</p>}
      </div>
    </PopoverContent>
  </Popover>;
}

export default function AppHeader({
  page, userName, onOpenMenu, activityNotifications = [], notificationsLoading = false,
  unreadNotificationCount = 0, onNotificationsViewed,
}) {
  const firstName = userName?.trim().split(/\s+/)[0] || "equipo";
  const pageTitle = page === "dashboard"
    ? `Buenos días, ${firstName}`
    : PAGE_TITLES[page] ?? PAGE_TITLES.dashboard;
  return (
    <header className="topbar">
      <button className="icon-btn mobile-menu" onClick={onOpenMenu} aria-label="Abrir menú">
        <Menu size={20}/>
      </button>
      <div className="page-title">
        <h1>{pageTitle}</h1>
        <p/>
      </div>
      <div className="top-actions">
        <ActivityNotifications notifications={activityNotifications} loading={notificationsLoading}
          unreadCount={unreadNotificationCount} onViewed={onNotificationsViewed}/>
      </div>
    </header>
  );
}
