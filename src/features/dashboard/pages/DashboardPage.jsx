import {useEffect, useMemo, useState} from "react";
import {
  AlertTriangle, ArrowRight, ArrowUpDown, CheckCircle2, ChevronLeft, ChevronRight,
  CalendarDays, CircleAlert, Clock3, List, Package, PackageCheck, Truck, Warehouse, X,
} from "lucide-react";
import {
  ResizableHandle, ResizablePanel, ResizablePanelGroup,
} from "../../../components/ui/resizable";
import {loadCatalog, loadInventoryAdditionTransactions} from "../../inventory/api/catalogRepository";
import {
  inventoryDashboardSummary, quantityUnitLabel, sortCatalogItems, stockStatus,
} from "../../inventory/catalogModel";
import {FornoFox} from "../../../shared/branding/FornoBrand";
import {IngredientIcon} from "../../inventory/ingredientIcons";

function InventoryMetric({label, value, detail, icon: Icon, tone, onClick, progress}) {
  return <button type="button" className={`inventory-metric is-${tone}`} onClick={onClick}>
    <span className="inventory-metric-head">
      <span className={`inventory-metric-icon ${tone}`}><Icon size={15}/></span>
      <span>{label}</span>
      <ArrowRight size={13}/>
    </span>
    <strong className="inventory-metric-value">{value}</strong>
    <span className="inventory-metric-detail">{detail}</span>
    {progress != null && <span className="inventory-metric-progress" aria-hidden="true">
      <i style={{width: `${Math.max(0, Math.min(100, progress))}%`}}/>
    </span>}
  </button>;
}

function StockBadge({item}) {
  const status = stockStatus(item).key;
  if (status === "critical") return <span className="status critical"><span/>Crítico</span>;
  if (status === "low") return <span className="status low"><span/>Bajo</span>;
  return <span className="status healthy"><span/>Óptimo</span>;
}

function InventoryTransactionDialog({transaction, onClose}) {
  const date = new Date(transaction.created_at);
  return <div className="modal-backdrop" onMouseDown={onClose}>
    <section className="modal inventory-transaction-dialog"
      onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true"
      aria-label="Detalle de transacción">
      <button className="icon-btn modal-close" onClick={onClose} aria-label="Cerrar"><X size={18}/></button>
      <span className="eyebrow">ACTIVIDAD DE INVENTARIO</span>
      <h2>Actualización de inventario</h2>
      <p>{transaction.actor_name} · {date.toLocaleString("es-SV", {
        dateStyle: "medium", timeStyle: "short",
      })}</p>
      <div className="table-wrap transaction-detail-table"><table><thead><tr>
        <th>Ingrediente</th><th>Anterior</th><th>Cambio</th><th>Nuevo nivel</th><th>Nota</th>
      </tr></thead><tbody>{transaction.items.map((movement) => <tr key={movement.id}>
        <td><strong>{movement.item?.name ?? "Ingrediente"}</strong>
          <small>{movement.item?.sku || "Sin SKU"}</small></td>
        <td>{movement.quantity_before == null ? "—" : <>
          {Number(movement.quantity_before).toLocaleString("es-SV")}{" "}
          {quantityUnitLabel(movement.item?.base_unit, movement.quantity_before)}
        </>}</td>
        <td><span className={Number(movement.quantity_delta) > 0 ? "addition-pill" : "subtraction-pill"}>
          {Number(movement.quantity_delta) > 0 ? "+" : ""}
          {Number(movement.quantity_delta).toLocaleString("es-SV")}{" "}
          {quantityUnitLabel(movement.item?.base_unit, Math.abs(Number(movement.quantity_delta)))}
        </span></td>
        <td>{movement.quantity_after == null ? "—" : <strong>
          {Number(movement.quantity_after).toLocaleString("es-SV")}{" "}
          {quantityUnitLabel(movement.item?.base_unit, movement.quantity_after)}
        </strong>}</td>
        <td className="transaction-note">{movement.note || "Sin nota"}</td>
      </tr>)}</tbody></table></div>
      <div className="dialog-actions"><button className="primary-btn" onClick={onClose}>Cerrar detalle</button></div>
    </section>
  </div>;
}

function localDateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function lastMovementTimeLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin actividad";
  const dateLabel = date.toLocaleDateString("es-SV", {
    day: "numeric", month: "long", year: "numeric",
  });
  return `${dateLabel} · ${date.toLocaleTimeString("es-SV", {
    hour: "2-digit", minute: "2-digit",
  })}`;
}

function orderTransactionsAscending(transactions) {
  return [...transactions].sort((left, right) =>
    new Date(left.created_at).getTime() - new Date(right.created_at).getTime());
}

function orderTransactionsDescending(transactions) {
  return [...transactions].sort((left, right) =>
    new Date(right.created_at).getTime() - new Date(left.created_at).getTime());
}

function InventoryTransactionRow({transaction, onSelect, showDate = true}) {
  const date = new Date(transaction.created_at);
  return <button className="inventory-transaction-row" onClick={(event) => {
    event.stopPropagation();
    onSelect(transaction);
  }}>
    <i className="clay-dot"><ArrowUpDown size={13}/></i>
    <span className="transaction-copy"><strong>Actualización de inventario</strong>
      <small>{transaction.item_count} {transaction.item_count === 1
        ? "ingrediente" : "ingredientes"} · {transaction.actor_name}</small></span>
    <time title={date.toLocaleString("es-SV")}>
      {showDate && <>{date.toLocaleDateString("es-SV", {day: "2-digit", month: "short"})} · </>}
      {date.toLocaleTimeString("es-SV", {hour: "2-digit", minute: "2-digit"})}
    </time><ChevronRight size={16}/>
  </button>;
}

function InventoryActivityCalendar({month, transactions, selectedDay, onMonthChange, onDaySelect, onSelect}) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const dayCount = new Date(year, monthIndex + 1, 0).getDate();
  const leadingDays = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const activityByDay = transactions.reduce((days, transaction) => {
    const key = localDateKey(transaction.created_at);
    const entries = days.get(key) ?? [];
    entries.push(transaction);
    days.set(key, entries);
    return days;
  }, new Map());
  const cells = [...Array(leadingDays).fill(null), ...Array.from({length: dayCount}, (_, index) => index + 1)];
  while (cells.length % 7) cells.push(null);
  const selectedTransactions = selectedDay ? (activityByDay.get(selectedDay) ?? []) : [];
  const selectedDate = selectedDay ? new Date(`${selectedDay}T12:00:00`) : null;

  return <div className="inventory-activity-calendar" onClick={(event) => event.stopPropagation()}>
    <div className="activity-calendar-head">
      <button type="button" onClick={() => onMonthChange(new Date(year, monthIndex - 1, 1))}
        aria-label="Mes anterior"><ChevronLeft size={16}/></button>
      <strong>{month.toLocaleDateString("es-SV", {month: "long", year: "numeric"})}</strong>
      <button type="button" onClick={() => onMonthChange(new Date(year, monthIndex + 1, 1))}
        aria-label="Mes siguiente"><ChevronRight size={16}/></button>
    </div>
    <div className="activity-calendar-weekdays" aria-hidden="true">
      {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((day) => <span key={day}>{day}</span>)}
    </div>
    <div className="activity-calendar-grid" role="grid" aria-label="Calendario de actividad">
      {cells.map((day, index) => {
        if (!day) return <span className="activity-calendar-blank" key={`blank-${index}`}/>;
        const date = new Date(year, monthIndex, day);
        const key = localDateKey(date);
        const activityCount = activityByDay.get(key)?.length ?? 0;
        return <button type="button" key={key} className={selectedDay === key ? "selected" : ""}
          aria-label={`${date.toLocaleDateString("es-SV", {day: "numeric", month: "long"})}${activityCount
            ? `, ${activityCount} ${activityCount === 1 ? "actividad" : "actividades"}` : ", sin actividad"}`}
          aria-pressed={selectedDay === key} onClick={() => onDaySelect(key)}>
          <span>{day}</span>
          {activityCount > 0 && (
            <i title={`${activityCount} actividades`}/>
          )}
        </button>;
      })}
    </div>
    <div className="activity-calendar-selection">
      <div><strong>{selectedDate ? selectedDate.toLocaleDateString("es-SV", {
        weekday: "long", day: "numeric", month: "long",
      }) : "Selecciona un día"}</strong>
        <span>{selectedDay ? `${selectedTransactions.length} ${selectedTransactions.length === 1
          ? "actividad" : "actividades"}` : "Verás aquí toda la actividad de esa fecha."}</span></div>
      {selectedDay && <div className="inventory-transaction-list calendar-day-list">
        {selectedTransactions.length ? selectedTransactions.map((transaction) =>
          <InventoryTransactionRow key={transaction.id} transaction={transaction} onSelect={onSelect} showDate={false}/>)
          : <div className="activity-empty"><Package size={22}/><span>No hubo actividad este día.</span></div>}
      </div>}
    </div>
  </div>;
}

