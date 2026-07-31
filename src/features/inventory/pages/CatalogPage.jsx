import {lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState} from "react";
import {
    AlertTriangle,
    ArchiveRestore,
    ArrowUpDown,
    Boxes,
    Building2,
    Check,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    ChevronsDownUp,
    ChevronsUpDown,
    CircleOff,
    Download,
    Eye,
    FilterX,
    Layers3,
    Maximize2,
    Minus,
    Minimize2,
    Pencil,
    Plus,
    RefreshCw,
    Search,
    Shapes,
    Smile,
    X,
} from "lucide-react";
import {useAuth} from "../../auth/AuthProvider";
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from "../../../components/ui/sheet";
import {Badge} from "../../../components/ui/badge";
import {Button} from "../../../components/ui/button";
import {DataTable} from "../../../components/ui/data-table";
import {InputGroup, InputGroupAddon, InputGroupInput} from "../../../components/ui/input-group";
import {Popover, PopoverContent, PopoverTrigger} from "../../../components/ui/popover";
import {
    Menubar,
    MenubarContent,
    MenubarLabel,
    MenubarMenu,
    MenubarRadioGroup,
    MenubarRadioItem,
    MenubarSeparator,
    MenubarTrigger,
} from "../../../components/ui/menubar";
import {
    setInventoryExistences,
    loadCatalog,
    saveCatalogItem,
    saveSupplier,
    setCatalogItemActive,
    setCatalogItemIcon,
    setSupplierActive,
} from "../api/catalogRepository";
import {
    groupCatalogItems,
    matchesCatalogItem,
    quantityUnitLabel,
    sortCatalogItems,
    stockStatus,
    UNIT_OPTIONS,
} from "../catalogModel";
import {
    availableInventoryCsvColumns,
    defaultInventoryExportName,
    DEFAULT_INVENTORY_CSV_COLUMN_KEYS,
    downloadInventoryCsv,
} from "../inventoryCsv";
import {
    IngredientIcon,
    INGREDIENT_ICON_OPTIONS,
    ingredientIconOption,
    searchIngredientIcons,
} from "../ingredientIcons";

const money = new Intl.NumberFormat("es-SV", {style: "currency", currency: "USD"});
const EmojiPicker = lazy(() => import("emoji-picker-react"));
const emptyItem = {
    id: null,
    name: "",
    sku: "",
    departmentId: "",
    supplierId: "",
    baseUnit: "unidad",
    parLevel: "0",
    reorderPoint: "0",
    unitCost: "0",
    iconKey: "",
    iconEmoji: "",
    active: true,
};
const emptySupplier = {id: null, name: "", email: "", phone: "", active: true};

function errorMessage(error) {
    if (error?.code === "ICON_FIELD_UNAVAILABLE") {
        return "La selección de íconos estará disponible al aplicar la actualización segura de la base de datos.";
    }
    if (error?.code === "23505") return "Ese nombre o SKU ya existe en el catálogo.";
    if (error?.code === "42501") return "Tu sesión no tiene permiso para registrar esta actualización.";
    if (error?.code === "PGRST202" || error?.code === "42883") {
        return "La actualización de inventario aún no está habilitada en la base de datos.";
    }
    if (error?.code === "22023") return "Una de las cantidades o ingredientes no es válida.";
    if (error?.code === "23514") return "La existencia de un ingrediente no puede quedar por debajo de cero.";
    if (error?.code === "P0002") return "Uno de los ingredientes ya no está activo o disponible.";
    return "No pudimos completar la operación. Intenta nuevamente.";
}

