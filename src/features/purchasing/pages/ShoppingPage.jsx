import {useEffect, useMemo, useState} from "react";
import {
    AlertTriangle,
    CalendarDays,
    Check,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronsDownUp,
    ChevronsUpDown,
    ClipboardCheck,
    Download,
    FileText,
    FilterX,
    Leaf,
    LoaderCircle,
    Minus,
    PackageCheck,
    Plus,
    RefreshCw,
    RotateCcw,
    Save,
    Search,
    ShoppingBasket,
    X,
} from "lucide-react";
import {quantityUnitLabel, stockStatus} from "../../inventory/catalogModel";
import {Badge} from "../../../components/ui/badge";
import {Button} from "../../../components/ui/button";
import {
    NavigationMenu,
    NavigationMenuContent,
    NavigationMenuItem,
    NavigationMenuTrigger,
} from "../../../components/ui/navigation-menu";
import {InputGroup, InputGroupAddon, InputGroupInput} from "../../../components/ui/input-group";
import {
    Sheet,
    SheetContent,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from "../../../components/ui/sheet";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../../../components/ui/table";
import FornoFoxLogo from "../../../assets/nico-whine-white.png";
import {downloadShoppingCsv} from "../shoppingCsv";
import {downloadShoppingPdf} from "../shoppingPdf";
import {
    buildShoppingItems,
    groupShoppingItems,
    matchesShoppingItem,
} from "../shoppingModel";
import {IngredientIcon} from "../../inventory/ingredientIcons";
import {
    createPurchaseList,
    loadShoppingWorkspace,
    receivePurchaseList,
    saveShoppingDecision,
    saveShoppingDecisions,
} from "../api/shoppingRepository";

function errorMessage(error) {
    if (error?.code === "42P01") return "La lista de compras aún no está habilitada en la base de datos.";
    if (error?.code === "42501") return "Tu sesión no tiene permiso para actualizar la lista.";
    if (error?.code === "23505") return "Uno de estos ingredientes ya pertenece a una lista pendiente.";
    if (error?.code === "P0002") return "La lista o uno de sus ingredientes ya no está disponible.";
    return "No pudimos actualizar la lista de compras. Intenta nuevamente.";
}

export default function ShoppingPage() {
    const [workspace, setWorkspace] = useState({
        catalog: {items: [], departments: [], suppliers: []},
        decisions: [],
        pendingItemIds: [],
        lists: [],
    });
    const [items, setItems] = useState([]);
    const [query, setQuery] = useState("");
    const [viewMode, setViewMode] = useState("recommendations");
    const [groupBy, setGroupBy] = useState("department");
    const [collapsedGroups, setCollapsedGroups] = useState(() => new Set());
    const [collapseInitialized, setCollapseInitialized] = useState(false);
    const [loading, setLoading] = useState(true);
    const [savingIds, setSavingIds] = useState(() => new Set());
    const [message, setMessage] = useState("");
    const [success, setSuccess] = useState("");
    const [review, setReview] = useState(null);
    const [savingList, setSavingList] = useState(false);
    const [receivingList, setReceivingList] = useState(null);
    const [expandedLists, setExpandedLists] = useState(() => new Set());

    async function refresh() {
        setLoading(true);
        setMessage("");
        setSuccess("");
        try {
            const next = await loadShoppingWorkspace();
            setWorkspace(next);
            setItems(buildShoppingItems(next.catalog.items, next.decisions, next.pendingItemIds, {includeAll: true}));
        } catch (error) {
            setMessage(errorMessage(error));
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        refresh();
    }, []);

    const filteredItems = useMemo(() => items
        .filter((item) => viewMode === "all" || item.recommended)
        .filter((item) => matchesShoppingItem(item, {query})), [items, query, viewMode]);
    const groups = useMemo(() => groupShoppingItems(filteredItems, groupBy), [filteredItems, groupBy]);
    const visibleGroups = groups.filter((group) => group.items.length);
    const allGroupsExpanded = visibleGroups.length > 0
        && visibleGroups.every((group) => !collapsedGroups.has(group.key));
    const statusCounts = filteredItems.reduce((counts, item) => {
        const key = stockStatus(item).key;
        counts[key] = (counts[key] ?? 0) + 1;
        return counts;
    }, {critical: 0, low: 0});
    const selectedItems = items.filter((item) => item.included && Number(item.purchaseQuantity) > 0);
    const selectedSupplierNames = [...new Map(selectedItems.map((item) => [
        item.supplier?.id ?? "unassigned",
        item.supplier?.name ?? "Sin proveedor",
    ])).values()].sort((left, right) => left.localeCompare(right, "es"));
    const hasFilters = Boolean(query || viewMode !== "recommendations");

    useEffect(() => {
        if (loading || collapseInitialized) return;
        setCollapsedGroups(new Set(groups.filter((group) => group.items.length).map((group) => group.key)));
        setCollapseInitialized(true);
    }, [collapseInitialized, groups, loading]);

    function setSaving(itemId, saving) {
        setSavingIds((current) => {
            const next = new Set(current);
            if (saving) next.add(itemId);
            else next.delete(itemId);
            return next;
        });
    }

    function setManySaving(itemIds, saving) {
        setSavingIds((current) => {
            const next = new Set(current);
            for (const itemId of itemIds) {
                if (saving) next.add(itemId);
                else next.delete(itemId);
            }
            return next;
        });
    }

    async function persist(itemId, changes) {
        const current = items.find((item) => item.id === itemId);
        if (!current) return;
        const quantityChanged = Object.hasOwn(changes, "purchaseQuantity");
        const usesSuggestedQuantity = quantityChanged
            && Number(changes.purchaseQuantity) === Number(current.suggestedQuantity);
        const next = {
            ...current,
            ...changes,
            quantityOverride: quantityChanged
                ? (usesSuggestedQuantity ? null : Number(changes.purchaseQuantity))
                : current.quantityOverride,
            quantityManuallyOverridden: quantityChanged
                ? !usesSuggestedQuantity
                : current.quantityManuallyOverridden,
        };
        setItems((entries) => entries.map((item) => item.id === itemId ? next : item));
        setSaving(itemId, true);
        setMessage("");
        try {
            await saveShoppingDecision({
                itemId,
                quantityOverride: next.quantityOverride,
                quantityManuallyOverridden: next.quantityManuallyOverridden,
                included: next.included,
            });
        } catch (error) {
            setItems((entries) => entries.map((item) => item.id === itemId ? current : item));
            setMessage(errorMessage(error));
        } finally {
            setSaving(itemId, false);
        }
    }

    async function useSuggestedQuantity(item) {
        setSaving(item.id, true);
        setMessage("");
        try {
            await saveShoppingDecision({
                itemId: item.id,
                quantityOverride: null,
                quantityManuallyOverridden: false,
                included: item.included,
            });
            setItems((entries) => entries.map((entry) => entry.id === item.id ? {
                ...entry,
                purchaseQuantity: entry.suggestedQuantity,
                quantityOverride: null,
                quantityManuallyOverridden: false,
            } : entry));
        } catch (error) {
            setMessage(errorMessage(error));
        } finally {
            setSaving(item.id, false);
        }
    }

    function resetFilters() {
        setQuery("");
        setViewMode("recommendations");
    }

    function toggleGroup(groupKey) {
        setCollapsedGroups((current) => {
            const next = new Set(current);
            if (next.has(groupKey)) next.delete(groupKey);
            else next.add(groupKey);
            return next;
        });
    }

    function toggleAllGroups() {
        setCollapsedGroups(allGroupsExpanded
            ? new Set(visibleGroups.map((group) => group.key))
            : new Set());
    }

    async function toggleGroupSelection(groupItems) {
        const include = groupItems.some((item) => !item.included);
        const itemIds = new Set(groupItems.map((item) => item.id));
        const previous = items.filter((item) => itemIds.has(item.id));
        setItems((entries) => entries.map((item) => itemIds.has(item.id) ? {...item, included: include} : item));
        setManySaving(itemIds, true);
        setMessage("");
        try {
            await saveShoppingDecisions(groupItems.map((item) => ({
                itemId: item.id,
                quantityOverride: item.quantityOverride,
                quantityManuallyOverridden: item.quantityManuallyOverridden,
                included: include,
            })));
        } catch (error) {
            const previousById = new Map(previous.map((item) => [item.id, item]));
            setItems((entries) => entries.map((item) => previousById.get(item.id) ?? item));
            setMessage(errorMessage(error));
        } finally {
            setManySaving(itemIds, false);
        }
    }

    async function saveReviewedList() {
        if (!review?.items.length) return;
        setSavingList(true);
        setMessage("");
        try {
            await createPurchaseList(review.items);
            setReview(null);
            await refresh();
        } catch (error) {
            setMessage(errorMessage(error));
        } finally {
            setSavingList(false);
        }
    }

    async function confirmReceipt(receivedItems) {
        if (!receivingList) return;
        setSavingList(true);
        setMessage("");
        try {
            await receivePurchaseList(receivingList.id, receivedItems);
            setReceivingList(null);
            await refresh();
            setSuccess("La lista se recibió y sus cantidades se agregaron al inventario.");
        } catch (error) {
            setMessage(errorMessage(error));
        } finally {
            setSavingList(false);
        }
    }

    function toggleSavedList(listId) {
        setExpandedLists((current) => {
            const next = new Set(current);
            if (next.has(listId)) next.delete(listId);
            else next.add(listId);
            return next;
        });
    }

    return <>
    <div className="shopping-layout shopping-workspace">
        <div className="panel shopping-main">
            <div className="shopping-heading">
                <button className="secondary-btn" onClick={refresh} disabled={loading}>
                    <RefreshCw size={16} className={loading ? "spinning" : ""}/>Actualizar
                </button>
            </div>
            <div className="shopping-filters shopping-filters-simple">
                <InputGroup className="search-box"><InputGroupInput value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    aria-label="Buscar ingrediente o proveedor" placeholder="Buscar ingrediente o proveedor…"/>
                    <InputGroupAddon><Search size={17}/></InputGroupAddon>
                </InputGroup>
                <ShoppingGroupMenu value={groupBy} onChange={(nextGroupBy) => {
                    setGroupBy(nextGroupBy);
                    setCollapsedGroups(new Set(groupShoppingItems(filteredItems, nextGroupBy)
                        .filter((group) => group.items.length)
                        .map((group) => group.key)));
                }}/>
                <ShoppingViewMenu value={viewMode} onChange={(value) => {
                    setViewMode(value);
                    setCollapseInitialized(false);
                    setCollapsedGroups(new Set());
                }}/>
                {hasFilters && <button className="shopping-reset-filters" onClick={resetFilters}>
                    <FilterX size={15}/>Limpiar
                </button>}
            </div>
            {message && <div className="catalog-message error">{message}</div>}
            {success && <div className="catalog-message success">{success}</div>}
            <div className="shopping-results-bar">
                <div className="shopping-results-summary">
                    <span><strong>{filteredItems.length}</strong>
                        {filteredItems.length === 1 ? " ingrediente" : " ingredientes"}</span>
                    <Badge variant="critical"><AlertTriangle size={12}/>{statusCounts.critical} críticos</Badge>
                    <Badge variant="low">{statusCounts.low} bajos</Badge>
                    <Badge variant="selected">{selectedItems.length} seleccionados</Badge>
                </div>
                {visibleGroups.length > 0 && <Button variant="outline" size="sm" onClick={toggleAllGroups}
                    aria-label={allGroupsExpanded ? "Contraer todos los grupos" : "Expandir todos los grupos"}>
                    {allGroupsExpanded ? <ChevronsDownUp size={15}/> : <ChevronsUpDown size={15}/>}
                    {allGroupsExpanded ? "Contraer todo" : "Expandir todo"}
                </Button>}
            </div>
            {loading ? <div className="shopping-state"><div className="state-spinner"/>Cargando lista de compras…</div>
                : visibleGroups.length ? <div className="shopping-groups">
                    {visibleGroups.map((group) => {
                        const collapsed = collapsedGroups.has(group.key);
                        const selectedGroupCount = group.items.filter((item) => item.included).length;
                        return <section className={`shopping-group ${collapsed ? "collapsed" : ""}`} key={group.key}>
                        <header><button className="shopping-group-toggle" onClick={() => toggleGroup(group.key)}
                            aria-expanded={!collapsed} aria-controls={`shopping-group-${group.key}`}
                            aria-label={`${group.label}, ${group.items.length} ${group.items.length === 1 ? "ingrediente" : "ingredientes"}`}>
                            <span className="shopping-group-chevron">{collapsed
                                ? <ChevronRight size={16}/> : <ChevronDown size={16}/>}</span>
                            <span><Leaf size={16}/><strong>{group.label}</strong></span>
                            {selectedGroupCount > 0 && <b aria-label={`${selectedGroupCount} seleccionados`}>
                                {selectedGroupCount}
                            </b>}
                        </button>
                            <Button variant="secondary" size="sm" className="shopping-group-select"
                                onClick={() => toggleGroupSelection(group.items)}
                                disabled={group.items.some((item) => savingIds.has(item.id))}>
                                {group.items.every((item) => item.included)
                                    ? <><Minus size={14}/>Quitar grupo</>
                                    : <><Check size={14}/>Incluir grupo</>}
                            </Button>
                        </header>
                        {!collapsed && <div className="inventory-subgroup shopping-inventory-subgroup"
                            id={`shopping-group-${group.key}`}>
                            <span className="inventory-subgroup-rail" aria-hidden="true"/>
                            <div className="inventory-subgroup-content shopping-table"><Table>
                                <TableHeader><TableRow>
                                    <TableHead className="shopping-select-column">Incluir</TableHead>
                                    <TableHead>Ingrediente</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead>Existencia</TableHead>
                                    <TableHead>Cantidad a comprar</TableHead>
                                </TableRow></TableHeader>
                                <TableBody>{group.items.map((item) => {
                            const saving = savingIds.has(item.id);
                            const status = stockStatus(item);
                            return <TableRow className={!item.included ? "shopping-excluded" : ""} key={item.id}>
                                <TableCell className="shopping-select-column"><button className={`shopping-check ${item.included ? "selected" : ""}`}
                                    onClick={() => persist(item.id, {included: !item.included})}
                                    disabled={saving} aria-label={`${item.included ? "Excluir" : "Incluir"} ${item.name}`}>
                                    {item.included && <Check size={14}/>}</button></TableCell>
                                <TableCell><div className="shopping-product"><span className="food-icon"><IngredientIcon
                                    iconKey={item.icon_key} iconEmoji={item.icon_emoji} size={16}/></span>
                                    <span><strong>{item.name}</strong><small>
                                        {item.supplier?.name ?? <span className="shopping-missing">Sin proveedor</span>}
                                    </small></span></div></TableCell>
                                <TableCell><Badge variant={status.key}>
                                    {status.key === "critical" && <AlertTriangle size={12}/>}
                                    {status.label}
                                </Badge></TableCell>
                                <TableCell><div className="shopping-stock-brief">
                                    <strong>{Number(item.quantity).toLocaleString("es-SV")} {quantityUnitLabel(item.base_unit, item.quantity)}</strong>
                                    <span>Ideal: {Number(item.par_level).toLocaleString("es-SV")}</span>
                                </div></TableCell>
                                <TableCell><div className="shopping-purchase-control"><div className="shopping-quantity">
                                    <button onClick={() => persist(item.id, {purchaseQuantity: Math.max(0, Number(item.purchaseQuantity) - 1)})}
                                        disabled={saving || Number(item.purchaseQuantity) <= 0}
                                        aria-label={`Quitar una unidad de ${item.name}`}><Minus size={14}/></button>
                                    <input type="number" min="0" step="0.001" value={item.purchaseQuantity}
                                        disabled={saving} aria-label={`Cantidad a comprar de ${item.name}`}
                                        onChange={(event) => setItems((entries) => entries.map((entry) =>
                                            entry.id === item.id ? {...entry, purchaseQuantity: Math.max(0, Number(event.target.value))} : entry))}
                                        onBlur={() => persist(item.id, {purchaseQuantity: Number(item.purchaseQuantity)})}/>
                                    <span>{quantityUnitLabel(item.base_unit, item.purchaseQuantity)}</span>
                                    <button onClick={() => persist(item.id, {purchaseQuantity: Number(item.purchaseQuantity) + 1})}
                                        disabled={saving} aria-label={`Agregar una unidad de ${item.name}`}><Plus size={14}/></button>
                                </div>
                                    <Button variant="ghost" size="icon"
                                        className={`shopping-use-suggestion ${Number(item.purchaseQuantity) === Number(item.suggestedQuantity)
                                            ? "is-hidden" : ""}`}
                                        onClick={() => useSuggestedQuantity(item)}
                                        disabled={saving || Number(item.purchaseQuantity) === Number(item.suggestedQuantity)}
                                        aria-label={`Usar cantidad sugerida para ${item.name}`}
                                        title={`Usar sugerido: ${Number(item.suggestedQuantity).toLocaleString("es-SV")}`}>
                                        <RotateCcw size={14}/>
                                    </Button>
                                </div></TableCell>
                            </TableRow>;
                        })}</TableBody></Table></div></div>}
                    </section>;
                    })}
                </div> : <div className="shopping-state healthy"><ShoppingBasket size={24}/>
                    <strong>{viewMode === "recommendations"
                        ? "No hay ingredientes por reponer"
                        : "No hay ingredientes disponibles"}</strong>
                    <span>{viewMode === "recommendations"
                        ? "Las existencias están sobre sus niveles bajos."
                        : "Ajusta la búsqueda para ver otros resultados."}</span></div>}
        </div>
        <aside className="panel order-summary shopping-order-summary"><span className="eyebrow">RESUMEN</span>
            <h2>Lista para comprar</h2>
            <p>Se exportarán únicamente los ingredientes incluidos.</p>
            <div className="summary-ring"><ShoppingBasket size={24}/><strong>{selectedItems.length}</strong>
                <span>ingredientes</span></div>
            <div className="shopping-supplier-summary">
                <div className="summary-line"><span>Proveedores</span><strong>{selectedSupplierNames.length}</strong></div>
                {selectedSupplierNames.length
                    ? <ul>{selectedSupplierNames.map((supplier) =>
                        <li key={supplier}><span/>{supplier}</li>)}</ul>
                    : <p>No hay proveedores en la selección.</p>}
            </div>
            <button className="primary-btn full" disabled={!selectedItems.length}
                onClick={() => setReview({items: selectedItems, createdAt: new Date()})}>
                <ClipboardCheck size={18}/> Revisar y guardar
            </button>
            <p className="shopping-export-note">Revisa el documento antes de exportarlo o guardarlo.</p>
        </aside>
    </div>
    <PurchaseListHistory lists={workspace.lists} expandedLists={expandedLists}
        onToggle={toggleSavedList} onReceive={setReceivingList}/>
    {review && <PurchaseReviewDialog review={review} saving={savingList}
        onClose={() => !savingList && setReview(null)} onSave={saveReviewedList}/>}
    {receivingList && <ReceivePurchaseDialog list={receivingList} saving={savingList}
        onClose={() => !savingList && setReceivingList(null)} onConfirm={confirmReceipt}/>}
    </>;
}

function ShoppingViewMenu({value, onChange}) {
    const [openItem, setOpenItem] = useState(null);
    const options = [
        {
            value: "recommendations",
            label: "Recomendaciones",
            description: "Ingredientes que alcanzaron el nivel bajo o crítico.",
        },
        {
            value: "all",
            label: "Todos los ingredientes",
            description: "Crea una lista desde cero con cualquier ingrediente disponible.",
        },
    ];
    const selected = options.find((option) => option.value === value) ?? options[0];

    return <NavigationMenu className="shopping-view-menu" value={openItem} onValueChange={setOpenItem}>
        <NavigationMenuItem value="view">
            <NavigationMenuTrigger aria-label="Vista">
                <span><small>Vista</small><strong>{selected.label}</strong></span>
            </NavigationMenuTrigger>
            <NavigationMenuContent>
                <div className="shopping-view-options" aria-label="Elegir vista">
                    {options.map((option) => <button type="button" key={option.value}
                        className={option.value === value ? "selected" : ""}
                        aria-pressed={option.value === value}
                        onClick={() => {
                            onChange(option.value);
                            setOpenItem(null);
                        }}>
                        <span>{option.label}</span>
                        <small>{option.description}</small>
                        {option.value === value && <Check size={15}/>}
                    </button>)}
                </div>
            </NavigationMenuContent>
        </NavigationMenuItem>
    </NavigationMenu>;
}

function ShoppingGroupMenu({value, onChange}) {
    const [openItem, setOpenItem] = useState(null);
    const options = [
        {value: "department", label: "Departamento"},
        {value: "supplier", label: "Proveedor"},
        {value: "none", label: "Sin agrupación"},
    ];
    const selected = options.find((option) => option.value === value) ?? options[0];

    return <NavigationMenu className="shopping-view-menu shopping-group-menu"
        value={openItem} onValueChange={setOpenItem}>
        <NavigationMenuItem value="group">
            <NavigationMenuTrigger aria-label="Agrupar">
                <span><small>Agrupar</small><strong>{selected.label}</strong></span>
            </NavigationMenuTrigger>
            <NavigationMenuContent>
                <div className="shopping-view-options shopping-group-options" aria-label="Elegir agrupación">
                    {options.map((option) => <button type="button" key={option.value}
                        className={option.value === value ? "selected" : ""}
                        aria-pressed={option.value === value}
                        onClick={() => {
                            onChange(option.value);
                            setOpenItem(null);
                        }}>
                        <span>{option.label}</span>
                        {option.value === value && <Check size={15}/>}
                    </button>)}
                </div>
            </NavigationMenuContent>
        </NavigationMenuItem>
    </NavigationMenu>;
}

function savedListExportItems(list) {
    return list.items.map((item) => ({
        name: item.item_name,
        supplier: {name: item.supplier_name},
        base_unit: item.base_unit,
        purchaseQuantity: Number(item.quantity_ordered),
        included: true,
    }));
}

function PurchaseReviewDialog({review, saving, onClose, onSave}) {
    const [exportingPdf, setExportingPdf] = useState(false);

    async function exportPdf() {
        setExportingPdf(true);
        try {
            await downloadShoppingPdf(review.items, {
                createdAt: review.createdAt,
                logoUrl: FornoFoxLogo,
            });
        } finally {
            setExportingPdf(false);
        }
    }

    return <Sheet open onOpenChange={(open) => !open && !saving && onClose()}>
        <SheetContent className="purchase-review-sheet">
            <SheetHeader>
                <SheetTitle>Lista para comprar</SheetTitle>
            </SheetHeader>
            <div className="purchase-review-simple-list">
                {review.items.map((item) => <div className="purchase-review-simple-item" key={item.id}>
                    <strong>{item.name}</strong>
                    <span>{Number(item.purchaseQuantity).toLocaleString("es-SV")}{" "}
                        {quantityUnitLabel(item.base_unit, item.purchaseQuantity)}</span>
                </div>)}
            </div>
            <SheetFooter className="purchase-review-sheet-footer">
                <div className="purchase-review-export-actions">
                    <Button variant="outline" onClick={() => downloadShoppingCsv(review.items)}>
                        <Download size={15}/>Exportar CSV
                    </Button>
                    <Button variant="outline" onClick={exportPdf} disabled={exportingPdf}>
                        {exportingPdf
                            ? <><LoaderCircle className="spinning" size={15}/>Generando…</>
                            : <><FileText size={15}/>Exportar PDF</>}
                    </Button>
                </div>
                <button className="primary-btn" onClick={onSave} disabled={saving}>
                    <Save size={16}/>{saving ? "Guardando…" : "Guardar lista pendiente"}
                </button>
            </SheetFooter>
        </SheetContent>
    </Sheet>;
}

function PurchaseListHistory({lists, expandedLists, onToggle, onReceive}) {
    const [view, setView] = useState("all");
    const [month, setMonth] = useState(() => {
        const today = new Date();
        return new Date(today.getFullYear(), today.getMonth(), 1);
    });
    const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()));
    const pendingCount = lists.filter((list) => list.status === "pending").length;
    const completedCount = lists.length - pendingCount;
    const filteredLists = view === "pending"
        ? lists.filter((list) => list.status === "pending")
        : view === "completed"
            ? lists.filter((list) => list.status !== "pending")
            : lists;

    return <section className="panel purchase-history">
        <header className="purchase-history-heading"><div><span className="eyebrow">HISTORIAL</span>
            <h2>Listas de compras guardadas</h2><p>Pendientes y recibidas por el equipo.</p></div>
            <strong>{lists.length}</strong></header>
        <div className="purchase-history-tabs" role="tablist" aria-label="Vistas de listas guardadas">
            {[
                ["all", "Todas", lists.length],
                ["pending", "Pendientes", pendingCount],
                ["completed", "Completadas", completedCount],
                ["calendar", "Calendario", null],
            ].map(([key, label, count]) => <button key={key} role="tab" aria-selected={view === key}
                className={view === key ? "active" : ""} onClick={() => setView(key)}>
                {key === "calendar" && <CalendarDays size={14}/>}
                {label}{count !== null && <span>{count}</span>}
            </button>)}
        </div>
        {lists.length ? view === "calendar"
            ? <PurchaseHistoryCalendar lists={lists} month={month} onMonthChange={setMonth}
                selectedDate={selectedDate} onDateChange={setSelectedDate}
                expandedLists={expandedLists} onToggle={onToggle} onReceive={onReceive}/>
            : filteredLists.length
                ? <PurchaseHistoryList lists={filteredLists} expandedLists={expandedLists}
                    onToggle={onToggle} onReceive={onReceive}/>
                : <div className="purchase-history-empty"><FileText size={23}/>
                    <strong>No hay listas en esta vista</strong><span>Prueba otra pestaña.</span></div>
            : <div className="purchase-history-empty"><FileText size={23}/>
            <strong>Aún no hay listas guardadas</strong><span>Las nuevas listas aparecerán aquí.</span></div>}
    </section>;
}

