import {
    useEffect,
    useMemo,
    useState
} from "react";
import {
    AlertTriangle,
    ArrowDownRight,
    ArrowUpRight,
    Bell,
    BookOpen,
    Check,
    CheckCircle2,
    ChefHat,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Clock3,
    LayoutDashboard,
    Leaf,
    ListFilter,
    LogOut,
    Menu,
    Minimize2,
    Minus,
    Moon,
    Package,
    PanelLeftClose,
    PanelLeftOpen,
    Plus,
    ReceiptText,
    Search,
    Settings,
    ShoppingBasket,
    Sparkles,
    Sun,
    Upload,
    UserRound,
    Warehouse,
    X,
} from "lucide-react";

import {useAuth} from "./features/auth/AuthProvider";
import CatalogPage from "./features/inventory/pages/CatalogPage";
import ShoppingPage from "./features/purchasing/ShoppingPage";
import {loadCatalog, loadInventoryAdditionTransactions} from "./features/inventory/api/catalogRepository";
import {
    inventoryDashboardSummary,
    quantityUnitLabel,
    sortCatalogItems,
    stockStatus,
} from "./features/inventory/catalogModel";
import {applyTheme, readTheme} from "./app/theme";
import {releaseScope, RELEASE_SCOPES} from "./config/release";

import NicoWineWhite from "./assets/nico-whine-white.png";

const fullNavItems = [{
    id: "dashboard",
    label: "Resumen",
    icon: LayoutDashboard
},
    {
        id: "inventory",
        label: "Inventario",
        icon: Warehouse
    },
    {
        id: "prep",
        label: "Preparación",
        icon: ChefHat
    },
    {
        id: "recipes",
        label: "Recetas",
        icon: BookOpen,
        nested: true
    },
    {
        id: "shopping",
        label: "Compras",
        icon: ShoppingBasket
    },
    {
        id: "receipts",
        label: "Facturas",
        icon: ReceiptText
    },
];

const inventoryReleaseNavItems = fullNavItems.filter(({id}) => id === "inventory");
const operationsReleaseNavItems = fullNavItems.filter(({id}) => ["dashboard", "inventory", "shopping"].includes(id));

const inventorySeed = [{
    id: 1,
    name: "Tomate de cocina",
    category: "Frutas y verduras",
    unit: "lb",
    stock: 2,
    par: 12,
    reorder: 4,
    price: 1.25,
    supplier: "Mercado Central",
    icon: "🍅"
},
    {
        id: 2,
        name: "Harina 00",
        category: "Secos y granos",
        unit: "lb",
        stock: 18,
        par: 24,
        reorder: 8,
        price: 0.92,
        supplier: "Distribuidora Roma",
        icon: "🌾"
    },
    {
        id: 3,
        name: "Mozzarella fior di latte",
        category: "Lácteos",
        unit: "kg",
        stock: 2.4,
        par: 8,
        reorder: 3,
        price: 8.5,
        supplier: "Lácteos San Julián",
        icon: "🧀"
    },
    {
        id: 4,
        name: "Albahaca fresca",
        category: "Frutas y verduras",
        unit: "manojos",
        stock: 1,
        par: 8,
        reorder: 3,
        price: 1.1,
        supplier: "Mercado Central",
        icon: "🌿"
    },
    {
        id: 5,
        name: "Aceite de oliva",
        category: "Aceites y condimentos",
        unit: "L",
        stock: 7.5,
        par: 10,
        reorder: 3,
        price: 10.3,
        supplier: "Selectos",
        icon: "🫒"
    },
    {
        id: 6,
        name: "Prosciutto",
        category: "Carnes y embutidos",
        unit: "kg",
        stock: 3.8,
        par: 5,
        reorder: 1.5,
        price: 17.8,
        supplier: "Embutidos del Valle",
        icon: "🥩"
    },
    {
        id: 7,
        name: "Champiñón",
        category: "Frutas y verduras",
        unit: "lb",
        stock: 3,
        par: 5,
        reorder: 2,
        price: 2.2,
        supplier: "Pricesmart",
        icon: "🍄"
    },
    {
        id: 8,
        name: "Vino tinto de cocina",
        category: "Bebidas",
        unit: "botellas",
        stock: 7,
        par: 6,
        reorder: 2,
        price: 7.9,
        supplier: "La Cava",
        icon: "🍷"
    },
];

