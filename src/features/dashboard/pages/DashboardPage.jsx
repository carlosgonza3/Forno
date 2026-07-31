import {useEffect, useMemo, useState} from "react";
import {
  AlertTriangle, ArrowRight, ArrowUpDown, CheckCircle2, ChevronLeft, ChevronRight,
  CircleAlert, Minimize2, Package, PackageCheck, Truck, Warehouse, X,
} from "lucide-react";
import {loadCatalog, loadInventoryAdditionTransactions} from "../../inventory/api/catalogRepository";
import {
  inventoryDashboardSummary, quantityUnitLabel, sortCatalogItems, stockStatus,
} from "../../inventory/catalogModel";
import {FornoFox} from "../../../shared/branding/FornoBrand";
import {IngredientIcon} from "../../inventory/ingredientIcons";

function StatCard({label, value, detail, icon: Icon, tone, onClick, progress}) {
  return <button type="button" className={`stat-card is-${tone}`} onClick={onClick}>
    <span className="stat-card-top">
      <span className={`stat-icon ${tone}`}><Icon size={18}/></span>
      <span className="stat-card-label">{label}</span>
      <ArrowRight className="stat-card-arrow" size={15}/>
    </span>
    <strong className="stat-card-value">{value}</strong>
    <span className="stat-card-detail">{detail}</span>
    {progress != null && <span className="stat-card-progress" aria-hidden="true">
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

function RecentInventoryActivity() {
  const [transactions, setTransactions] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const pageSize = expanded ? 10 : 5;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadInventoryAdditionTransactions({page, pageSize})
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
  }, [page, pageSize]);

  function expandCard() {
    if (expanded) return;
    setPage(0);
    setExpanded(true);
  }

  function collapseCard(event) {
    event.stopPropagation();
    setPage(0);
    setExpanded(false);
  }

  return <>
    <div className={`panel activity-panel inventory-activity-card ${expanded ? "is-expanded" : ""}`}
      onClick={expandCard} role={!expanded ? "button" : undefined}
      tabIndex={!expanded ? 0 : undefined}
      onKeyDown={(event) => {
        if (event.currentTarget === event.target && !expanded
          && (event.key === "Enter" || event.key === " ")) expandCard();
      }}>
      <div className="panel-head">
        <div><h2>Actividad de inventario</h2><p>{total} {total === 1
          ? "transacción registrada" : "transacciones registradas"}</p></div>
        {expanded ? <button className="activity-collapse-button" onClick={collapseCard}>
          <Minimize2 size={15}/>Contraer</button>
          : <span className="activity-expand-hint">Presiona para ampliar <ChevronRight size={14}/></span>}
      </div>
      <div className="inventory-transaction-list">
        {loading ? <div className="activity-loading"><div className="state-spinner"/>
          <span>Cargando actividad…</span></div>
          : transactions.length ? transactions.map((transaction) => {
            const date = new Date(transaction.created_at);
            return <button className="inventory-transaction-row" key={transaction.id}
              onClick={(event) => {
                event.stopPropagation();
                setSelected(transaction);
              }}>
              <i className="clay-dot"><ArrowUpDown size={13}/></i>
              <span className="transaction-copy"><strong>Actualización de inventario</strong>
                <small>{transaction.item_count} {transaction.item_count === 1
                  ? "ingrediente" : "ingredientes"} · {transaction.actor_name}</small></span>
              <time title={date.toLocaleString("es-SV")}>
                {date.toLocaleDateString("es-SV", {day: "2-digit", month: "short"})} ·{" "}
                {date.toLocaleTimeString("es-SV", {hour: "2-digit", minute: "2-digit"})}
              </time><ChevronRight size={16}/>
            </button>;
          }) : <div className="activity-empty"><Package size={22}/>
            <span>Aún no se han registrado actualizaciones.</span></div>}
      </div>
      {total > pageSize && <div className="activity-pagination"
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

export default function DashboardPage({onNavigate}) {
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

  return <>
    <section className="service-banner">
      <div className="banner-mark"><FornoFox size={64}/></div>
      <div>FORNO <br/><span> SAN BENITO </span></div>
      <div className="banner-status"><i/><span>Próximo servicio</span><strong>6:00 PM</strong></div>
    </section>
    <section className="dashboard-overview-head">
      <div><span className="eyebrow">RESUMEN OPERATIVO</span><h2>Estado del inventario</h2>
        <p>Prioridades y cobertura de los ingredientes activos.</p></div>
      <button className="text-btn" onClick={() => onNavigate("inventory")}>
        Abrir inventario <ArrowRight size={15}/></button>
    </section>
    <section className="dashboard-stock-summary">
      <StatCard label="Por reponer" value={metricValue(summary.restockProducts)}
        detail={metricDetail(`${summary.lowProducts} bajos · ${summary.criticalProducts} críticos`)}
        icon={Truck} tone="gold" onClick={() => onNavigate("shopping")}/>
      <StatCard label="Críticos" value={metricValue(summary.criticalProducts)}
        detail={metricDetail(summary.criticalProducts
          ? "Llegaron al punto de reorden" : "Sin urgencias en este momento")}
        icon={CircleAlert} tone="clay" onClick={() => onNavigate("inventory")}/>
      <StatCard label="Sin existencia" value={metricValue(summary.productsWithoutExistence)}
        detail={metricDetail(`de ${summary.activeProducts} ingredientes activos`)}
        icon={Warehouse} tone="blue" onClick={() => onNavigate("inventory")}/>
      <StatCard label="Cobertura saludable" value={metricValue(healthyCoverage, "%")}
        detail={metricDetail(`${summary.healthyProducts} ingredientes en nivel óptimo`)}
        icon={PackageCheck} tone="green" progress={healthyCoverage}
        onClick={() => onNavigate("inventory")}/>
    </section>
    <section className="dashboard-grid">
      <div className="panel attention-panel">
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
                    <span><b>{Number(item.quantity).toLocaleString("es-SV")}{" "}
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
      </div>
      <RecentInventoryActivity/>
    </section>
  </>;
}