export default function CatalogPage() {
    const {role} = useAuth();
    const isAdmin = role === "admin";
    const [catalog, setCatalog] = useState({
        items: [], departments: [], suppliers: [], iconFieldAvailable: true, emojiFieldAvailable: true,
    });
    const [tab, setTab] = useState("items");
    const [query, setQuery] = useState("");
    const [departmentId, setDepartmentId] = useState("");
    const [supplierId, setSupplierId] = useState("");
    const [stockFilter, setStockFilter] = useState("all");
    const [groupBy, setGroupBy] = useState("none");
    const [sortBy, setSortBy] = useState("name");
    const [collapsedGroups, setCollapsedGroups] = useState(() => new Set());
    const [includeInactive, setIncludeInactive] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [itemDraft, setItemDraft] = useState(null);
    const [supplierDraft, setSupplierDraft] = useState(null);
    const [exportOpen, setExportOpen] = useState(false);
    const [existenceOpen, setExistenceOpen] = useState(false);
    const [tableExpanded, setTableExpanded] = useState(false);
    const [savingIconIds, setSavingIconIds] = useState(() => new Set());

    const refresh = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            setCatalog(await loadCatalog());
        } catch (nextError) {
            setError(errorMessage(nextError));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    useEffect(() => {
        if (!tableExpanded) return undefined;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        function collapseOnEscape(event) {
            if (event.key === "Escape") setTableExpanded(false);
        }
        window.addEventListener("keydown", collapseOnEscape);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener("keydown", collapseOnEscape);
        };
    }, [tableExpanded]);

    const scopedItems = useMemo(
        () => catalog.items.filter((item) => matchesCatalogItem(item, query, departmentId, includeInactive, supplierId)),
        [catalog.items, departmentId, includeInactive, query, supplierId],
    );
    const statusCounts = useMemo(() => scopedItems.reduce((counts, item) => {
        const key = stockStatus(item).key;
        return {...counts, [key]: (counts[key] ?? 0) + 1};
    }, {critical: 0, low: 0, healthy: 0, neutral: 0}), [scopedItems]);
    const items = useMemo(() => sortCatalogItems(
        stockFilter === "all" ? scopedItems : scopedItems.filter((item) => stockStatus(item).key === stockFilter),
        sortBy,
    ), [scopedItems, sortBy, stockFilter]);
    const itemGroups = useMemo(() => groupCatalogItems(items, groupBy), [groupBy, items]);
    const allGroupsExpanded = groupBy !== "none" && itemGroups.length > 0
        && itemGroups.every((group) => !collapsedGroups.has(group.key));
    const suppliers = useMemo(() => {
        const normalized = query.trim().toLocaleLowerCase("es");
        return catalog.suppliers.filter((supplier) => (
            (includeInactive || supplier.active)
            && (!normalized || [supplier.name, supplier.email, supplier.phone]
                .some((value) => String(value ?? "").toLocaleLowerCase("es").includes(normalized)))
        ));
    }, [catalog.suppliers, includeInactive, query]);
    const critical = catalog.items.filter((item) => item.active && stockStatus(item).key === "critical").length;
    const hasItemFilters = Boolean(query || departmentId || supplierId || stockFilter !== "all" || includeInactive);

    function resetItemFilters() {
        setQuery("");
        setDepartmentId("");
        setSupplierId("");
        setStockFilter("all");
        setIncludeInactive(false);
    }

    function toggleGroup(key) {
        setCollapsedGroups((current) => {
            const next = new Set(current);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    }

    function toggleAllGroups() {
        setCollapsedGroups(allGroupsExpanded
            ? new Set(itemGroups.map((group) => group.key))
            : new Set());
    }

    function editItem(item) {
        setItemDraft({
            id: item.id,
            name: item.name,
            sku: item.sku ?? "",
            departmentId: item.department?.id ?? "",
            supplierId: item.supplier?.id ?? "",
            baseUnit: item.base_unit,
            parLevel: String(item.par_level),
            reorderPoint: String(item.reorder_point),
            unitCost: String(item.unit_cost),
            iconKey: item.icon_key ?? "",
            iconEmoji: item.icon_emoji ?? "",
            active: item.active,
        });
    }

    async function toggleItem(item) {
        try {
            await setCatalogItemActive(item.id, !item.active);
            await refresh();
        } catch (nextError) {
            setError(errorMessage(nextError));
        }
    }

    async function updateItemIcon(item, nextIcon) {
        if (savingIconIds.has(item.id)) return;
        setError("");
        setSavingIconIds((current) => new Set(current).add(item.id));
        try {
            await setCatalogItemIcon(item.id, nextIcon);
            setCatalog((current) => ({
                ...current,
                items: current.items.map((currentItem) => currentItem.id === item.id ? {
                    ...currentItem,
                    icon_key: nextIcon.iconKey || null,
                    icon_emoji: nextIcon.iconEmoji || null,
                } : currentItem),
            }));
        } catch (nextError) {
            setError(errorMessage(nextError));
        } finally {
            setSavingIconIds((current) => {
                const next = new Set(current);
                next.delete(item.id);
                return next;
            });
        }
    }

    async function toggleSupplier(supplier) {
        try {
            await setSupplierActive(supplier.id, !supplier.active);
            await refresh();
        } catch (nextError) {
            setError(errorMessage(nextError));
        }
    }

    return <>
        <section className="catalog-heading">
            <div><h2>Ingredientes y proveedores</h2></div>
            <div className="catalog-heading-actions">
                {tab === "items" && <button className="primary-btn existence-entry-button"
                                            onClick={() => setExistenceOpen(true)} disabled={loading}>
                    <RefreshCw size={17}/><span>Actualizar existencias</span>
                </button>}
            </div>
        </section>

        <div className="catalog-stats">
            <div><Boxes size={20}/><span><strong>{catalog.items.filter((item) => item.active).length}</strong> productos activos</span>
            </div>
            <div><CircleOff size={20}/><span><strong>{critical}</strong> bajo punto de reorden</span></div>
            <div><Building2
                size={20}/><span><strong>{catalog.suppliers.filter((supplier) => supplier.active).length}</strong> proveedores</span>
            </div>
        </div>

        <div className={`panel page-panel catalog-panel ${tableExpanded ? "is-table-expanded" : ""}`}>
            <div className="catalog-panel-head">
                <div className="catalog-tabs">
                    <button className={tab === "items" ? "active" : ""} onClick={() => {
                        setTab("items");
                        setQuery("");
                    }}>Ingredientes
                    </button>
                    <button className={tab === "suppliers" ? "active" : ""} onClick={() => {
                        setTab("suppliers");
                        setQuery("");
                    }}>Proveedores
                    </button>
                </div>
                <div className="catalog-panel-actions">
                    {isAdmin && tab === "suppliers" && <button className="primary-btn catalog-create-button"
                        onClick={() => setSupplierDraft({...emptySupplier})}>
                        <Plus size={17}/> Proveedor</button>}
                    <button type="button" className="catalog-expand-button"
                        aria-pressed={tableExpanded}
                        aria-label={tableExpanded ? "Restaurar vista de tabla" : "Expandir tabla"}
                        title={tableExpanded ? "Restaurar vista" : "Expandir tabla"}
                        onClick={() => setTableExpanded((current) => !current)}>
                        {tableExpanded ? <Minimize2 size={16}/> : <Maximize2 size={16}/>}
                        <span>{tableExpanded ? "Restaurar" : "Expandir"}</span>
                    </button>
                </div>
            </div>
            {isAdmin && tab === "items" && <div className="catalog-item-create-row">
                <button className="primary-btn catalog-create-button" onClick={() => setItemDraft({...emptyItem})}>
                    <Plus size={17}/> Ingrediente
                </button>
            </div>}
            <div className="catalog-data-toolbar">
                <InputGroup className="search-box"><InputGroupInput value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    aria-label={`Buscar ${tab === "items" ? "ingrediente" : "proveedor"}`}
                    placeholder={`Buscar ${tab === "items" ? "ingrediente" : "proveedor"}…`}/>
                    <InputGroupAddon><Search size={18}/></InputGroupAddon>
                </InputGroup>
                {tab === "items" ? <InventoryMenubar
                    departments={catalog.departments}
                    suppliers={catalog.suppliers.filter((supplier) => supplier.active)}
                    departmentId={departmentId} onDepartmentChange={setDepartmentId}
                    supplierId={supplierId} onSupplierChange={setSupplierId}
                    groupBy={groupBy} onGroupChange={(value) => {
                        setGroupBy(value);
                        setCollapsedGroups(new Set());
                    }}
                    sortBy={sortBy} onSortChange={setSortBy}
                    stockFilter={stockFilter} onStockFilterChange={setStockFilter}
                    includeInactive={includeInactive} onIncludeInactiveChange={setIncludeInactive}
                    statusCounts={statusCounts} totalCount={scopedItems.length}/>
                    : <label className="modern-switch catalog-inactive-toggle"><input type="checkbox"
                        checked={includeInactive} onChange={(event) => setIncludeInactive(event.target.checked)}/>
                        <span className="switch-track"><i/></span><span>Inactivos</span></label>}
                {tab === "items" && hasItemFilters && <Button variant="ghost" size="sm"
                    className="reset-filters" onClick={resetItemFilters}><FilterX size={15}/>Limpiar</Button>}
            </div>

            {tab === "items" && <div className="inventory-results-bar">
                <span> <strong>{items.length}</strong> de {catalog.items.filter((item) => item.active || includeInactive).length} ingredientes</span>
                <div>{groupBy !== "none" && itemGroups.length > 0 && <button
                    className="inventory-groups-toggle" onClick={toggleAllGroups}
                    aria-label={allGroupsExpanded ? "Contraer todos los grupos" : "Expandir todos los grupos"}>
                    {allGroupsExpanded ? <ChevronsDownUp size={15}/> : <ChevronsUpDown size={15}/>}
                    {allGroupsExpanded ? "Contraer todo" : "Expandir todo"}
                </button>}
                <button className="inventory-export-button" disabled={loading || items.length === 0}
                        onClick={() => setExportOpen(true)}
                        title="Descargar los resultados visibles con la agrupación y el orden actuales">
                    <Download size={15}/><span>Exportar CSV</span><b>{items.length}</b>
                </button></div>
            </div>}

            {error && <div className="catalog-message error">{error}
                <button onClick={refresh}>Reintentar</button>
            </div>}
            {loading ? <div className="catalog-empty">
                <div className="state-spinner"/>
                <p>Cargando catálogo seguro…</p></div> : tab === "items" ? (
                <div className="inventory-table-stage"><ItemsExplorer
                    groups={itemGroups} groupBy={groupBy} collapsedGroups={collapsedGroups} onToggleGroup={toggleGroup}
                    isAdmin={isAdmin} onEdit={editItem} onToggle={toggleItem}
                    iconFieldAvailable={catalog.iconFieldAvailable}
                    emojiFieldAvailable={catalog.emojiFieldAvailable}
                    savingIconIds={savingIconIds} onIconChange={updateItemIcon}/></div>
            ) : (
                <SuppliersTable suppliers={suppliers} isAdmin={isAdmin} onEdit={(supplier) => setSupplierDraft({
                    ...supplier,
                    email: supplier.email ?? "",
                    phone: supplier.phone ?? ""
                })} onToggle={toggleSupplier}/>
            )}
        </div>

        {itemDraft && <ItemDialog draft={itemDraft} departments={catalog.departments} suppliers={catalog.suppliers}
                                  iconFieldAvailable={catalog.iconFieldAvailable}
                                  emojiFieldAvailable={catalog.emojiFieldAvailable}
                                  onClose={() => setItemDraft(null)} onSaved={async () => {
            setItemDraft(null);
            await refresh();
        }}/>}
        {supplierDraft && (
            <SupplierDialog draft={supplierDraft} onClose={() => setSupplierDraft(null)} onSaved={async () => {
                setSupplierDraft(null);
                await refresh();
            }}/>
        )}
        {exportOpen && (
            <InventoryExportDialog groups={itemGroups} groupBy={groupBy} itemCount={items.length}
                                   onClose={() => setExportOpen(false)}/>
        )}
        {existenceOpen && (
            <ExistenceEntryDialog catalog={catalog} onClose={() => setExistenceOpen(false)}
                                  onSaved={async () => {
                                      setExistenceOpen(false);
                                      await refresh();
                                  }}/>
        )}
    </>;
}

function ExistenceEntryDialog({catalog, onClose, onSaved}) {
    const [stage, setStage] = useState("entry");
    const [query, setQuery] = useState("");
    const [departmentId, setDepartmentId] = useState("");
    const [groupBy, setGroupBy] = useState("department");
    const [quantities, setQuantities] = useState({});
    const [notes, setNotes] = useState({});
    const [collapsedGroups, setCollapsedGroups] = useState(() => new Set());
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [discardOpen, setDiscardOpen] = useState(false);

    const visibleItems = useMemo(() => catalog.items
        .filter((item) => item.active)
        .filter((item) => matchesCatalogItem(item, query, departmentId, false)), [catalog.items, departmentId, query]);
    const groups = useMemo(() => groupCatalogItems(sortCatalogItems(visibleItems, "name"), groupBy),
        [groupBy, visibleItems]);
    const editedItems = useMemo(() => catalog.items
        .filter((item) => Object.hasOwn(quantities, item.id)
            && quantities[item.id] !== ""
            && Number.isFinite(Number(quantities[item.id]))
            && Number(quantities[item.id]) !== Number(item.quantity))
        .map((item) => ({
            ...item,
            newQuantity: Number(quantities[item.id]),
            note: notes[item.id]?.trim() || "",
        })), [catalog.items, notes, quantities]);
    const hasQuantityDraft = catalog.items.some((item) => Object.hasOwn(quantities, item.id)
        && quantities[item.id] !== String(Number(item.quantity)));
    const hasDraftChanges = hasQuantityDraft
        || Object.values(notes).some((note) => note.trim().length > 0);

    function setQuantity(item, value) {
        if (value === "" || /^\d*(\.\d{0,3})?$/.test(value)) {
            setQuantities((current) => ({...current, [item.id]: value}));
        }
    }

    function setNote(id, value) {
        setNotes((current) => ({...current, [id]: value.slice(0, 500)}));
    }

    function toggleGroup(key) {
        setCollapsedGroups((current) => {
            const next = new Set(current);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    }

    async function confirm() {
        setSaving(true);
        setError("");
        try {
            await setInventoryExistences(editedItems);
            await onSaved();
        } catch (nextError) {
            setError(errorMessage(nextError));
            setSaving(false);
        }
    }

    function requestClose() {

        if (hasDraftChanges) setDiscardOpen(true);
        else onClose();
    }


    return <>
    <div className="modal-backdrop existence-backdrop" onMouseDown={requestClose}>
        <section className="modal existence-dialog" onMouseDown={(event) => event.stopPropagation()}
                 aria-label="Actualizar existencias">
            <div className="existence-dialog-head">
                <h2>{stage === "entry" ? "Actualizar existencias" : "Revisar actualizaciones"}</h2>
                <div className="existence-steps" aria-label="Progreso">
                    <span className="active"><i>{stage === "review" ? <Check size={12}/> : "1"}</i>Ingresar</span>
                    <b/>
                    <span className={stage === "review" ? "active" : ""}><i>2</i>Revisar</span>
                </div>
            </div>

            {stage === "entry" ? <>
                <div className="existence-tools">
                    <InputGroup className="search-box"><InputGroupInput value={query}
                        onChange={(event) => setQuery(event.target.value)} aria-label="Buscar ingrediente"
                        placeholder="Buscar ingrediente…"/>
                        <InputGroupAddon><Search size={18}/></InputGroupAddon>
                    </InputGroup>
                    <ViewSelect icon={Boxes} label="Departamento" value={departmentId} onChange={setDepartmentId}
                        options={[{value: "", label: "Todos"}, ...catalog.departments.map((department) => ({
                            value: department.id, label: department.name
                        }))]}/>
                    <ViewSelect icon={Layers3} label="Agrupación" value={groupBy} onChange={(value) => {
                        setGroupBy(value);
                        setCollapsedGroups(new Set());
                    }} options={[{value: "department", label: "Por departamento"},
                        {value: "supplier", label: "Por proveedor"}, {value: "none", label: "Sin agrupar"}]}/>
                </div>
                <div className="existence-table-stage">
                    {!visibleItems.length ? <div className="catalog-empty"><Boxes size={28}/><h3>No hay ingredientes</h3>
                        <p>Ajusta la búsqueda o el departamento.</p></div> : groups.map((group) => {
                        const grouped = groupBy !== "none";
                        const collapsed = collapsedGroups.has(group.key);
                        return <section className={`existence-group ${collapsed ? "is-collapsed" : ""}`} key={group.key}>
                            {grouped && <button className="inventory-group-head" onClick={() => toggleGroup(group.key)}
                                aria-expanded={!collapsed}>
                                <span className="group-chevron">{collapsed ? <ChevronRight size={18}/> : <ChevronDown size={18}/>}</span>
                                <span className="inventory-group-identity"><small>Grupo</small><strong>{group.label}</strong></span>
                                <span className="inventory-group-summary">{group.items.length} ingredientes</span>
                            </button>}
                            {!collapsed && <ExistenceTable items={group.items} quantities={quantities} notes={notes}
                                onQuantity={setQuantity} onNote={setNote}/>}
                        </section>;
                    })}
                </div>
            </> : <div className="existence-review">
                <div className="table-wrap">
                    <table><thead><tr><th>Ingrediente</th><th>Existencia anterior</th>
                    <th>Nueva existencia</th><th>Cambio</th><th>Nota</th></tr></thead>
                    <tbody>{editedItems.map((item) => <tr key={item.id}><td><strong>{item.name}</strong>
                        <small className="review-sku">{item.sku || "Sin SKU"}</small></td>
                        <td>{Number(item.quantity).toLocaleString("es-SV")} {quantityUnitLabel(item.base_unit, item.quantity)}</td>
                        <td><strong>{item.newQuantity.toLocaleString("es-SV")} {quantityUnitLabel(item.base_unit, item.newQuantity)}</strong></td>
                        <td><span className={item.newQuantity > Number(item.quantity) ? "addition-pill" : "subtraction-pill"}>
                            {item.newQuantity > Number(item.quantity) ? "+" : ""}
                            {(item.newQuantity - Number(item.quantity)).toLocaleString("es-SV")} {quantityUnitLabel(item.base_unit, Math.abs(item.newQuantity - Number(item.quantity)))}
                        </span></td>
                        <td className="adjustment-note-review">{item.note || "Sin nota"}</td>
                    </tr>)}</tbody></table></div>
            </div>}

            {error && <div className="catalog-message error">{error}</div>}
            <footer className="existence-dialog-footer">
                <span>{editedItems.length ? <><strong>{editedItems.length}</strong> editados</> : "Aún no hay cambios"}</span>
                <div>
                    <button type="button" className="secondary-btn" onClick={stage === "review" ? () => setStage("entry") : requestClose}>
                        {stage === "review" ? "Volver" : "Cancelar"}</button>
                    <button type="button" className="primary-btn" disabled={!editedItems.length || saving}
                        onClick={stage === "entry" ? () => setStage("review") : confirm}>
                        {saving ? "Guardando…" : stage === "entry" ? <>Continuar <ChevronRight size={16}/></> : <><Check size={16}/>Confirmar y guardar</>}
                    </button>
                </div>
            </footer>
        </section>
    </div>
    {discardOpen && <div className="modal-backdrop discard-warning-backdrop"
                         onMouseDown={() => setDiscardOpen(false)}>
        <section className="modal discard-warning-dialog" role="alertdialog" aria-modal="true"
                 aria-labelledby="discard-warning-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="discard-warning-icon"><AlertTriangle size={23}/></div>
            <span className="eyebrow">CAMBIOS SIN GUARDAR</span>
            <h2 id="discard-warning-title">¿Salir sin guardar?</h2>
            <p>Tienes cambios en esta actualización de inventario.
                Si sales ahora, las cantidades y sus notas no se guardarán.</p>
            <div className="discard-warning-actions">
                <button type="button" className="secondary-btn" onClick={() => setDiscardOpen(false)}>
                    Seguir editando</button>
                <button type="button" className="danger-btn" onClick={onClose}>Descartar cambios</button>
            </div>
        </section>
    </div>}
    </>;
}

function ExistenceTable({items, quantities, notes, onQuantity, onNote}) {
    function addOne(item) {
        const current = Number(quantities[item.id] ?? item.quantity);
        onQuantity(item, String(Number((current + 1).toFixed(3))));
    }

    function removeOne(item) {
        const current = Number(quantities[item.id] ?? item.quantity);
        const next = Math.max(0, current - 1);
        onQuantity(item, String(Number(next.toFixed(3))));
    }

    return <div className="table-wrap existence-table"><table><thead><tr><th>Ingrediente</th><th>Existencia</th>
        <th>Unidad</th><th>Nueva existencia</th><th>Nota opcional</th></tr></thead><tbody>{items.map((item) => {
        const value = quantities[item.id] ?? String(Number(item.quantity));
        const quantity = value === "" ? Number.NaN : Number(value);
        const changed = Number.isFinite(quantity) && quantity !== Number(item.quantity);
        return <tr key={item.id} className={changed ? "edited-row" : ""}>
            <td><div className="product-cell"><div className="food-icon"><IngredientIcon iconKey={item.icon_key}
                iconEmoji={item.icon_emoji} size={17}/></div><div>
                <strong>{item.name}</strong><span>{item.sku || "Sin SKU"}</span></div></div></td>
            <td><strong>{Number(item.quantity).toLocaleString("es-SV")}</strong></td>
            <td>{quantityUnitLabel(item.base_unit, item.quantity)}</td>
            <td><div className="increment-field"><span className="increment-controls">
                <button type="button" className="increment-prefix" onClick={() => addOne(item)}
                    aria-label={`Aumentar una unidad de ${item.name}`} title="Aumentar 1"><Plus size={15}/></button>
                <button type="button" className="increment-prefix" onClick={() => removeOne(item)}
                    aria-label={`Disminuir una unidad de ${item.name}`} title="Disminuir 1"
                    disabled={!Number.isFinite(quantity) || quantity <= 0}><Minus size={15}/></button>
                </span><input type="text" inputMode="decimal"
                aria-label={`Nueva existencia de ${item.name}`} placeholder="0" value={value}
                onChange={(event) => onQuantity(item, event.target.value)}/><span className="increment-unit">
                    {quantityUnitLabel(item.base_unit, Number.isFinite(quantity) ? quantity : item.quantity)}
                </span></div></td>
            <td><input className="adjustment-note-input" type="text" maxLength="500"
                aria-label={`Nota de ${item.name}`} placeholder="Motivo o referencia…"
                value={notes[item.id] ?? ""} onChange={(event) => onNote(item.id, event.target.value)}/></td>
        </tr>;
    })}</tbody></table></div>;
}

function InventoryExportDialog({groups, groupBy, itemCount, onClose}) {
    const columns = availableInventoryCsvColumns(groupBy);
    const defaultKeys = groupBy === "none"
        ? DEFAULT_INVENTORY_CSV_COLUMN_KEYS
        : ["group", ...DEFAULT_INVENTORY_CSV_COLUMN_KEYS];
    const [filename, setFilename] = useState(defaultInventoryExportName);
    const [columnKeys, setColumnKeys] = useState(defaultKeys);
    const allSelected = columnKeys.length === columns.length;

    function toggleColumn(key) {
        setColumnKeys((current) => current.includes(key)
            ? current.filter((columnKey) => columnKey !== key)
            : [...current, key]);
    }

    function submit(event) {
        event.preventDefault();
        if (!filename.trim() || columnKeys.length === 0) return;
        downloadInventoryCsv(groups, {groupBy, columnKeys, filename});
        onClose();
    }

    return <div className="modal-backdrop" onMouseDown={onClose}>
        <form className="modal catalog-dialog inventory-export-dialog" onMouseDown={(event) => event.stopPropagation()}
              onSubmit={submit}>
            <button type="button" className="icon-btn modal-close" onClick={onClose} aria-label="Cerrar exportación"><X size={18}/></button>
            <span className="eyebrow">EXPORTAR INVENTARIO</span><h2>Personaliza tu archivo CSV</h2>
            <p>Se exportarán {itemCount} {itemCount === 1 ? "ingrediente" : "ingredientes"} respetando los filtros, la agrupación y el orden actuales.</p>
            <label className="catalog-field wide export-filename-field"><span>Nombre del archivo</span>
                <div><input required value={filename} maxLength={100} onChange={(event) => setFilename(event.target.value)}
                            aria-label="Nombre del archivo"/><b>.csv</b></div>
            </label>
            <fieldset className="export-columns-fieldset">
                <legend>Columnas a incluir</legend><button type="button" className="export-columns-toggle"
                    onClick={() => setColumnKeys(allSelected ? [] : columns.map((column) => column.key))}>
                    {allSelected ? "Limpiar" : "Seleccionar todas"}</button>
                <div className="export-columns-grid">{columns.map((column) => <label key={column.key}
                    className={columnKeys.includes(column.key) ? "selected" : ""}>
                    <input type="checkbox" checked={columnKeys.includes(column.key)}
                           onChange={() => toggleColumn(column.key)}/><span>{column.label}</span>
                </label>)}</div>
            </fieldset>
            <div className="export-dialog-summary"><Download size={16}/><span><strong>{columnKeys.length}</strong> columnas · <strong>{itemCount}</strong> filas</span></div>
            <div className="dialog-actions">
                <button type="button" className="secondary-btn" onClick={onClose}>Cancelar</button>
                <button className="primary-btn" disabled={!filename.trim() || columnKeys.length === 0}><Download size={16}/>Descargar CSV</button>
            </div>
        </form>
    </div>;
}

function ViewSelect({icon: Icon, label, value, onChange, options}) {
    const selected = options.find((option) => option.value === value)?.label ?? options[0]?.label;
    return <label className="smart-view-select"><Icon size={16}/><span><small>{label}</small><strong>{selected}</strong></span><ChevronDown
        size={14}/><select aria-label={label} value={value}
                           onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option
        key={`${label}-${option.value}`} value={option.value}>{option.label}</option>)}</select></label>;
}

function InventoryMenubar({
    departments,
    suppliers,
    departmentId,
    onDepartmentChange,
    supplierId,
    onSupplierChange,
    groupBy,
    onGroupChange,
    sortBy,
    onSortChange,
    stockFilter,
    onStockFilterChange,
    includeInactive,
    onIncludeInactiveChange,
    statusCounts,
    totalCount,
}) {
    const departmentOptions = [{value: "", label: "Todos"}, ...departments.map((department) => ({
        value: department.id,
        label: department.name,
    }))];
    const supplierOptions = [{value: "", label: "Todos"}, ...suppliers.map((supplier) => ({
        value: supplier.id,
        label: supplier.name,
    }))];
    const groupOptions = [
        {value: "none", label: "Sin agrupar"},
        {value: "department", label: "Departamento"},
        {value: "supplier", label: "Proveedor"},
    ];
    const sortOptions = [
        {value: "name", label: "Nombre"},
        {value: "stock-asc", label: "Menor existencia"},
        {value: "stock-desc", label: "Mayor existencia"},
        {value: "status", label: "Prioridad"},
    ];
    const statusOptions = [
        {value: "all", label: "Todos", count: totalCount},
        {value: "critical", label: "Críticos", count: statusCounts.critical},
        {value: "low", label: "Bajos", count: statusCounts.low},
        {value: "healthy", label: "Saludables", count: statusCounts.healthy},
        {value: "neutral", label: "Sin referencia", count: statusCounts.neutral},
    ];
    const visibilityOptions = [
        {value: "active", label: "Solo activos"},
        {value: "all", label: "Incluir desactivados"},
    ];
    const labelFor = (options, value) => options.find((option) => option.value === value)?.label;

    function RadioMenu({icon: Icon, label, value, options, onValueChange}) {
        return <MenubarMenu>
            <MenubarTrigger aria-label={label}><Icon size={15}/>
                <span className="catalog-menubar-trigger-copy">
                    <span>{label}</span>
                    <strong>{labelFor(options, value)}</strong>
                </span>
            </MenubarTrigger>
            <MenubarContent>
                <MenubarLabel>{label}</MenubarLabel>
                <MenubarRadioGroup value={value} onValueChange={onValueChange}>
                    {options.map((option) => <MenubarRadioItem key={`${label}-${option.value}`}
                        value={option.value} closeOnClick>
                        <span>{option.label}</span>
                        {option.count !== undefined && <span className="ui-menubar-count">{option.count}</span>}
                    </MenubarRadioItem>)}
                </MenubarRadioGroup>
            </MenubarContent>
        </MenubarMenu>;
    }

    return <Menubar aria-label="Opciones de tabla">
        <RadioMenu icon={Boxes} label="Departamento" value={departmentId}
            options={departmentOptions} onValueChange={onDepartmentChange}/>
        <RadioMenu icon={Building2} label="Proveedor" value={supplierId}
            options={supplierOptions} onValueChange={onSupplierChange}/>
        <RadioMenu icon={Layers3} label="Agrupación" value={groupBy}
            options={groupOptions} onValueChange={onGroupChange}/>
        <RadioMenu icon={ArrowUpDown} label="Orden" value={sortBy}
            options={sortOptions} onValueChange={onSortChange}/>
        <RadioMenu icon={AlertTriangle} label="Estado" value={stockFilter}
            options={statusOptions} onValueChange={onStockFilterChange}/>
        <RadioMenu icon={Eye} label="Visibilidad" value={includeInactive ? "all" : "active"}
            options={visibilityOptions}
            onValueChange={(value) => onIncludeInactiveChange(value === "all")}/>
    </Menubar>;
}

function ItemsExplorer({
    groups,
    groupBy,
    collapsedGroups,
    onToggleGroup,
    isAdmin,
    onEdit,
    onToggle,
    iconFieldAvailable,
    emojiFieldAvailable,
    savingIconIds,
    onIconChange,
}) {
    const itemCount = groups.reduce((total, group) => total + group.items.length, 0);
    if (!itemCount) return <div className="catalog-empty"><Boxes size={28}/><h3>No hay ingredientes para mostrar</h3>
        <p>Ajusta la búsqueda o los filtros.</p></div>;
    if (groupBy === "none") return <ItemsTable items={groups[0].items} isAdmin={isAdmin} onEdit={onEdit}
        onToggle={onToggle} iconFieldAvailable={iconFieldAvailable} emojiFieldAvailable={emojiFieldAvailable}
        savingIconIds={savingIconIds} onIconChange={onIconChange}/>;
    return <div className="inventory-groups">{groups.map((group) => (
        <InventoryGroup key={group.key} group={group} collapsed={collapsedGroups.has(group.key)}
                        onToggle={() => onToggleGroup(group.key)} isAdmin={isAdmin} onEdit={onEdit}
                        onItemToggle={onToggle} iconFieldAvailable={iconFieldAvailable}
                        emojiFieldAvailable={emojiFieldAvailable} savingIconIds={savingIconIds}
                        onIconChange={onIconChange}/>
    ))}</div>;
}

function InventoryGroup({
    group,
    collapsed,
    onToggle,
    isAdmin,
    onEdit,
    onItemToggle,
    iconFieldAvailable,
    emojiFieldAvailable,
    savingIconIds,
    onIconChange,
}) {
    const criticalCount = group.items.filter((item) => stockStatus(item).key === "critical").length;
    const bodyId = `inventory-group-${group.key}`;
    return <section className={`inventory-group ${collapsed ? "is-collapsed" : ""}`}>
        <button className="inventory-group-head" onClick={onToggle} aria-expanded={!collapsed}
                aria-controls={bodyId}>
            <span className="group-chevron">{collapsed ? <ChevronRight size={18}/> : <ChevronDown size={18}/>}</span>
            <span className="inventory-group-identity"><small>Grupo</small><strong>{group.label}</strong></span>
            <span className="inventory-group-summary">{group.items.length} {group.items.length === 1 ? "ingrediente" : "ingredientes"}</span>
            {criticalCount > 0 && <b>{criticalCount} críticos</b>}
        </button>
        {!collapsed && <div className="inventory-subgroup" id={bodyId}>
            <span className="inventory-subgroup-rail" aria-hidden="true"/>
            <div className="inventory-subgroup-content">
                <ItemsTable items={group.items} isAdmin={isAdmin} onEdit={onEdit} onToggle={onItemToggle}
                    iconFieldAvailable={iconFieldAvailable} emojiFieldAvailable={emojiFieldAvailable}
                    savingIconIds={savingIconIds} onIconChange={onIconChange} grouped/>
            </div>
        </div>}
    </section>;
}

function ItemsTable({
    items,
    isAdmin,
    onEdit,
    onToggle,
    iconFieldAvailable,
    emojiFieldAvailable,
    savingIconIds,
    onIconChange,
    grouped = false,
}) {
    if (!items.length) return <div className="catalog-empty"><Boxes size={28}/><h3>No hay ingredientes para mostrar</h3>
        <p>Ajusta la búsqueda o los filtros.</p></div>;
    const columns = [
        {
            id: "ingredient",
            header: "Ingrediente",
            cell: ({row}) => {
                const item = row.original;
                const context = [item.department?.name, item.supplier?.name].filter(Boolean).join(" · ");
                return <div className="product-cell catalog-table-product">
                    {isAdmin && iconFieldAvailable ? <IngredientIconPicker
                        value={item.icon_key ?? ""} emojiValue={item.icon_emoji ?? ""}
                        disabled={false} emojiDisabled={!emojiFieldAvailable}
                        busy={savingIconIds.has(item.id)}
                        ariaLabel={`Cambiar ícono de ${item.name}`}
                        triggerClassName="catalog-table-icon-trigger"
                        onChange={(nextIcon) => onIconChange(item, nextIcon)}/>
                        : <div className="food-icon"><IngredientIcon iconKey={item.icon_key}
                            iconEmoji={item.icon_emoji} size={17}/></div>}
                    <div><strong>{item.name}</strong>
                        <span>{context || "Sin asignar"}{!item.active ? " · Inactivo" : ""}</span>
                    </div>
                </div>;
            },
        },
        {
            id: "stock",
            header: "Inventario",
            cell: ({row}) => {
                const item = row.original;
                return <div className="catalog-stock-brief">
                    <strong>{Number(item.quantity).toLocaleString("es-SV")} {quantityUnitLabel(item.base_unit, item.quantity)}</strong>
                    <span>Ideal {Number(item.par_level).toLocaleString("es-SV")}</span>
                </div>;
            },
        },
        {
            id: "status",
            header: "Estado",
            cell: ({row}) => {
                const status = stockStatus(row.original);
                const variant = status.key === "critical" || status.key === "low" ? status.key : "outline";
                return <Badge variant={variant} className={`catalog-status-badge is-${status.key}`}>
                    <span aria-hidden="true"/>{status.label}
                </Badge>;
            },
        },
        {
            id: "cost",
            header: "Costo",
            cell: ({row}) => money.format(Number(row.original.unit_cost)),
        },
    ];
    if (isAdmin) columns.push({
        id: "actions",
        header: () => <span className="sr-only">Acciones</span>,
        cell: ({row}) => {
            const item = row.original;
            return <div className="row-actions catalog-row-actions">
                <button title="Editar" aria-label={`Editar ${item.name}`} onClick={() => onEdit(item)}>
                    <Pencil size={15}/>
                </button>
                <button title={item.active ? "Desactivar" : "Reactivar"}
                    aria-label={`${item.active ? "Desactivar" : "Reactivar"} ${item.name}`}
                    onClick={() => onToggle(item)}>{item.active ? <CircleOff size={15}/> :
                        <ArchiveRestore size={15}/>}</button>
            </div>;
        },
    });

    return <DataTable data={items} columns={columns}
        className={`catalog-items-data-table ${grouped ? "grouped-table" : ""}`}/>;
}

function SuppliersTable({suppliers, isAdmin, onEdit, onToggle}) {
    if (!suppliers.length) return <div className="catalog-empty"><Building2 size={28}/><h3>No hay proveedores para
        mostrar</h3></div>;
    return <div className="table-wrap">
        <table>
            <thead>
            <tr>
                <th>Proveedor</th>
                <th>Correo</th>
                <th>Teléfono</th>
                <th>Estado</th>
                {isAdmin && <th>Acciones</th>}</tr>
            </thead>
            <tbody>{suppliers.map((supplier) => <tr key={supplier.id}
                                                    className={!supplier.active ? "inactive-row" : ""}>
                <td><strong>{supplier.name}</strong></td>
                <td>{supplier.email || "—"}</td>
                <td>{supplier.phone || "—"}</td>
                <td><span
                    className={`status ${supplier.active ? "healthy" : "critical"}`}><span/>{supplier.active ? "Activo" : "Inactivo"}</span>
                </td>
                {isAdmin && <td>
                    <div className="row-actions">
                        <button title="Editar" onClick={() => onEdit(supplier)}><Pencil size={15}/></button>
                        <button title={supplier.active ? "Desactivar" : "Reactivar"}
                                onClick={() => onToggle(supplier)}>{supplier.active ? <CircleOff size={15}/> :
                            <ArchiveRestore size={15}/>}</button>
                    </div>
                </td>}</tr>)}</tbody>
        </table>
    </div>;
}

function IngredientIconPicker({
    value,
    emojiValue,
    disabled,
    emojiDisabled,
    busy = false,
    ariaLabel,
    triggerClassName = "",
    onChange,
}) {
    const [open, setOpen] = useState(false);
    const [view, setView] = useState(emojiValue ? "emoji" : "icons");
    const [query, setQuery] = useState("");
    const searchInputRef = useRef(null);
    const selected = ingredientIconOption(value);
    const SelectedIcon = selected.Icon;
    const results = view === "emoji" ? [] : searchIngredientIcons(query, INGREDIENT_ICON_OPTIONS);

    useEffect(() => {
        if (!open || view !== "icons") return undefined;
        const frame = requestAnimationFrame(() => {
            searchInputRef.current?.focus();
            searchInputRef.current?.select();
        });
        return () => cancelAnimationFrame(frame);
    }, [open, view]);

    return <Popover open={open} onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) setQuery("");
    }}>
        <PopoverTrigger className={`ingredient-icon-trigger ${triggerClassName}`.trim()} type="button"
            disabled={busy}
            aria-label={ariaLabel || `Elegir ícono. Actual: ${emojiValue || selected.label}`}
            title="Elegir ícono">
            {emojiValue ? <IngredientIcon iconEmoji={emojiValue} size={19}/> : <SelectedIcon size={19}/>}
        </PopoverTrigger>
        <PopoverContent className="ingredient-icon-popover">
            <div className="ingredient-icon-popover-head">
                <strong>Ícono del ingrediente</strong>
                {busy ? <small>Guardando…</small>
                    : (disabled || emojiDisabled) && <small>Actualización pendiente</small>}
            </div>
            <div className="ingredient-icon-tabs" role="tablist" aria-label="Fuentes de íconos">
            <button type="button" role="tab" aria-selected={view === "icons"}
                onClick={() => {
                    setView("icons");
                    setQuery("");
                }}><Shapes size={13}/>Íconos</button>
            <button type="button" role="tab" aria-selected={view === "emoji"}
                onClick={() => {
                    setView("emoji");
                    setQuery("");
                }}><Smile size={13}/>Emojis</button>
            </div>
            {view !== "emoji" && <InputGroup className="ingredient-icon-search">
            <InputGroupInput ref={searchInputRef} value={query} onChange={(event) => setQuery(event.target.value)}
                aria-label="Buscar ícono" placeholder="Buscar por nombre o tipo…"/>
            <InputGroupAddon><Search size={16}/></InputGroupAddon>
            </InputGroup>}
            {view === "emoji" ? <div className="ingredient-emoji-panel">
                <Suspense fallback={<div className="ingredient-emoji-loading">
                    <div className="state-spinner"/>Cargando emojis…
                </div>}>
                    <EmojiPicker width="100%" height={330} theme="light" autoFocusSearch
                        emojiStyle="native" lazyLoadEmojis searchPlaceholder="Buscar emoji…"
                        previewConfig={{showPreview: false}}
                        onEmojiClick={({emoji}) => {
                            if (emojiDisabled) return;
                            onChange({iconKey: "", iconEmoji: emoji});
                            setOpen(false);
                        }}/>
                </Suspense>
            </div> : <div className="ingredient-icon-results">
            {results.length ? results.map(({key, label, Icon}) => <label key={key || "default"}
                className={!emojiValue && value === key ? "selected" : ""}>
                <input type="radio" name="ingredient-icon" value={key} aria-label={label}
                    disabled={disabled || busy}
                    checked={!emojiValue && value === key}
                    onChange={() => {
                        onChange({iconKey: key, iconEmoji: ""});
                        setOpen(false);
                    }}/>
                <span><Icon size={18}/></span><strong>{label}</strong>
                {!emojiValue && value === key && <Check size={14}/>}
            </label>) : <div className="ingredient-icon-empty">
                <Search size={16}/><span>No encontramos un ícono con esa búsqueda.</span>
            </div>}
            </div>}
        </PopoverContent>
    </Popover>;
}