const recipes = [{
    name: "Pizza Margherita",
    category: "Pizza",
    prep: "8 min",
    cost: 3.48,
    price: 11,
    margin: 68,
    stock: 18,
    emoji: "🍕",
    ingredients: 6
},
    {
        name: "Pizza Prosciutto",
        category: "Pizza",
        prep: "10 min",
        cost: 5.12,
        price: 14,
        margin: 63,
        stock: 12,
        emoji: "🍕",
        ingredients: 7
    },
    {
        name: "Salsa pomodoro",
        category: "Preparación base",
        prep: "45 min",
        cost: 7.8,
        price: null,
        margin: null,
        stock: 4,
        emoji: "🥫",
        ingredients: 5
    },
    {
        name: "Masa napolitana",
        category: "Preparación base",
        prep: "24 h",
        cost: 0.68,
        price: null,
        margin: null,
        stock: 42,
        emoji: "🫓",
        ingredients: 4
    },
];

const prepOptions = [{
    name: "Bolas de masa",
    unit: "unidades",
    available: 42,
    suggested: 60,
    emoji: "🫓"
},
    {
        name: "Salsa pomodoro",
        unit: "contenedores 2 L",
        available: 4,
        suggested: 6,
        emoji: "🥫"
    },
    {
        name: "Mozzarella porcionada",
        unit: "bandejas",
        available: 3,
        suggested: 5,
        emoji: "🧀"
    },
    {
        name: "Vegetales asados",
        unit: "contenedores 1 L",
        available: 2,
        suggested: 3,
        emoji: "🫑"
    },
];

const formatMoney = (value) => new Intl.NumberFormat("es-SV", {
    style: "currency",
    currency: "USD"
}).format(value);

function Logo() {
    return (
        <div className="logo-wrap">
            <div className="logo-mark"><FornoFox/></div>
            <div>
                <div className="logo-name">FORNO</div>
                <div className="logo-sub">SOMETHING IS COOKING!</div>
            </div>
        </div>
    );
}

function FornoFox({
                      size = 38
                  }) {
    return <img src={NicoWineWhite} className="forno-fox" width={size} height={size} alt="" aria-hidden="true"/>;
}

function Sidebar({
                     page,
                     setPage,
                     open,
                     setOpen,
                     collapsed,
                     setCollapsed,
                     identity,
                     onSignOut,
                     signingOut,
                     navigationItems,
                     showTeam
                 }) {
    return (
        <aside className={`sidebar ${open ? "open" : ""} ${collapsed ? "collapsed" : ""}`}>
            <div className="side-head"><Logo/>
                <button className="icon-btn close-side" onClick={() => setOpen(false)}><X size={18}/></button>
            </div>
            <button className="sidebar-collapse" onClick={() => setCollapsed((current) => !current)}
                    aria-label={collapsed ? "Expandir menú lateral" : "Contraer menú lateral"}
                    title={collapsed ? "Expandir menú" : "Contraer menú"}>
                {collapsed ? <PanelLeftOpen size={16}/> : <PanelLeftClose size={16}/>}
            </button>
            <nav>
                <p className="nav-label">OPERACIONES</p>
                {navigationItems.map(({id, label, icon: Icon, count, nested}) => (
                    <button key={id} title={collapsed ? label : undefined}
                            className={`nav-item ${nested ? "nested" : ""} ${page === id ? "active" : ""}`}
                            onClick={() => {
                                setPage(id);
                                setOpen(false);
                            }}>
                        <Icon size={nested ? 16 : 19}/><span>{label}</span>{count && <b>{count}</b>}
                    </button>
                ))}
                <div className="admin-nav">
                    <p className="nav-label bottom">ADMINISTRACIÓN</p>
                    {showTeam && <button className="nav-item" title={collapsed ? "Equipo" : undefined}><UserRound
                        size={19}/><span>Equipo</span></button>}
                    <button className={`nav-item ${page === "settings" ? "active" : ""}`}
                            title={collapsed ? "Configuración" : undefined} onClick={() => {
                        setPage("settings");
                        setOpen(false);
                    }}><Settings size={19}/><span>Configuración</span></button>
                </div>
            </nav>
            <div className="user-card">
                <div className="user-avatar">{identity.initials}</div>
                <div><strong>{identity.name}</strong><span>{identity.role}</span></div>
                {identity.authenticated &&
                    <button className="signout-button" onClick={onSignOut} disabled={signingOut} title="Cerrar sesión"
                            aria-label="Cerrar sesión"><LogOut size={17}/></button>}</div>
        </aside>
    );
}