function dateKey(value) {
    const date = new Date(value);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function PurchaseHistoryList({lists, expandedLists, onToggle, onReceive, compact = false}) {
    return <div className={`purchase-history-list ${compact ? "is-compact" : ""}`}>
        {lists.map((list) => <PurchaseHistoryEntry key={list.id} list={list}
            expanded={expandedLists.has(list.id)} onToggle={onToggle} onReceive={onReceive}/>)}
    </div>;
}

function PurchaseHistoryEntry({list, expanded, onToggle, onReceive}) {
    const exportedItems = savedListExportItems(list);
    const providers = new Set(list.items.map((item) => item.supplier_name)).size;
    return <article className="purchase-history-entry">
        <button className="purchase-history-toggle" onClick={() => onToggle(list.id)}
            aria-expanded={expanded}>
            <span className="purchase-history-icon"><FileText size={17}/></span>
            <span><strong>Lista #{list.id.slice(0, 8).toUpperCase()}</strong>
                <small>{new Date(list.created_at).toLocaleString("es-SV", {
                    dateStyle: "medium",
                    timeStyle: "short",
                })} · {providers} {providers === 1 ? "proveedor" : "proveedores"}</small></span>
            <span className={`purchase-status ${list.status}`}>
                {list.status === "pending" ? "Pendiente" : "Completada"}
            </span>
            <span>{list.item_count} {list.item_count === 1 ? "ingrediente" : "ingredientes"}</span>
            {expanded ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
        </button>
        {expanded && <div className="purchase-history-detail">
            <div className="purchase-history-order-list">
                {list.items.map((item) => <div key={item.item_id}>
                    <strong>{item.item_name}</strong>
                    <span>{Number(item.quantity_ordered).toLocaleString("es-SV")}{" "}
                        {quantityUnitLabel(item.base_unit, item.quantity_ordered)}</span>
                </div>)}
            </div>
            <footer>
                <div><button className="secondary-btn" onClick={() => downloadShoppingCsv(exportedItems)}>
                    <Download size={15}/>CSV</button>
                    <button className="secondary-btn" onClick={() => downloadShoppingPdf(exportedItems, {
                        createdAt: new Date(list.created_at),
                        logoUrl: FornoFoxLogo,
                    })}><FileText size={15}/>PDF</button></div>
                {list.status === "pending" ? <button className="primary-btn" onClick={() => onReceive(list)}>
                    <PackageCheck size={16}/>Marcar recibida y agregar al inventario
                </button> : <span className="purchase-received-note"><Check size={15}/>
                    Completada {new Date(list.received_at).toLocaleString("es-SV", {
                        dateStyle: "medium",
                        timeStyle: "short",
                    })}</span>}
            </footer>
        </div>}
    </article>;
}

function PurchaseHistoryCalendar({
    lists,
    month,
    onMonthChange,
    selectedDate,
    onDateChange,
    expandedLists,
    onToggle,
    onReceive,
}) {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const firstWeekday = new Date(year, monthIndex, 1).getDay();
    const dayCount = new Date(year, monthIndex + 1, 0).getDate();
    const listsByDate = lists.reduce((map, list) => {
        const key = dateKey(list.created_at);
        map.set(key, [...(map.get(key) ?? []), list]);
        return map;
    }, new Map());
    const selectedLists = listsByDate.get(selectedDate) ?? [];
    const cells = [
        ...Array.from({length: firstWeekday}, () => null),
        ...Array.from({length: dayCount}, (_, index) => index + 1),
    ];

    return <div className="purchase-calendar-layout">
        <div className="purchase-calendar">
            <header><button aria-label="Mes anterior"
                onClick={() => onMonthChange(new Date(year, monthIndex - 1, 1))}><ChevronLeft size={16}/></button>
                <strong>{month.toLocaleDateString("es-SV", {month: "long", year: "numeric"})}</strong>
                <button aria-label="Mes siguiente"
                    onClick={() => onMonthChange(new Date(year, monthIndex + 1, 1))}><ChevronRight size={16}/></button>
            </header>
            <div className="purchase-calendar-weekdays">
                {["D", "L", "M", "M", "J", "V", "S"].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}
            </div>
            <div className="purchase-calendar-grid">{cells.map((day, index) => {
                if (day === null) return <span key={`empty-${index}`}/>;
                const key = dateKey(new Date(year, monthIndex, day));
                const hasLists = listsByDate.has(key);
                return <button key={key} className={selectedDate === key ? "selected" : ""}
                    aria-label={`${day} de ${month.toLocaleDateString("es-SV", {month: "long"})}${hasLists ? ", con listas guardadas" : ""}`}
                    onClick={() => onDateChange(key)}>
                    <span>{day}</span>{hasLists && <i aria-hidden="true"/>}
                </button>;
            })}</div>
        </div>
        <aside className="purchase-calendar-orders">
            <header><span>Órdenes del día</span><strong>{new Date(`${selectedDate}T12:00:00`).toLocaleDateString("es-SV", {
                dateStyle: "long",
            })}</strong></header>
            {selectedLists.length
                ? <PurchaseHistoryList lists={selectedLists} expandedLists={expandedLists}
                    onToggle={onToggle} onReceive={onReceive} compact/>
                : <div className="purchase-calendar-empty"><CalendarDays size={21}/>
                    <span>No hay listas guardadas este día.</span></div>}
        </aside>
    </div>;
}

function ReceivePurchaseDialog({list, saving, onClose, onConfirm}) {
    const [received, setReceived] = useState(() => Object.fromEntries(list.items.map((item) => [
        item.item_id,
        String(Number(item.quantity_ordered)),
    ])));
    const receivedItems = list.items.map((item) => ({
        itemId: item.item_id,
        quantityReceived: Number(received[item.item_id]),
    }));
    const valid = list.items.every((item) => received[item.item_id] !== ""
        && Number.isFinite(Number(received[item.item_id]))
        && Number(received[item.item_id]) >= 0);
    const missingCount = list.items.filter((item) =>
        Number(received[item.item_id]) < Number(item.quantity_ordered)).length;

    function setQuantity(item, value) {
        if (value === "" || /^\d*(\.\d{0,3})?$/.test(value)) {
            setReceived((current) => ({...current, [item.item_id]: value}));
        }
    }

    function changeBy(item, amount) {
        const current = Number(received[item.item_id]) || 0;
        setQuantity(item, String(Number(Math.max(0, current + amount).toFixed(3))));
    }

    return <div className="modal-backdrop receive-purchase-backdrop" onMouseDown={onClose}>
        <section className="modal receive-purchase-dialog" role="dialog" aria-modal="true"
            aria-label="Revisar recepción" onMouseDown={(event) => event.stopPropagation()}>
            <header className="receive-purchase-heading">
                <div className="receive-purchase-icon"><PackageCheck size={24}/></div>
                <div><span className="eyebrow">REVISAR RECEPCIÓN</span>
                    <h2>Compara lo ordenado con lo recibido</h2>
                </div>
            </header>
            <div className="receive-purchase-summary">
                <span><strong>{list.item_count}</strong> {list.item_count === 1 ? "ingrediente ordenado" : "ingredientes ordenados"}</span>
                <span className={missingCount ? "has-missing" : "is-complete"}>
                    {missingCount ? `${missingCount} ${missingCount === 1 ? "con diferencia" : "con diferencias"}` : "Entrega completa"}
                </span>
            </div>
            <div className="table-wrap receive-purchase-table"><table><thead><tr>
                <th>Ingrediente</th><th>Proveedor</th><th>Ordenado</th><th>Recibido</th><th>Resultado</th>
            </tr></thead><tbody>{list.items.map((item) => {
                const ordered = Number(item.quantity_ordered);
                const receivedQuantity = Number(received[item.item_id]);
                const difference = receivedQuantity - ordered;
                return <tr key={item.item_id} className={difference < 0 ? "has-missing" : ""}>
                    <td><strong>{item.item_name}</strong><small>{item.base_unit}</small></td>
                    <td>{item.supplier_name}</td>
                    <td>{ordered.toLocaleString("es-SV")} {quantityUnitLabel(item.base_unit, ordered)}</td>
                    <td><div className="receive-quantity-field">
                        <button type="button" onClick={() => changeBy(item, -1)}
                            disabled={saving || receivedQuantity <= 0}
                            aria-label={`Disminuir cantidad recibida de ${item.item_name}`}><Minus size={14}/></button>
                        <input type="text" inputMode="decimal" value={received[item.item_id]}
                            disabled={saving} aria-label={`Cantidad recibida de ${item.item_name}`}
                            onChange={(event) => setQuantity(item, event.target.value)}/>
                        <button type="button" onClick={() => changeBy(item, 1)} disabled={saving}
                            aria-label={`Aumentar cantidad recibida de ${item.item_name}`}><Plus size={14}/></button>
                        <span>{quantityUnitLabel(item.base_unit, receivedQuantity)}</span>
                    </div></td>
                    <td>{difference === 0
                        ? <span className="receipt-result complete">Completo</span>
                        : difference < 0
                            ? <span className="receipt-result missing">Faltan {Math.abs(difference).toLocaleString("es-SV")}</span>
                            : <span className="receipt-result extra">Extra {difference.toLocaleString("es-SV")}</span>}</td>
                </tr>;
            })}</tbody></table></div>
            <footer className="receive-purchase-actions">
                <p>Solo las cantidades recibidas se agregarán al inventario. Esta recepción no puede repetirse.</p>
                <div>
                <button className="secondary-btn" onClick={onClose} disabled={saving}>Cancelar</button>
                <button className="primary-btn" onClick={() => onConfirm(receivedItems)}
                    disabled={saving || !valid}>
                    <PackageCheck size={16}/>{saving ? "Confirmando…" : "Confirmar recepción"}
                </button>
                </div>
            </footer>
        </section>
    </div>;
}