function ItemDialog({
    draft,
    departments,
    suppliers,
    iconFieldAvailable = true,
    emojiFieldAvailable = true,
    onClose,
    onSaved,
}) {
    const [values, setValues] = useState(draft);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const title = draft.id ? "Editar ingrediente" : "Nuevo ingrediente";

    async function submit(event) {
        event.preventDefault();
        setSaving(true);
        setError("");
        try {
            await saveCatalogItem(values);
            await onSaved();
        } catch (nextError) {
            setError(errorMessage(nextError));
            setSaving(false);
        }
    }

    return <Sheet open onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="ingredient-sheet">
            <form className="ingredient-sheet-form" onSubmit={submit}>
                <SheetHeader>
                    <span className="eyebrow">ADMINISTRACIÓN</span>
                    <SheetTitle>{title}</SheetTitle>
                    {draft.id
                        ? <SheetDescription>Actualiza la información operativa de este ingrediente.</SheetDescription>
                        : null}
                </SheetHeader>
                <div className="ingredient-sheet-body">
                    <div className="catalog-form-grid">
        <div className="catalog-field wide"><label htmlFor="ingredient-name">Nombre *</label>
            <InputGroup className="ingredient-name-input">
                <InputGroupAddon className="ingredient-icon-addon" interactive><IngredientIconPicker
                    value={values.iconKey} emojiValue={values.iconEmoji}
                    disabled={!iconFieldAvailable} emojiDisabled={!emojiFieldAvailable}
                    onChange={(icon) => setValues({...values, ...icon})}/></InputGroupAddon>
                <InputGroupInput id="ingredient-name" required autoFocus value={values.name}
                    onChange={(event) => setValues({...values, name: event.target.value})}/>
            </InputGroup>
        </div>
        <label className="catalog-field catalog-unit-field"><span>Unidad de inventario *</span><select required value={values.baseUnit}
                                                                           onChange={(event) => setValues({
                                                                               ...values,
                                                                               baseUnit: event.target.value
                                                                           })}>{UNIT_OPTIONS.map(([value, label]) =>
            <option value={value} key={value}>{label}</option>)}</select><small>Existencia, niveles y costo usan esta misma unidad.</small></label>
        <label className="catalog-field"><span>Departamento</span><select value={values.departmentId}
                                                                          onChange={(event) => setValues({
                                                                              ...values,
                                                                              departmentId: event.target.value
                                                                          })}>
            <option value="">Sin asignar</option>
            {departments.map((department) => <option value={department.id}
                                                     key={department.id}>{department.name}</option>)}</select></label>
        <label className="catalog-field"><span>Proveedor</span><select value={values.supplierId}
                                                                       onChange={(event) => setValues({
                                                                           ...values,
                                                                           supplierId: event.target.value
                                                                       })}>
            <option value="">Sin asignar</option>
            {suppliers.filter((supplier) => supplier.active || supplier.id === values.supplierId).map((supplier) =>
                <option value={supplier.id} key={supplier.id}>{supplier.name}</option>)}</select></label>
        <NumberField label="Nivel ideal" value={values.parLevel}
                     onChange={(value) => setValues({...values, parLevel: value})}/>
        <NumberField label="Punto de reorden" value={values.reorderPoint}
                     onChange={(value) => setValues({...values, reorderPoint: value})}/>
        <NumberField label="Costo por unidad de inventario ($)" value={values.unitCost}
                     onChange={(value) => setValues({...values, unitCost: value})} step="0.01"/>
                    </div>
                    <label className="active-checkbox"><input type="checkbox" checked={values.active}
                                                              onChange={(event) => setValues({
                                                                  ...values,
                                                                  active: event.target.checked
                                                              })}/> Registro activo</label>
                    {error && <div className="catalog-message error">{error}</div>}
                </div>
                <SheetFooter>
                    <SheetClose type="button" className="secondary-btn">Cancelar</SheetClose>
                    <button className="primary-btn" disabled={saving}>
                        {saving ? "Guardando…" : draft.id ? "Guardar cambios" : "Crear ingrediente"}
                    </button>
                </SheetFooter>
            </form>
        </SheetContent>
    </Sheet>;
}