function Header({
                    page,
                    setOpen,
                    onUpload,
                    showUpload
                }) {
    const titles = {
        dashboard: ["Buenos días, Carlos", ""],
        inventory: ["Inventario", ""],
        prep: ["Preparaciones", ""],
        recipes: ["Recetas", ""],
        shopping: ["Lista de compras", ""],
        receipts: ["Facturas", ""],
        settings: ["Configuración", ""]
    };
    return (
        <header className="topbar">
            <button className="icon-btn mobile-menu" onClick={() => setOpen(true)}><Menu size={20}/></button>
            <div className="page-title"><h1>{titles[page][0]}</h1><p>{titles[page][1]}</p></div>
            {showUpload && <div className="top-actions">
                <button className="icon-btn notification"><Bell size={19}/><i/></button>
                <button className="primary-btn" onClick={onUpload}><Upload size={17}/><span>Subir factura</span>
                </button>
            </div>}
        </header>
    );
}

function StatCard({
                      label,
                      value,
                      detail,
                      icon: Icon,
                      tone,
                      trend
                  }) {
    return <div className="stat-card">
        <div className={`stat-icon ${tone}`}><Icon size={20}/></div>
        <div className="stat-meta"><span>{label}</span><strong>{value}</strong><p
            className={trend === "down" ? "good" : trend === "up" ? "warn" : ""}>{trend === "down" ?
            <ArrowDownRight size={14}/> : trend === "up" ? <ArrowUpRight size={14}/> : null}{detail}</p></div>
    </div>;
}

function StockBadge({
                        item
                    }) {
    const status = item.quantity == null
        ? (item.stock <= item.reorder ? "critical" : item.par > 0 && item.stock / item.par < .7 ? "low" : "healthy")
        : stockStatus(item).key;
    if (status === "critical") return <span className="status critical"><span/>Crítico</span>;
    if (status === "low") return <span className="status low"><span/>Bajo</span>;
    return <span className="status healthy"><span/>Óptimo</span>;
}