function RecentInventoryActivity() {
  const [transactions, setTransactions] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [view, setView] = useState("list");
  const [month, setMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState(() => localDateKey(new Date()));
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const pageSize = 5;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const calendarTransactions = useMemo(() => orderTransactionsAscending(transactions), [transactions]);
  const listTransactions = useMemo(() => orderTransactionsDescending(transactions), [transactions]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const request = view === "calendar" ? {
      page: 0,
      pageSize: 1000,
      dateFrom: new Date(month.getFullYear(), month.getMonth(), 1).toISOString(),
      dateTo: new Date(month.getFullYear(), month.getMonth() + 1, 1).toISOString(),
      ascending: true,
    } : {page, pageSize};
    loadInventoryAdditionTransactions(request)
      .then((result) => {
        if (!active) return;
        setTransactions(result.transactions);
        setTotal(result.total);
      })
      .catch(() => {
        if (!active) return;
        setTransactions([]);
        setTotal(0);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [month, page, pageSize, view]);

  function changeView(nextView) {
    setView(nextView);
    setPage(0);
  }

  function changeMonth(nextMonth) {
    setMonth(nextMonth);
    const today = new Date();
    setSelectedDay(nextMonth.getFullYear() === today.getFullYear()
      && nextMonth.getMonth() === today.getMonth() ? localDateKey(today) : null);
  }

  return <>
    <div className="panel activity-panel inventory-activity-card">
      <div className="panel-head">
        <div><h2>Actividad de inventario</h2><p>{total} {total === 1
          ? "transacción registrada" : view === "calendar"
            ? "transacciones en el mes" : "transacciones registradas"}</p></div>
        <div className="activity-panel-actions" onClick={(event) => event.stopPropagation()}>
          <div className="activity-view-switch" role="group" aria-label="Vista de actividad">
            <button type="button" className={view === "list" ? "active" : ""}
              aria-pressed={view === "list"} onClick={() => changeView("list")}>
              <List size={14}/>Lista</button>
            <button type="button" className={view === "calendar" ? "active" : ""}
              aria-pressed={view === "calendar"} onClick={() => changeView("calendar")}>
              <CalendarDays size={14}/>Calendario</button>
          </div>
        </div>
      </div>
      {view === "calendar" ? (loading ? <div className="activity-loading"><div className="state-spinner"/>
        <span>Cargando calendario…</span></div> : <InventoryActivityCalendar month={month}
          transactions={calendarTransactions} selectedDay={selectedDay} onMonthChange={changeMonth}
          onDaySelect={setSelectedDay} onSelect={setSelected}/>) : <div className="inventory-transaction-list">
        {loading ? <div className="activity-loading"><div className="state-spinner"/>
          <span>Cargando actividad…</span></div>
          : listTransactions.length ? listTransactions.map((transaction) =>
            <InventoryTransactionRow key={transaction.id} transaction={transaction} onSelect={setSelected}/>)
            : <div className="activity-empty"><Package size={22}/>
            <span>Aún no se han registrado actualizaciones.</span></div>}
      </div>}
      {view === "list" && total > pageSize && <div className="activity-pagination"
        onClick={(event) => event.stopPropagation()}>
        <button disabled={page === 0 || loading} onClick={() => setPage((current) => current - 1)}
          aria-label="Página anterior"><ChevronLeft size={15}/></button>
        <span>Página <strong>{page + 1}</strong> de {pageCount} · {pageSize} por página</span>
        <button disabled={page + 1 >= pageCount || loading}
          onClick={() => setPage((current) => current + 1)}
          aria-label="Página siguiente"><ChevronRight size={15}/></button>
      </div>}
    </div>
    {selected && <InventoryTransactionDialog transaction={selected} onClose={() => setSelected(null)}/>}
  </>;
}

function AttentionPanel({catalogLoading, catalogError, attentionItems, onNavigate}) {
  return <div className="panel attention-panel">
    <div className="panel-head">
      <div><span className="panel-kicker">PRIORIDAD</span><h2>Necesita atención</h2>
        <p>Ordenado por urgencia de reposición</p></div>
      <button className="text-btn" onClick={() => onNavigate("inventory")}>
        Ver todos <ChevronRight size={15}/></button>
    </div>
    <div className="attention-list">
      {catalogLoading ? <div className="dashboard-attention-state">
        <div className="state-spinner"/>Cargando inventario…</div>
        : catalogError ? <div className="dashboard-attention-state">
          <AlertTriangle size={18}/>No se pudo cargar el inventario.</div>
          : attentionItems.length ? attentionItems.slice(0, 4).map((item) =>
            <div className="attention-row" key={item.id}>
              <div className="food-icon"><IngredientIcon iconKey={item.icon_key}
                iconEmoji={item.icon_emoji} size={17}/></div>
              <div className="attention-info"><strong>{item.name}</strong>
                <span><b>{Number(item.quantity).toLocaleString("es-SV")} {" "}
                  {quantityUnitLabel(item.base_unit, item.quantity)}</b> disponibles · ideal{" "}
                  {Number(item.par_level).toLocaleString("es-SV")}</span>
                <div className="stock-line"><i style={{width: `${Math.min(100,
                  Number(item.par_level) > 0
                    ? Number(item.quantity) / Number(item.par_level) * 100 : 0)}%`}}/></div>
              </div><div className="attention-row-end"><StockBadge item={item}/>
                <small>Reorden: {Number(item.reorder_point).toLocaleString("es-SV")}</small></div>
            </div>)
            : <div className="dashboard-attention-state healthy"><CheckCircle2 size={18}/>
              Todo el inventario está en buen nivel.</div>}
    </div>
  </div>;
}

function useCompactDashboard() {
  const query = "(max-width: 1100px)";
  const [compact, setCompact] = useState(() => typeof window !== "undefined"
    && typeof window.matchMedia === "function" && window.matchMedia(query).matches);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return undefined;
    const media = window.matchMedia(query);
    const update = (event) => setCompact(event.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return compact;
}

export default function DashboardPage({onNavigate, lastInventoryMovement = null}) {
  const [catalog, setCatalog] = useState({items: [], suppliers: []});
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState(false);

  useEffect(() => {
    let active = true;
    setCatalogLoading(true);
    setCatalogError(false);
    loadCatalog()
      .then((result) => {
        if (active) setCatalog(result);
      })
      .catch(() => {
        if (active) setCatalogError(true);
      })
      .finally(() => {
        if (active) setCatalogLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const summary = useMemo(
    () => inventoryDashboardSummary(catalog.items, catalog.suppliers),
    [catalog.items, catalog.suppliers],
  );
  const attentionItems = useMemo(() => sortCatalogItems(
    summary.activeItems.filter((item) => ["critical", "low"].includes(stockStatus(item).key)),
    "attention",
  ), [summary.activeItems]);
  const metricValue = (value, suffix = "") => catalogLoading || catalogError ? "—" : `${value}${suffix}`;
  const metricDetail = (value) => catalogLoading ? "Cargando inventario…"
    : catalogError ? "No se pudo actualizar" : value;
  const healthyCoverage = summary.activeProducts
    ? Math.round(summary.healthyProducts / summary.activeProducts * 100)
    : 0;
  const compactDashboard = useCompactDashboard();
  const attentionPanel = <AttentionPanel catalogLoading={catalogLoading} catalogError={catalogError}
    attentionItems={attentionItems} onNavigate={onNavigate}/>;

  return <>
    <section className="service-banner">
      <div className="banner-mark"><FornoFox size={64}/></div>
      <div>FORNO <br/><span> SAN BENITO </span></div>
      <div className="banner-inventory-update">
        <Clock3 size={16}/>
        <span>Última actualización</span>
        <strong title={lastInventoryMovement
          ? new Date(lastInventoryMovement.created_at).toLocaleString("es-SV") : undefined}>
          {lastInventoryMovement ? lastMovementTimeLabel(lastInventoryMovement.created_at) : "Sin actividad"}
        </strong>
      </div>
    </section>
    <section className="dashboard-overview-head">
      <div>
          {/*<span className="eyebrow">RESUMEN OPERATIVO</span>*/}
          <h2>Resumen</h2>
        </div>
      <button className="text-btn" onClick={() => onNavigate("inventory")}>
        Abrir inventario <ArrowRight size={15}/></button>
    </section>
    <section className="dashboard-stock-summary">
      <InventoryMetric label="Por reponer" value={metricValue(summary.restockProducts)}
        detail={metricDetail(`${summary.lowProducts} bajos · ${summary.criticalProducts} críticos`)}
        icon={Truck} tone="gold" onClick={() => onNavigate("shopping")}/>
      <InventoryMetric label="Críticos" value={metricValue(summary.criticalProducts)}
        detail={metricDetail(summary.criticalProducts
          ? "Llegaron al punto de reorden" : "Sin urgencias en este momento")}
        icon={CircleAlert} tone="clay"
        onClick={() => onNavigate("inventory", {stockFilter: "critical"})}/>
      <InventoryMetric label="Sin existencia" value={metricValue(summary.productsWithoutExistence)}
        detail={metricDetail(`de ${summary.activeProducts} ingredientes activos`)}
        icon={Warehouse} tone="blue"
        onClick={() => onNavigate("inventory", {stockFilter: "out"})}/>
      <InventoryMetric label="Cobertura saludable" value={metricValue(healthyCoverage, "%")}
        detail={metricDetail(`${summary.healthyProducts} ingredientes en nivel óptimo`)}
        icon={PackageCheck} tone="green" progress={healthyCoverage}
        onClick={() => onNavigate("inventory")}/>
    </section>
    {compactDashboard ? <section className="dashboard-grid dashboard-grid-stacked">
      {attentionPanel}<RecentInventoryActivity/>
    </section> : <section className="dashboard-split-shell">
      <ResizablePanelGroup className="dashboard-resizable" orientation="horizontal">
        <ResizablePanel className="dashboard-resizable-panel" id="attention" defaultSize="38%" minSize="38%">
          {attentionPanel}
        </ResizablePanel>
        <ResizableHandle aria-label="Redimensionar paneles del dashboard"/>
        <ResizablePanel className="dashboard-resizable-panel" id="activity" defaultSize="62%" minSize="30%">
          <RecentInventoryActivity/>
        </ResizablePanel>
      </ResizablePanelGroup>
    </section>}
  </>;
}
