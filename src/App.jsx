import {
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
    ChevronRight,
    ClipboardCheck,
    Clock3,
    Gauge,
    LayoutDashboard,
    Leaf,
    ListFilter,
    LogOut,
    Menu,
    Minus,
    Package,
    Plus,
    ReceiptText,
    Search,
    Settings,
    ShoppingBasket,
    Sparkles,
    TrendingDown,
    Upload,
    UserRound,
    Warehouse,
    X,
} from "lucide-react";
import { useAuth } from "./features/auth/AuthProvider";
import CatalogPage from "./features/inventory/pages/CatalogPage";

const navItems = [{
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
        icon: BookOpen
    },
    {
        id: "shopping",
        label: "Compras",
        icon: ShoppingBasket,
        count: 12
    },
    {
        id: "receipts",
        label: "Facturas",
        icon: ReceiptText
    },
];

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

const weeklyUsage = [62, 74, 68, 81, 77, 92, 86];

const formatMoney = (value) => new Intl.NumberFormat("es-SV", {
    style: "currency",
    currency: "USD"
}).format(value);

function Logo() {
    return (
        <div className="logo-wrap">
            <div className="logo-mark"><FornoFox /></div>
            <div><div className="logo-name">FORNO</div><div className="logo-sub">SOMETHING IS COOKING!</div></div>
        </div>
    );
}

function FornoFox({
                      size = 27
                  }) {
    return <svg className="forno-fox" width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <path d="M13 18 7 7l17 8M51 18 57 7 40 15M15 20c4-7 29-7 34 0l-3 21c-3 10-25 10-28 0L15 20Z" stroke="currentColor" strokeWidth="3.5" strokeLinejoin="round" />
        <path d="M19 19c7 5 19 5 26 0M22 28c6 3 14 3 20 0M28 38h8l-4 5-4-5Z" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M13 47c7 9 31 9 38 0M22 54l-4 7M42 54l4 7" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
    </svg>;
}

function Sidebar({
                     page,
                     setPage,
                     open,
                     setOpen,
                     identity,
                     onSignOut,
                     signingOut
                 }) {
    return (
        <aside className={`sidebar ${open ? "open" : ""}`}>
            <div className="side-head"><Logo /><button className="icon-btn close-side" onClick={() => setOpen(false)}><X size={18} /></button></div>
            <div className="restaurant-pill"><div className="rest-avatar">F</div><div><span>Restaurante</span><strong>Forno San Benito</strong></div><ChevronDown size={15} /></div>
            <nav>
                <p className="nav-label">OPERACIONES</p>
                {navItems.map(({ id, label, icon: Icon, count }) => (
                    <button key={id} className={`nav-item ${page === id ? "active" : ""}`} onClick={() => { setPage(id); setOpen(false); }}>
                        <Icon size={19} /><span>{label}</span>{count && <b>{count}</b>}
                    </button>
                ))}
                <p className="nav-label bottom">ADMINISTRACIÓN</p>
                <button className="nav-item"><UserRound size={19} /><span>Equipo</span></button>
                <button className="nav-item"><Settings size={19} /><span>Configuración</span></button>
            </nav>
            <div className="side-card"><div className="side-card-icon"><Sparkles size={18} /></div><div><strong>Forno AI</strong><span>Procesa facturas en segundos</span></div><ChevronRight size={16} /></div>
            <div className="user-card"><div className="user-avatar">{identity.initials}</div><div><strong>{identity.name}</strong><span>{identity.role}</span></div>{identity.authenticated && <button className="signout-button" onClick={onSignOut} disabled={signingOut} title="Cerrar sesión" aria-label="Cerrar sesión"><LogOut size={17} /></button>}</div>
        </aside>
    );
}