function Dashboard({
                       setPage
                   }) {
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
    const metricDetail = (value) => catalogLoading
        ? "Cargando inventario…"
        : catalogError ? "No se pudo actualizar" : value;

    return <>
        <section className="service-banner">
            <div className="banner-mark"><FornoFox size={64}/></div>
            <div>FORNO <br/> <span> SAN BENITO </span></div>
            <div className="banner-status"><i/><span>Próximo servicio</span><strong>6:00 PM</strong></div>
        </section>
        <section className="dashboard-stock-summary">
            <StatCard label="Stock por reponer"
                      value={metricValue(summary.restockProducts, summary.restockProducts === 1 ? " producto" : " productos")}
                      detail={metricDetail(`${summary.criticalProducts} ${summary.criticalProducts === 1 ? "requiere" : "requieren"} atención hoy`)}
                      icon={AlertTriangle} tone="gold"/>
        </section>
        <section className="dashboard-grid">
            <div className="panel attention-panel">
                <div className="panel-head">
                    <div><h2>Necesita atención</h2><p>Productos próximos a agotarse</p></div>
                    <button className="text-btn" onClick={() => setPage("inventory")}>Ver todos <ChevronRight
                        size={15}/></button>
                </div>
                <div className="attention-list">
                    {catalogLoading ? <div className="dashboard-attention-state"><div className="state-spinner"/>Cargando inventario…</div>
                        : catalogError ? <div className="dashboard-attention-state"><AlertTriangle size={18}/>No se pudo cargar el inventario.</div>
                        : attentionItems.length ? attentionItems.slice(0, 4).map((item) => <div className="attention-row" key={item.id}>
                        <div className="food-icon"><Leaf size={17}/></div>
                        <div className="attention-info">
                            <strong>{item.name}</strong><span>{Number(item.quantity).toLocaleString("es-SV")} {quantityUnitLabel(item.base_unit, item.quantity)} disponibles</span>
                            <div className="stock-line"><i
                                style={{width: `${Math.min(100, Number(item.par_level) > 0 ? Number(item.quantity) / Number(item.par_level) * 100 : 0)}%`}}/></div>
                        </div>
                        <StockBadge item={item}/></div>)
                            : <div className="dashboard-attention-state healthy"><CheckCircle2 size={18}/>Todo el inventario está en buen nivel.</div>}
                </div>
            </div>
            <RecentInventoryActivity/>
        </section>
    </>;
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
            .finally(() => active && setLoading(false));
        return () => {
            active = false;
        };
    }, [page, pageSize]);

    function expandCard() {
        if (!expanded) {
            setPage(0);
            setExpanded(true);
        }
    }

    function collapseCard(event) {
        event.stopPropagation();
        setPage(0);
        setExpanded(false);
    }

    return <>
    <div className={`panel activity-panel inventory-activity-card ${expanded ? "is-expanded" : ""}`}
         onClick={expandCard} role={!expanded ? "button" : undefined} tabIndex={!expanded ? 0 : undefined}
         onKeyDown={(event) => {
             if (event.currentTarget === event.target
                 && !expanded
                 && (event.key === "Enter" || event.key === " ")) expandCard();
         }}>
        <div className="panel-head">
            <div><h2>Actividad de inventario</h2><p>{total} {total === 1 ? "transacción registrada" : "transacciones registradas"}</p></div>
            {expanded ? <button className="activity-collapse-button" onClick={collapseCard}>
                <Minimize2 size={15}/>Contraer</button> : <span className="activity-expand-hint">Presiona para ampliar <ChevronRight size={14}/></span>}
        </div>
        <div className="inventory-transaction-list">
            {loading ? <div className="activity-loading"><div className="state-spinner"/><span>Cargando actividad…</span></div>
                : transactions.length ? transactions.map((transaction) => {
                    const date = new Date(transaction.created_at);
                    return <button className="inventory-transaction-row" key={transaction.id}
                        onClick={(event) => {
                            event.stopPropagation();
                            setSelected(transaction);
                        }}>
                        <i className="clay-dot">
                            <Plus size={13}/></i><span className="transaction-copy">
                            <strong>Existencias agregadas</strong>
                            <small>{transaction.item_count} {transaction.item_count === 1 ? "ingrediente" : "ingredientes"} · {transaction.actor_name}</small>
                        </span><time title={date.toLocaleString("es-SV")}>{date.toLocaleDateString("es-SV", {
                            day: "2-digit", month: "short"
                        })} · {date.toLocaleTimeString("es-SV", {hour: "2-digit", minute: "2-digit"})}</time>
                        <ChevronRight size={16}/>
                    </button>;
                }) : <div className="activity-empty"><Package size={22}/><span>Aún no se han agregado existencias.</span></div>}
        </div>
        {total > pageSize && <div className="activity-pagination" onClick={(event) => event.stopPropagation()}>
            <button disabled={page === 0 || loading} onClick={() => setPage((current) => current - 1)}
                    aria-label="Página anterior"><ChevronLeft size={15}/></button>
            <span>Página <strong>{page + 1}</strong> de {pageCount} · {pageSize} por página</span>
            <button disabled={page + 1 >= pageCount || loading} onClick={() => setPage((current) => current + 1)}
                    aria-label="Página siguiente"><ChevronRight size={15}/></button>
        </div>}
    </div>
    {selected && <InventoryTransactionDialog transaction={selected} onClose={() => setSelected(null)}/>}
    </>;
}