function SupplierDialog({draft, onClose, onSaved}) {
    const [values, setValues] = useState(draft);
    return <CatalogDialog title={draft.id ? "Editar proveedor" : "Nuevo proveedor"} values={values}
                          setValues={setValues} onClose={onClose} onSave={() => saveSupplier(values)} onSaved={onSaved}>
        <label className="catalog-field wide"><span>Nombre *</span><input required value={values.name}
                                                                          onChange={(event) => setValues({
                                                                              ...values,
                                                                              name: event.target.value
                                                                          })}/></label>
        <label className="catalog-field"><span>Correo</span><input type="email" value={values.email}
                                                                   onChange={(event) => setValues({
                                                                       ...values,
                                                                       email: event.target.value
                                                                   })}/></label>
        <label className="catalog-field"><span>Teléfono</span><input value={values.phone}
                                                                     onChange={(event) => setValues({
                                                                         ...values,
                                                                         phone: event.target.value
                                                                     })}/></label>
    </CatalogDialog>;
}

function NumberField({label, value, onChange, step = "0.001", required = true}) {
    return <label className="catalog-field"><span>{label}</span><input type="number" min="0" step={step}
                                                                       required={required} value={value}
                                                                       onChange={(event) => onChange(event.target.value)}/></label>;
}

function CatalogDialog({title, children, values, setValues, onClose, onSave, onSaved}) {
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    async function submit(event) {
        event.preventDefault();
        setSaving(true);
        setError("");
        try {
            await onSave();
            await onSaved();
        } catch (nextError) {
            setError(errorMessage(nextError));
            setSaving(false);
        }
    }

    return <div className="modal-backdrop" onMouseDown={onClose}>
        <form className="modal catalog-dialog" onMouseDown={(event) => event.stopPropagation()} onSubmit={submit}>
            <button type="button" className="icon-btn modal-close" onClick={onClose}><X size={18}/></button>
            <span className="eyebrow">ADMINISTRACIÓN</span><h2>{title}</h2>
            <div className="catalog-form-grid">{children}</div>
            <label className="active-checkbox"><input type="checkbox" checked={values.active}
                                                      onChange={(event) => setValues({
                                                          ...values,
                                                          active: event.target.checked
                                                      })}/> Registro activo</label>{error &&
            <div className="catalog-message error">{error}</div>}
            <div className="dialog-actions">
                <button type="button" className="secondary-btn" onClick={onClose}>Cancelar</button>
                <button className="primary-btn" disabled={saving}>{saving ? "Guardando…" : "Guardar cambios"}</button>
            </div>
        </form>
    </div>;
}
