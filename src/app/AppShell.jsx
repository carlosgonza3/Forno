import {useCallback, useEffect, useMemo, useState} from "react";
import {useAuth} from "../features/auth/AuthProvider";
import DashboardPage from "../features/dashboard/pages/DashboardPage";
import CatalogPage from "../features/inventory/pages/CatalogPage";
import ShoppingPage from "../features/purchasing/pages/ShoppingPage";
import UploadInvoiceDialog from "../features/prototypes/components/UploadInvoiceDialog";
import PreparationPage from "../features/prototypes/pages/PreparationPage";
import ReceiptsPage from "../features/prototypes/pages/ReceiptsPage";
import RecipesPage from "../features/prototypes/pages/RecipesPage";
import SettingsPage from "../features/settings/pages/SettingsPage";
import {
  loadLastInventoryUpdate, loadRecentActivityNotifications, loadUnreadActivityNotificationCount,
  markActivityNotificationsViewed,
} from "../features/inventory/api/catalogRepository";
import {ACTIVITY_NOTIFICATION_EVENT} from "../features/inventory/inventoryEvents";
import AppHeader from "../shared/layout/AppHeader";
import AppSidebar from "../shared/layout/AppSidebar";
import {releaseScope, RELEASE_SCOPES} from "../config/release";
import {applyTheme, readTheme} from "./theme";
import {initialPageForRelease, navigationForRelease} from "./navigation";

function userIdentity(profile, user) {
  const name = profile?.display_name || user?.email?.split("@")[0] || "Vista previa";
  return {
    authenticated: Boolean(user),
    name,
    role: profile?.role === "admin"
      ? "Administrador"
      : profile?.role === "local" ? "Usuario local" : "Prototipo",
    initials: name.split(/\s+/).filter(Boolean).slice(0, 2)
      .map((part) => part[0]?.toUpperCase()).join("") || "F",
  };
}

function PageContent({
  page, pageState, onNavigate, theme, onThemeChange, onUpload, lastInventoryUpdate,
}) {
  switch (page) {
    case "dashboard":
      return <DashboardPage onNavigate={onNavigate}
        lastInventoryMovement={lastInventoryUpdate}/>;
    case "inventory":
      return <CatalogPage initialStockFilter={pageState.stockFilter}/>;
    case "shopping":
      return <ShoppingPage/>;
    case "prep":
      return <PreparationPage/>;
    case "recipes":
      return <RecipesPage/>;
    case "receipts":
      return <ReceiptsPage onUpload={onUpload}/>;
    case "settings":
      return <SettingsPage theme={theme} onThemeChange={onThemeChange}/>;
    default:
      return <DashboardPage onNavigate={onNavigate}/>;
  }
}

export default function AppShell() {
  const {profile, user, signOut} = useAuth();
  const isFullRelease = releaseScope === RELEASE_SCOPES.FULL;
  const navigationItems = useMemo(() => navigationForRelease(releaseScope), []);
  const identity = useMemo(() => userIdentity(profile, user), [profile, user]);
  const [page, setPage] = useState(() => initialPageForRelease(releaseScope));
  const [pageState, setPageState] = useState({});
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState(readTheme);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [activityNotifications, setActivityNotifications] = useState([]);
  const [lastInventoryUpdate, setLastInventoryUpdate] = useState(null);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(true);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const refreshActivityNotifications = useCallback(async () => {
    setNotificationsLoading(true);
    try {
      const [notifications, latestInventoryUpdate, unreadCount] = await Promise.all([
        loadRecentActivityNotifications({limit: 20}),
        loadLastInventoryUpdate(),
        loadUnreadActivityNotificationCount(),
      ]);
      setActivityNotifications(notifications);
      setLastInventoryUpdate(latestInventoryUpdate);
      setUnreadNotificationCount(unreadCount);
    } catch (error) {
      console.error("No se pudo cargar la actividad reciente.", error);
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshActivityNotifications();
    window.addEventListener(ACTIVITY_NOTIFICATION_EVENT, refreshActivityNotifications);
    const refreshTimer = window.setInterval(refreshActivityNotifications, 30_000);
    return () => {
      window.removeEventListener(ACTIVITY_NOTIFICATION_EVENT, refreshActivityNotifications);
      window.clearInterval(refreshTimer);
    };
  }, [refreshActivityNotifications, user?.id]);

  const markNotificationsViewed = useCallback(async () => {
    const latestNotificationId = activityNotifications[0]?.id;
    if (!latestNotificationId || unreadNotificationCount === 0) return;
    const previousUnreadCount = unreadNotificationCount;
    setUnreadNotificationCount(0);
    try {
      await markActivityNotificationsViewed(latestNotificationId);
    } catch (error) {
      setUnreadNotificationCount(previousUnreadCount);
      console.error("No se pudieron marcar las notificaciones como vistas.", error);
    }
  }, [activityNotifications, unreadNotificationCount]);

  function navigate(pageId, nextPageState = {}) {
    setPageState(nextPageState);
    setPage(pageId);
    setMobileOpen(false);
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  }

  return <div className="app-shell">
    <AppSidebar page={page} onNavigate={navigate} open={mobileOpen}
      onClose={() => setMobileOpen(false)} collapsed={sidebarCollapsed}
      onToggleCollapsed={() => setSidebarCollapsed((current) => !current)}
      identity={identity} onSignOut={handleSignOut} signingOut={signingOut}
      navigationItems={navigationItems} showTeam={isFullRelease}/>
    {mobileOpen && <div className="side-overlay" onClick={() => setMobileOpen(false)}/>}
    <main className={`main ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <AppHeader page={page} onOpenMenu={() => setMobileOpen(true)}
        userName={identity.name} activityNotifications={activityNotifications}
        notificationsLoading={notificationsLoading} unreadNotificationCount={unreadNotificationCount}
        onNotificationsViewed={markNotificationsViewed}/>
      <div className="content">
        <PageContent page={page} pageState={pageState} onNavigate={navigate} theme={theme}
          onThemeChange={setTheme} onUpload={() => setUploadOpen(true)}
          lastInventoryUpdate={lastInventoryUpdate}/>
      </div>
    </main>
    {isFullRelease && uploadOpen
      ? <UploadInvoiceDialog onClose={() => setUploadOpen(false)}/>
      : null}
  </div>;
}