function InventoryTransactionDialog({transaction, onClose}) {
    const date = new Date(transaction.created_at);
    return <div className="modal-backdrop" onMouseDown={onClose}>
        <section className="modal inventory-transaction-dialog" onMouseDown={(event) => event.stopPropagation()}
                 role="dialog" aria-modal="true" aria-label="Detalle de transacción">
            <button className="icon-btn modal-close" onClick={onClose} aria-label="Cerrar"><X size={18}/></button>
            <span className="eyebrow">ACTIVIDAD DE INVENTARIO</span>
            <h2>Existencias agregadas</h2>
            <p>{transaction.actor_name} · {date.toLocaleString("es-SV", {
                dateStyle: "medium", timeStyle: "short"
            })}</p>
            <div className="table-wrap transaction-detail-table"><table><thead><tr>
                <th>Ingrediente</th><th>Anterior</th><th>Agregado</th><th>Nuevo nivel</th>
            </tr></thead><tbody>{transaction.items.map((movement) => <tr key={movement.id}>
                <td><strong>{movement.item?.name ?? "Ingrediente"}</strong><small>{movement.item?.sku || "Sin SKU"}</small></td>
                <td>{movement.quantity_before == null ? "—" : <>{Number(movement.quantity_before).toLocaleString("es-SV")} {quantityUnitLabel(movement.item?.base_unit, movement.quantity_before)}</>}</td>
                <td><span className="addition-pill">+{Number(movement.quantity_delta).toLocaleString("es-SV")} {quantityUnitLabel(movement.item?.base_unit, movement.quantity_delta)}</span></td>
                <td>{movement.quantity_after == null ? "—" : <strong>{Number(movement.quantity_after).toLocaleString("es-SV")} {quantityUnitLabel(movement.item?.base_unit, movement.quantity_after)}</strong>}</td>
            </tr>)}</tbody></table></div>
            <div className="dialog-actions"><button className="primary-btn" onClick={onClose}>Cerrar detalle</button></div>
        </section>
    </div>;
}