function Header({
                    page,
                    setOpen,
                    onUpload
                }) {
    const titles = {
        dashboard: ["Buenos días, Carlos", ""],
        inventory: ["Inventario", ""],
        prep: ["Preparaciones", ""],
        recipes: ["Recetas", ""],
        shopping: ["Lista de compras", ""],
        receipts: ["Facturas", ""]
    };
    return (
        <header className="topbar">
            <button className="icon-btn mobile-menu" onClick={() => setOpen(true)}><Menu size={20} /></button>
            <div className="page-title"><h1>{titles[page][0]}</h1><p>{titles[page][1]}</p></div>
            <div className="top-actions">
                <button className="icon-btn notification"><Bell size={19} /><i /></button>
                <button className="primary-btn" onClick={onUpload}><Upload size={17} /><span>Subir factura</span></button>
            </div>
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
    return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={20} /></div><div className="stat-meta"><span>{label}</span><strong>{value}</strong><p className={trend === "down" ? "good" : trend === "up" ? "warn" : ""}>{trend === "down" ? <ArrowDownRight size={14} /> : trend === "up" ? <ArrowUpRight size={14} /> : null}{detail}</p></div></div>;
}

function StockBadge({
                        item
                    }) {
    const percent = (item.stock / item.par) * 100;
    if (item.stock <= item.reorder) return <span className="status critical"><span />Crítico</span>;
    if (percent < 70) return <span className="status low"><span />Bajo</span>;
    return <span className="status healthy"><span />Óptimo</span>;
}

function Dashboard({
                       inventory,
                       setPage
                   }) {
    const low = inventory.filter((x) => x.stock <= x.reorder || x.stock / x.par < .7);
    return <>
        <section className="service-banner">
            <div className="banner-mark"><FornoFox size={42} /></div>
            <div>FORNO <br/> <span> SAN BENITO </span> </div>
            <div className="banner-status"><i /><span>Próximo servicio</span><strong>6:00 PM</strong></div>
        </section>
        <section className="stats-grid">
            <StatCard label="Valor del inventario" value="$4,286.40" detail="4.8% esta semana" icon={Package} tone="clay" trend="up" />
            <StatCard label="Stock por reponer" value={`${low.length} productos`} detail="2 requieren atención hoy" icon={AlertTriangle} tone="gold" />
            <StatCard label="Costo de alimentos" value="28.4%" detail="1.7% vs. semana pasada" icon={Gauge} tone="green" trend="down" />
            <StatCard label="Desperdicio semanal" value="$84.20" detail="12% vs. semana pasada" icon={TrendingDown} tone="blue" trend="down" />
        </section>
        <section className="dashboard-grid">
            <div className="panel chart-panel">
                <div className="panel-head"><div><h2>Consumo semanal</h2><p>Valor de ingredientes utilizados</p></div><button className="select-btn">Últimos 7 días <ChevronDown size={15} /></button></div>
                <div className="chart-top"><strong>$540.80</strong><span><ArrowDownRight size={14} /> 6.2%</span></div>
                <div className="bar-chart">
                    {weeklyUsage.map((n, i) => <div className="bar-item" key={i}><div className="bar-track"><div className="bar" style={{ height: `${n}%` }}><span>${Math.round(n * .9)}</span></div></div><small>{["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"][i]}</small></div>)}
                </div>
            </div>
            <div className="panel attention-panel">
                <div className="panel-head"><div><h2>Necesita atención</h2><p>Productos próximos a agotarse</p></div><button className="text-btn" onClick={() => setPage("inventory")}>Ver todos <ChevronRight size={15} /></button></div>
                <div className="attention-list">
                    {low.slice(0, 4).map((item) => <div className="attention-row" key={item.id}><div className="food-icon">{item.icon}</div><div className="attention-info"><strong>{item.name}</strong><span>{item.stock} {item.unit} disponibles</span><div className="stock-line"><i style={{ width: `${Math.min(100, item.stock / item.par * 100)}%` }} /></div></div><StockBadge item={item} /></div>)}
                </div>
                <button className="wide-soft-btn" onClick={() => setPage("shopping")}><ShoppingBasket size={17} /> Agregar todos a compras</button>
            </div>
            <div className="panel prep-overview">
                <div className="panel-head"><div><h2>Preparación para hoy</h2><p>Progreso antes del servicio</p></div><button className="text-btn" onClick={() => setPage("prep")}>Abrir lista <ChevronRight size={15} /></button></div>
                <div className="prep-progress"><div className="progress-ring"><svg viewBox="0 0 44 44"><circle cx="22" cy="22" r="18" /><circle className="ring-value" cx="22" cy="22" r="18" /></svg><strong>68%</strong></div><div><strong>13 de 19 tareas</strong><span>6 preparaciones pendientes</span></div><div className="time-chip"><Clock3 size={15} /> Servicio en 3h 20m</div></div>
                <div className="mini-tasks"><div><CheckCircle2 size={18} /><span>Masa napolitana</span><b>60 un.</b></div><div><CheckCircle2 size={18} /><span>Salsa pomodoro</span><b>6 cont.</b></div><div className="pending"><Clock3 size={18} /><span>Mozzarella porcionada</span><b>3 / 5</b></div></div>
            </div>
            <div className="panel activity-panel">
                <div className="panel-head"><div><h2>Actividad reciente</h2><p>Movimientos de hoy</p></div><button className="more-button">•••</button></div>
                <div className="timeline">
                    <div><i className="green-dot"><Check size={13} /></i><p><strong>Factura procesada</strong><span>Mercado Central · 18 productos</span></p><time>9:42</time></div>
                    <div><i className="clay-dot"><ChefHat size={13} /></i><p><strong>Preparación registrada</strong><span>60 bolas de masa · Ana</span></p><time>8:15</time></div>
                    <div><i className="blue-dot"><Package size={13} /></i><p><strong>Ajuste de inventario</strong><span>Aceite de oliva · +6 L</span></p><time>7:58</time></div>
                </div>
            </div>
        </section>
    </>;
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
        <div className="table-tools"><div className="search-box"><Search size={18} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar ingrediente..." /></div><div className="filter-scroll">{categories.slice(0, 5).map(c => <button className={filter === c ? "active" : ""} onClick={() => setFilter(c)} key={c}>{c}</button>)}</div><button className="secondary-btn"><ListFilter size={17} /> Filtros</button><button className="primary-btn"><Plus size={17} /> Producto</button></div>
        <div className="inventory-summary"><span><b>{inventory.length}</b> productos activos</span><span><i className="critical-dot" /> {inventory.filter(x => x.stock <= x.reorder).length} críticos</span><span>Actualizado hace 4 min</span></div>
        <div className="table-wrap"><table><thead><tr><th>Producto</th><th>Departamento</th><th>Existencia</th><th>Nivel ideal</th><th>Estado</th><th>Costo unitario</th><th>Proveedor</th><th></th></tr></thead><tbody>{filtered.map(item => <tr key={item.id}><td><div className="product-cell"><div className="food-icon">{item.icon}</div><div><strong>{item.name}</strong><span>FOR-{String(item.id).padStart(4, "0")}</span></div></div></td><td><span className="category-tag">{item.category}</span></td><td><div className="quantity-stepper"><button onClick={() => adjust(item.id, -1)}><Minus size={13} /></button><strong>{item.stock}</strong><span>{item.unit}</span><button onClick={() => adjust(item.id, 1)}><Plus size={13} /></button></div></td><td>{item.par} {item.unit}</td><td><StockBadge item={item} /></td><td>{formatMoney(item.price)} / {item.unit}</td><td>{item.supplier}</td><td><button className="more-button">•••</button></td></tr>)}</tbody></table></div>
    </div>;
}

function PrepPage() {
    const [counts, setCounts] = useState(Object.fromEntries(prepOptions.map((_, i) => [i, 0])));
    const selected = Object.values(counts).filter(Boolean).length;
    const total = prepOptions.reduce((sum, _, i) => sum + counts[i], 0);
    return <div className="prep-layout"><div className="panel prep-builder"><div className="panel-head"><div><h2>Selecciona qué preparar</h2><p>Las existencias se descontarán automáticamente al finalizar.</p></div><span className="date-badge">Martes, 14 jul</span></div><div className="prep-cards">{prepOptions.map((item, i) => <div className={`prep-card ${counts[i] ? "selected" : ""}`} key={item.name}><div className="big-food">{item.emoji}</div><div className="prep-card-copy"><h3>{item.name}</h3><p>{item.available} {item.unit} listos</p><span>Sugerido: {item.suggested}</span></div><div className="counter"><button onClick={() => setCounts({...counts, [i]: Math.max(0, counts[i] - 1)})}><Minus size={15} /></button><strong>{counts[i]}</strong><button onClick={() => setCounts({...counts, [i]: counts[i] + 1})}><Plus size={15} /></button></div></div>)}</div></div><aside className="panel prep-ticket"><div><span className="eyebrow">LISTA DE PRODUCCIÓN</span><h2>Preparación de hoy</h2><p>{selected ? `${selected} tipos seleccionados` : "Aún no has seleccionado productos"}</p></div><div className="ticket-lines">{prepOptions.map((x, i) => counts[i] ? <div key={x.name}><span>{x.name}</span><strong>{counts[i]} {x.unit}</strong></div> : null)}</div><div className="ticket-total"><span>Total a preparar</span><strong>{total}</strong></div><button className="primary-btn full" disabled={!selected}><ChefHat size={18} /> Iniciar preparación</button><small><Leaf size={14} /> Calcularemos los ingredientes necesarios</small></aside></div>;
}

function RecipesPage() {
    return <div className="recipe-grid">{recipes.map((r, i) => <article className="panel recipe-card" key={r.name}><div className={`recipe-visual rv-${i}`}><span>{r.emoji}</span><button>•••</button></div><div className="recipe-body"><div><span className="category-tag">{r.category}</span><h2>{r.name}</h2></div><div className="recipe-stats"><div><span>Ingredientes</span><strong>{r.ingredients}</strong></div><div><span>Preparación</span><strong>{r.prep}</strong></div><div><span>Disponibles</span><strong>{r.stock}</strong></div></div><div className="recipe-footer"><div><span>Costo por porción</span><strong>{formatMoney(r.cost)}</strong></div>{r.margin && <div className="margin"><span>Margen</span><strong>{r.margin}%</strong></div>}<button className="icon-btn"><ChevronRight size={18} /></button></div></div></article>)}</div>;
}

function ShoppingPage({
                          inventory
                      }) {
    const initial = inventory.filter(x => x.stock / x.par < .7).map(x => ({
        ...x,
        buy: Math.ceil(x.par - x.stock),
        checked: false
    }));
    const [items, setItems] = useState(initial);
    const grouped = useMemo(() => Object.groupBy ? Object.groupBy(items, x => x.category) : items.reduce((a, x) => ((a[x.category] ||= []).push(x), a), {}), [items]);
    const estimated = items.reduce((sum, x) => sum + x.buy * x.price, 0);
    return <div className="shopping-layout"><div className="panel shopping-main"><div className="panel-head"><div><h2>Lista recomendada</h2><p>Generada según niveles ideales y consumo previsto.</p></div><button className="secondary-btn"><Plus size={17} /> Agregar ingrediente</button></div>{Object.entries(grouped).map(([category, list]) => <section className="aisle" key={category}><div className="aisle-head"><span><Leaf size={17} />{category}</span><b>{list.length}</b></div>{list.map(item => <label className={`shop-row ${item.checked ? "done" : ""}`} key={item.id}><input type="checkbox" checked={item.checked} onChange={() => setItems(items.map(x => x.id === item.id ? {...x, checked: !x.checked} : x))} /><span className="custom-check"><Check size={14} /></span><div className="food-icon">{item.icon}</div><div className="shop-name"><strong>{item.name}</strong><span>{item.supplier}</span></div><div className="shop-qty"><strong>{item.buy} {item.unit}</strong><span>{formatMoney(item.buy * item.price)}</span></div></label>)}</section>)}</div><aside className="panel order-summary"><span className="eyebrow">RESUMEN</span><h2>Compra semanal</h2><div className="summary-ring"><ShoppingBasket size={24} /><strong>{items.filter(x => !x.checked).length}</strong><span>pendientes</span></div><div className="summary-line"><span>Estimado</span><strong>{formatMoney(estimated)}</strong></div><div className="summary-line"><span>Proveedores</span><strong>{new Set(items.map(x => x.supplier)).size}</strong></div><button className="primary-btn full"><ClipboardCheck size={18} /> Revisar y enviar</button><p className="ai-note"><Sparkles size={16} /> Actualizada con el consumo de los últimos 30 días.</p></aside></div>;
}

function ReceiptsPage({
                          onUpload
                      }) {
    return <div className="receipts-layout"><button className="upload-zone" onClick={onUpload}><div className="upload-icon"><ReceiptText size={30} /></div><h2>Suelta una factura aquí</h2><p>Forno AI reconocerá proveedor, productos, cantidades, precios e impuestos.</p><span className="primary-btn"><Upload size={17} /> Elegir archivo</span><small>PDF, JPG o PNG · máximo 10 MB</small></button><div className="panel recent-receipts"><div className="panel-head"><div><h2>Facturas recientes</h2><p>Compras procesadas este mes</p></div><button className="select-btn">Julio 2026 <ChevronDown size={15} /></button></div><div className="receipt-row"><div className="file-icon">PDF</div><div><strong>Mercado Central</strong><span>14 jul · 18 productos</span></div><b>$186.42</b><span className="status healthy"><span />Procesada</span></div><div className="receipt-row"><div className="file-icon">JPG</div><div><strong>Distribuidora Roma</strong><span>12 jul · 8 productos</span></div><b>$324.10</b><span className="status healthy"><span />Procesada</span></div><div className="receipt-row"><div className="file-icon">PDF</div><div><strong>Pricesmart</strong><span>10 jul · 23 productos</span></div><b>$419.80</b><span className="status low"><span />Revisar</span></div></div></div>;
}

function UploadModal({
                         onClose
                     }) {
    const [stage, setStage] = useState("upload");
    return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" onMouseDown={e => e.stopPropagation()}><button className="icon-btn modal-close" onClick={onClose}><X size={18} /></button>{stage === "upload" ? <><div className="modal-art"><Sparkles size={28} /></div><span className="eyebrow">FORNO AI</span><h2>Registra una compra</h2><p>Sube una foto o PDF de la factura. Puedes revisar cada dato antes de actualizar el inventario.</p><button className="modal-drop" onClick={() => setStage("done")}><Upload size={24} /><strong>Seleccionar factura</strong><span>o arrastra el archivo aquí</span></button><div className="secure-note"><CheckCircle2 size={16} /> Archivo cifrado durante la transferencia</div></> : <><div className="success-mark"><Check size={30} /></div><h2>¡Factura lista!</h2><p>Detectamos 18 productos de Mercado Central por un total de <strong>$186.42</strong>.</p><div className="scan-summary"><span>Confianza de lectura</span><strong>98.4%</strong></div><button className="primary-btn full" onClick={onClose}>Revisar productos</button></>}</div></div>;
}

export default function App() {
    const { profile, user, signOut } = useAuth();
    const [page, setPage] = useState("dashboard");
    const [mobileOpen, setMobileOpen] = useState(false);
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

    async function handleSignOut() {
        setSigningOut(true);
        await signOut();
        setSigningOut(false);
    }

    return <div className="app-shell">
        <Sidebar page={page} setPage={setPage} open={mobileOpen} setOpen={setMobileOpen} identity={identity} onSignOut={handleSignOut} signingOut={signingOut} />
        {mobileOpen && <div className="side-overlay" onClick={() => setMobileOpen(false)} />}
        <main className="main"><Header page={page} setOpen={setMobileOpen} onUpload={() => setUploadOpen(true)} /><div className="content">{page === "dashboard" && <Dashboard inventory={inventory} setPage={setPage} />}{page === "inventory" && <CatalogPage />}{page === "prep" && <PrepPage />}{page === "recipes" && <RecipesPage />}{page === "shopping" && <ShoppingPage inventory={inventory} />}{page === "receipts" && <ReceiptsPage onUpload={() => setUploadOpen(true)} />}</div></main>
        {uploadOpen && <UploadModal onClose={() => setUploadOpen(false)} />}
    </div>;
}