function Inventory({
                       inventory,
                       setInventory
                   }) {
    const [query, setQuery] = useState("");
    const [filter, setFilter] = useState("Todos");
    const filtered = inventory.filter((x) => x.name.toLowerCase().includes(query.toLowerCase()) && (filter === "Todos" || x.category === filter));
    const categories = ["Todos", ...new Set(inventory.map((x) => x.category))];

    function adjust(id, amount) {
        setInventory(items => items.map(x => x.id === id ? {
            ...x,
            stock: Math.max(0, +(x.stock + amount).toFixed(1))
        } : x));
    }

    return <div className="panel page-panel">
        <div className="table-tools">
            <div className="search-box"><Search size={18}/><input value={query}
                                                                  onChange={(e) => setQuery(e.target.value)}
                                                                  placeholder="Buscar ingrediente..."/></div>
            <div className="filter-scroll">{categories.slice(0, 5).map(c => <button
                className={filter === c ? "active" : ""} onClick={() => setFilter(c)} key={c}>{c}</button>)}</div>
            <button className="secondary-btn"><ListFilter size={17}/> Filtros</button>
            <button className="primary-btn"><Plus size={17}/> Producto</button>
        </div>
        <div className="inventory-summary"><span><b>{inventory.length}</b> productos activos</span><span><i
            className="critical-dot"/> {inventory.filter(x => x.stock <= x.reorder).length} críticos</span><span>Actualizado hace 4 min</span>
        </div>
        <div className="table-wrap">
            <table>
                <thead>
                <tr>
                    <th>Producto</th>
                    <th>Departamento</th>
                    <th>Existencia</th>
                    <th>Nivel ideal</th>
                    <th>Estado</th>
                    <th>Costo unitario</th>
                    <th>Proveedor</th>
                    <th></th>
                </tr>
                </thead>
                <tbody>{filtered.map(item => <tr key={item.id}>
                    <td>
                        <div className="product-cell">
                            <div className="food-icon">{item.icon}</div>
                            <div><strong>{item.name}</strong><span>FOR-{String(item.id).padStart(4, "0")}</span></div>
                        </div>
                    </td>
                    <td><span className="category-tag">{item.category}</span></td>
                    <td>
                        <div className="quantity-stepper">
                            <button onClick={() => adjust(item.id, -1)}><Minus size={13}/></button>
                            <strong>{item.stock}</strong><span>{item.unit}</span>
                            <button onClick={() => adjust(item.id, 1)}><Plus size={13}/></button>
                        </div>
                    </td>
                    <td>{item.par} {item.unit}</td>
                    <td><StockBadge item={item}/></td>
                    <td>{formatMoney(item.price)} / {item.unit}</td>
                    <td>{item.supplier}</td>
                    <td>
                        <button className="more-button">•••</button>
                    </td>
                </tr>)}</tbody>
            </table>
        </div>
    </div>;
}

function PrepPage() {
    const [counts, setCounts] = useState(Object.fromEntries(prepOptions.map((_, i) => [i, 0])));
    const selected = Object.values(counts).filter(Boolean).length;
    const total = prepOptions.reduce((sum, _, i) => sum + counts[i], 0);
    return <div className="prep-layout">
        <div className="panel prep-builder">
            <div className="panel-head">
                <div><h2>Selecciona qué preparar</h2><p>Las existencias se descontarán automáticamente al finalizar.</p>
                </div>
                <span className="date-badge">Martes, 14 jul</span></div>
            <div className="prep-cards">{prepOptions.map((item, i) => <div
                className={`prep-card ${counts[i] ? "selected" : ""}`} key={item.name}>
                <div className="big-food">{item.emoji}</div>
                <div className="prep-card-copy"><h3>{item.name}</h3><p>{item.available} {item.unit} listos</p>
                    <span>Sugerido: {item.suggested}</span></div>
                <div className="counter">
                    <button onClick={() => setCounts({...counts, [i]: Math.max(0, counts[i] - 1)})}><Minus size={15}/>
                    </button>
                    <strong>{counts[i]}</strong>
                    <button onClick={() => setCounts({...counts, [i]: counts[i] + 1})}><Plus size={15}/></button>
                </div>
            </div>)}</div>
        </div>
        <aside className="panel prep-ticket">
            <div><span className="eyebrow">LISTA DE PRODUCCIÓN</span><h2>Preparación de hoy</h2>
                <p>{selected ? `${selected} tipos seleccionados` : "Aún no has seleccionado productos"}</p></div>
            <div className="ticket-lines">{prepOptions.map((x, i) => counts[i] ?
                <div key={x.name}><span>{x.name}</span><strong>{counts[i]} {x.unit}</strong></div> : null)}</div>
            <div className="ticket-total"><span>Total a preparar</span><strong>{total}</strong></div>
            <button className="primary-btn full" disabled={!selected}><ChefHat size={18}/> Iniciar preparación</button>
            <small><Leaf size={14}/> Calcularemos los ingredientes necesarios</small></aside>
    </div>;
}

function RecipesPage() {
    return <div className="recipe-grid">{recipes.map((r, i) => <article className="panel recipe-card" key={r.name}>
        <div className={`recipe-visual rv-${i}`}><span>{r.emoji}</span>
            <button>•••</button>
        </div>
        <div className="recipe-body">
            <div><span className="category-tag">{r.category}</span><h2>{r.name}</h2></div>
            <div className="recipe-stats">
                <div><span>Ingredientes</span><strong>{r.ingredients}</strong></div>
                <div><span>Preparación</span><strong>{r.prep}</strong></div>
                <div><span>Disponibles</span><strong>{r.stock}</strong></div>
            </div>
            <div className="recipe-footer">
                <div><span>Costo por porción</span><strong>{formatMoney(r.cost)}</strong></div>
                {r.margin && <div className="margin"><span>Margen</span><strong>{r.margin}%</strong></div>}
                <button className="icon-btn"><ChevronRight size={18}/></button>
            </div>
        </div>
    </article>)}</div>;
}

function ReceiptsPage({
                          onUpload
                      }) {
    return <div className="receipts-layout">
        <button className="upload-zone" onClick={onUpload}>
            <div className="upload-icon"><ReceiptText size={30}/></div>
            <h2>Suelta una factura aquí</h2><p>Forno AI reconocerá proveedor, productos, cantidades, precios e
            impuestos.</p><span className="primary-btn"><Upload size={17}/> Elegir archivo</span><small>PDF, JPG o PNG ·
            máximo 10 MB</small></button>
        <div className="panel recent-receipts">
            <div className="panel-head">
                <div><h2>Facturas recientes</h2><p>Compras procesadas este mes</p></div>
                <button className="select-btn">Julio 2026 <ChevronDown size={15}/></button>
            </div>
            <div className="receipt-row">
                <div className="file-icon">PDF</div>
                <div><strong>Mercado Central</strong><span>14 jul · 18 productos</span></div>
                <b>$186.42</b><span className="status healthy"><span/>Procesada</span></div>
            <div className="receipt-row">
                <div className="file-icon">JPG</div>
                <div><strong>Distribuidora Roma</strong><span>12 jul · 8 productos</span></div>
                <b>$324.10</b><span className="status healthy"><span/>Procesada</span></div>
            <div className="receipt-row">
                <div className="file-icon">PDF</div>
                <div><strong>Pricesmart</strong><span>10 jul · 23 productos</span></div>
                <b>$419.80</b><span className="status low"><span/>Revisar</span></div>
        </div>
    </div>;
}

function SettingsPage({theme, onThemeChange}) {
    const choices = [
        {id: "light", label: "Modo claro", description: "Una interfaz luminosa para espacios bien iluminados.", icon: Sun},
        {id: "dark", label: "Modo oscuro", description: "Menos brillo y mayor comodidad durante el servicio nocturno.", icon: Moon},
    ];
    return <div className="settings-layout">
        <section className="panel settings-card">
            <div className="settings-heading"><span className="eyebrow">APARIENCIA</span><h2>Elige cómo ver Forno</h2>
                <p>Tu preferencia se guarda en este dispositivo y se aplica también al inicio de sesión.</p></div>
            <div className="theme-options" role="radiogroup" aria-label="Tema de color">
                {choices.map(({id, label, description, icon: Icon}) => <button key={id} role="radio"
                    aria-checked={theme === id} className={`theme-option ${theme === id ? "selected" : ""}`}
                    onClick={() => onThemeChange(id)}>
                    <span className="theme-option-icon"><Icon size={22}/></span>
                    <span><strong>{label}</strong><small>{description}</small></span>
                    <i className="theme-check">{theme === id && <Check size={15}/>}</i>
                </button>)}
            </div>
        </section>
    </div>;
}

function UploadModal({
                         onClose
                     }) {
    const [stage, setStage] = useState("upload");
    return <div className="modal-backdrop" onMouseDown={onClose}>
        <div className="modal" onMouseDown={e => e.stopPropagation()}>
            <button className="icon-btn modal-close" onClick={onClose}><X size={18}/></button>
            {stage === "upload" ? <>
                <div className="modal-art"><Sparkles size={28}/></div>
                <span className="eyebrow">FORNO AI</span><h2>Registra una compra</h2><p>Sube una foto o PDF de la
                factura. Puedes revisar cada dato antes de actualizar el inventario.</p>
                <button className="modal-drop" onClick={() => setStage("done")}><Upload size={24}/><strong>Seleccionar
                    factura</strong><span>o arrastra el archivo aquí</span></button>
                <div className="secure-note"><CheckCircle2 size={16}/> Archivo cifrado durante la transferencia</div>
            </> : <>
                <div className="success-mark"><Check size={30}/></div>
                <h2>¡Factura lista!</h2><p>Detectamos 18 productos de Mercado Central por un total
                de <strong>$186.42</strong>.</p>
                <div className="scan-summary"><span>Confianza de lectura</span><strong>98.4%</strong></div>
                <button className="primary-btn full" onClick={onClose}>Revisar productos</button>
            </>}</div>
    </div>;
}

export default function App() {
    const {profile, user, signOut} = useAuth();
    const isFullRelease = releaseScope === RELEASE_SCOPES.FULL;
    const navigationItems = releaseScope === RELEASE_SCOPES.INVENTORY
        ? inventoryReleaseNavItems
        : releaseScope === RELEASE_SCOPES.OPERATIONS ? operationsReleaseNavItems : fullNavItems;
    const [page, setPage] = useState(() => releaseScope === RELEASE_SCOPES.INVENTORY ? "inventory" : "dashboard");
    const [mobileOpen, setMobileOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [theme, setTheme] = useState(readTheme);
    const [uploadOpen, setUploadOpen] = useState(false);
    const [signingOut, setSigningOut] = useState(false);
    const [inventory, setInventory] = useState(inventorySeed);
    const displayName = profile?.display_name || user?.email?.split("@")[0] || "Vista previa";
    const identity = {
        authenticated: Boolean(user),
        name: displayName,
        role: profile?.role === "admin" ? "Administrador" : profile?.role === "local" ? "Usuario local" : "Prototipo",
        initials: displayName.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join("") || "F"
    };

    useEffect(() => {
        applyTheme(theme);
    }, [theme]);

    async function handleSignOut() {
        setSigningOut(true);
        await signOut();
        setSigningOut(false);
    }

    return <div className="app-shell">
        <Sidebar page={page} setPage={setPage} open={mobileOpen} setOpen={setMobileOpen}
                 collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} identity={identity}
                 onSignOut={handleSignOut} signingOut={signingOut} navigationItems={navigationItems}
                 showTeam={isFullRelease}/>
        {mobileOpen && <div className="side-overlay" onClick={() => setMobileOpen(false)}/>}
        <main className={`main ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}><Header page={page}
                                                                                        setOpen={setMobileOpen}
                                                                                        onUpload={() => setUploadOpen(true)}
                                                                                        showUpload={isFullRelease}/>
            <div className="content">{page === "dashboard" &&
                <Dashboard setPage={setPage}/>}{page === "inventory" &&
                <CatalogPage/>}{page === "prep" && <PrepPage/>}{page === "recipes" &&
                <RecipesPage/>}{page === "shopping" && <ShoppingPage/>}{page === "receipts" &&
                <ReceiptsPage onUpload={() => setUploadOpen(true)}/>} {page === "settings" &&
                <SettingsPage theme={theme} onThemeChange={setTheme}/>}</div>
        </main>
        {isFullRelease && uploadOpen && <UploadModal onClose={() => setUploadOpen(false)}/>}
    </div>;
}
