import {useCallback, useEffect, useMemo, useState} from "react";
import {
    ArchiveRestore,
    ArrowUpDown,
    Boxes,
    Building2,
    ChevronDown,
    ChevronRight,
    CircleOff,
    Download,
    FilterX,
    Layers3,
    Pencil,
    Plus,
    RefreshCw,
    Search,
    ShieldCheck,
    SlidersHorizontal,
    X,
} from "lucide-react";
import {useAuth} from "../../auth/AuthProvider";
import {
    loadCatalog,
    saveCatalogItem,
    saveSupplier,
    setCatalogItemActive,
    setSupplierActive,
} from "../api/catalogRepository";
import {
    groupCatalogItems,
    matchesCatalogItem,
    sortCatalogItems,
    stockStatus,
    UNIT_OPTIONS,
    unitLabel
} from "../catalogModel";
import {
    availableInventoryCsvColumns,
    defaultInventoryExportName,
    DEFAULT_INVENTORY_CSV_COLUMN_KEYS,
    downloadInventoryCsv,
} from "../inventoryCsv";

const money = new Intl.NumberFormat("es-SV", {style: "currency", currency: "USD"});
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
    active: true,
};
const emptySupplier = {id: null, name: "", email: "", phone: "", active: true};

function errorMessage(error) {
    if (error?.code === "23505") return "Ese nombre o SKU ya existe en el catálogo.";
    if (error?.code === "42501") return "Tu rol no tiene permiso para modificar el catálogo.";
    return "No pudimos completar la operación. Intenta nuevamente.";
}

export default function CatalogPage() {
    const {role} = useAuth();
    const isAdmin = role === "admin";
    const [catalog, setCatalog] = useState({items: [], departments: [], suppliers: []});
    const [tab, setTab] = useState("items");
    const [query, setQuery] = useState("");
    const [departmentId, setDepartmentId] = useState("");
    const [supplierId, setSupplierId] = useState("");
    const [stockFilter, setStockFilter] = useState("all");
    const [groupBy, setGroupBy] = useState("none");
    const [sortBy, setSortBy] = useState("name");
    const [collapsedGroups, setCollapsedGroups] = useState(() => new Set());
    const [optionsOpen, setOptionsOpen] = useState(true);
    const [includeInactive, setIncludeInactive] = useState(true);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [itemDraft, setItemDraft] = useState(null);
    const [supplierDraft, setSupplierDraft] = useState(null);
    const [exportOpen, setExportOpen] = useState(false);

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
    const suppliers = useMemo(() => {
        const normalized = query.trim().toLocaleLowerCase("es");
        return catalog.suppliers.filter((supplier) => (
            (includeInactive || supplier.active)
            && (!normalized || [supplier.name, supplier.email, supplier.phone]
                .some((value) => String(value ?? "").toLocaleLowerCase("es").includes(normalized)))
        ));
    }, [catalog.suppliers, includeInactive, query]);
    const critical = catalog.items.filter((item) => item.active && stockStatus(item).key === "critical").length;
    const hasItemFilters = Boolean(query || departmentId || supplierId || stockFilter !== "all" || !includeInactive);

    function resetItemFilters() {
        setQuery("");
        setDepartmentId("");
        setSupplierId("");
        setStockFilter("all");
        setIncludeInactive(true);
    }

    async function showGlobalInventory() {
        setQuery("");
        setDepartmentId("");
        setSupplierId("");
        setStockFilter("all");
        setGroupBy("none");
        setSortBy("name");
        setCollapsedGroups(new Set());
        setIncludeInactive(true);
        setOptionsOpen(true);
        await refresh();
    }

    function toggleGroup(key) {
        setCollapsedGroups((current) => {
            const next = new Set(current);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
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
            <div><span className="eyebrow">CATÁLOGO OPERATIVO</span><h2>Ingredientes y proveedores</h2><p>Datos reales
                importados del inventario maestro de Forno.</p></div>
            <div className="catalog-heading-actions">
                {tab === "items" && <button className="global-view-button catalog-refresh-button"
                                            onClick={showGlobalInventory} disabled={loading}
                                            title="Actualizar datos y restablecer la tabla"><RefreshCw size={16}
                                                className={loading ? "spinning" : ""}/><span><strong>Actualizar</strong><small>Actualizar y restablecer</small></span>
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

        <div className="panel page-panel catalog-panel">
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
                        setOptionsOpen(true);
                    }}>Proveedores
                    </button>
                </div>
                <div className="catalog-panel-actions">
                    <label className="modern-switch catalog-inactive-toggle"><input type="checkbox"
                                                                                     checked={includeInactive}
                                                                                     onChange={(event) => setIncludeInactive(event.target.checked)}/><span
                        className="switch-track"><i/></span><span>Inactivos</span></label>
                    {isAdmin && <button className="primary-btn catalog-create-button"
                                        onClick={() => tab === "items" ? setItemDraft({...emptyItem}) : setSupplierDraft({...emptySupplier})}>
                        <Plus size={17}/> {tab === "items" ? "Ingrediente" : "Proveedor"}</button>}
                </div>
            </div>
            <div className="table-tools catalog-tools">
                <div>
                    <div className="search-box"><Search size={18}/><input value={query}
                                                                          onChange={(event) => setQuery(event.target.value)}
                                                                          placeholder={`Buscar ${tab === "items" ? "ingrediente" : "proveedor"}…`}/>
                    </div>
                </div>
                    {tab === "items" && <button className={`view-options-toggle ${optionsOpen ? "active" : ""}`}
                                                onClick={() => setOptionsOpen((current) => !current)}>
                        <SlidersHorizontal size={16}/><span>Opciones</span>{optionsOpen ? <ChevronDown size={14}/> :
                        <ChevronRight size={14}/>}</button>}
            </div>

            {tab === "items" && optionsOpen && <>
                <div className="inventory-options-bar">
                    <div className="inventory-option-controls">
                        <ViewSelect icon={Boxes} label="Departamento" value={departmentId} onChange={setDepartmentId}
                                    options={[{
                                        value: "",
                                        label: "Todos"
                                    }, ...catalog.departments.map((department) => ({
                                        value: department.id,
                                        label: department.name
                                    }))]}/>
                        <ViewSelect icon={Building2} label="Proveedor" value={supplierId} onChange={setSupplierId}
                                    options={[{
                                        value: "",
                                        label: "Todos"
                                    }, ...catalog.suppliers.filter((supplier) => supplier.active).map((supplier) => ({
                                        value: supplier.id,
                                        label: supplier.name
                                    }))]}/>
                        <ViewSelect icon={Layers3} label="Agrupación" value={groupBy} onChange={(value) => {
                            setGroupBy(value);
                            setCollapsedGroups(new Set());
                        }} options={[{value: "department", label: "Por departamento"}, {
                            value: "supplier",
                            label: "Por proveedor"
                        }, {value: "none", label: "Sin agrupar"}]}/>
                        <ViewSelect icon={ArrowUpDown} label="Orden" value={sortBy} onChange={setSortBy}
                                    options={[{value: "attention", label: "Atención requerida"}, {
                                        value: "name",
                                        label: "Nombre A–Z"
                                    }, {value: "gap", label: "Mayor faltante"}, {
                                        value: "stock",
                                        label: "Menor existencia"
                                    }]}/>
                    </div>
                </div>
                <div className="stock-filter-row" aria-label="Filtrar por estado">
                    {[
                        ["all", "Todos", scopedItems.length],
                        ["critical", "Críticos", statusCounts.critical],
                        ["low", "Bajos", statusCounts.low],
                        ["healthy", "Óptimos", statusCounts.healthy],
                        ["neutral", "Sin niveles", statusCounts.neutral],
                    ].map(([key, label, count]) => <button key={key}
                                                           className={`${stockFilter === key ? "active" : ""} ${key}`}
                                                           onClick={() => setStockFilter(key)}>
                        <span/>{label}<b>{count}</b></button>)}
                    {hasItemFilters &&
                        <button className="reset-filters" onClick={resetItemFilters}><FilterX size={15}/> Limpiar
                            filtros</button>}
                </div>
            </>}

            {tab === "items" && <div className="inventory-results-bar">
                <span> <strong>{items.length}</strong> de {catalog.items.filter((item) => item.active || includeInactive).length} ingredientes</span>
                <button className="inventory-export-button" disabled={loading || items.length === 0}
                        onClick={() => setExportOpen(true)}
                        title="Descargar los resultados visibles con la agrupación y el orden actuales">
                    <Download size={15}/><span>Exportar CSV</span><b>{items.length}</b>
                </button>
            </div>}

            {error && <div className="catalog-message error">{error}
                <button onClick={refresh}>Reintentar</button>
            </div>}
            {loading ? <div className="catalog-empty">
                <div className="state-spinner"/>
                <p>Cargando catálogo seguro…</p></div> : tab === "items" ? (
                <div className="inventory-table-stage"><ItemsExplorer
                    groups={itemGroups} groupBy={groupBy} collapsedGroups={collapsedGroups} onToggleGroup={toggleGroup}
                    isAdmin={isAdmin} onEdit={editItem} onToggle={toggleItem}/></div>
            ) : (
                <SuppliersTable suppliers={suppliers} isAdmin={isAdmin} onEdit={(supplier) => setSupplierDraft({
                    ...supplier,
                    email: supplier.email ?? "",
                    phone: supplier.phone ?? ""
                })} onToggle={toggleSupplier}/>
            )}
        </div>

        {itemDraft && <ItemDialog draft={itemDraft} departments={catalog.departments} suppliers={catalog.suppliers}
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
    </>;
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

function ItemsExplorer({groups, groupBy, collapsedGroups, onToggleGroup, isAdmin, onEdit, onToggle}) {
    const itemCount = groups.reduce((total, group) => total + group.items.length, 0);
    if (!itemCount) return <div className="catalog-empty"><Boxes size={28}/><h3>No hay ingredientes para mostrar</h3>
        <p>Ajusta la búsqueda o los filtros.</p></div>;
    if (groupBy === "none") return <ItemsTable items={groups[0].items} isAdmin={isAdmin} onEdit={onEdit}
                                               onToggle={onToggle}/>;
    return <div className="inventory-groups">{groups.map((group) => (
        <InventoryGroup key={group.key} group={group} collapsed={collapsedGroups.has(group.key)}
                        onToggle={() => onToggleGroup(group.key)} isAdmin={isAdmin} onEdit={onEdit}
                        onItemToggle={onToggle}/>
    ))}</div>;
}

function InventoryGroup({group, collapsed, onToggle, isAdmin, onEdit, onItemToggle}) {
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
                <ItemsTable items={group.items} isAdmin={isAdmin} onEdit={onEdit} onToggle={onItemToggle} grouped/>
            </div>
        </div>}
    </section>;
}

function ItemsTable({items, isAdmin, onEdit, onToggle, grouped = false}) {
    if (!items.length) return <div className="catalog-empty"><Boxes size={28}/><h3>No hay ingredientes para mostrar</h3>
        <p>Ajusta la búsqueda o los filtros.</p></div>;
    return <div className={`table-wrap ${grouped ? "grouped-table" : ""}`}>
        <table>
            <thead>
            <tr>
                <th>Ingrediente</th>
                <th>Departamento</th>
                <th>Existencia</th>
                <th>Nivel ideal</th>
                <th>Estado</th>
                <th>Costo</th>
                <th>Proveedor</th>
                {isAdmin && <th>Acciones</th>}</tr>
            </thead>
            <tbody>{items.map((item) => {
                const status = stockStatus(item);
                return <tr key={item.id} className={!item.active ? "inactive-row" : ""}>
                    <td>
                        <div className="product-cell">
                            <div className="food-icon"><Boxes size={17}/></div>
                            <div>
                                <strong>{item.name}</strong><span>{item.sku || "Sin SKU"}{!item.active ? " · Inactivo" : ""}</span>
                            </div>
                        </div>
                    </td>
                    <td><span className="category-tag">{item.department?.name ?? "Sin asignar"}</span></td>
                    <td><strong>{Number(item.quantity).toLocaleString("es-SV")}</strong> {unitLabel(item.base_unit)}
                    </td>
                    <td>{Number(item.par_level).toLocaleString("es-SV")} {unitLabel(item.base_unit)}</td>
                    <td><span className={`status ${status.key}`}><span/>{status.label}</span></td>
                    <td>{money.format(Number(item.unit_cost))}</td>
                    <td>{item.supplier?.name ?? "Sin asignar"}</td>
                    {isAdmin && <td>
                        <div className="row-actions">
                            <button title="Editar" onClick={() => onEdit(item)}><Pencil size={15}/></button>
                            <button title={item.active ? "Desactivar" : "Reactivar"}
                                    onClick={() => onToggle(item)}>{item.active ? <CircleOff size={15}/> :
                                <ArchiveRestore size={15}/>}</button>
                        </div>
                    </td>}</tr>;
            })}</tbody>
        </table>
    </div>;
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

function ItemDialog({draft, departments, suppliers, onClose, onSaved}) {
    const [values, setValues] = useState(draft);
    return <CatalogDialog title={draft.id ? "Editar ingrediente" : "Nuevo ingrediente"} values={values}
                          setValues={setValues} onClose={onClose} onSave={() => saveCatalogItem(values)}
                          onSaved={onSaved}>
        <label className="catalog-field wide"><span>Nombre *</span><input required value={values.name}
                                                                          onChange={(event) => setValues({
                                                                              ...values,
                                                                              name: event.target.value
                                                                          })}/></label>
        <div className="catalog-generated-field wide">
            <ShieldCheck size={20}/>
            <div>
                <span>SKU automático</span>
                <strong>{values.sku || "Se asignará al guardar"}</strong>
                <small>Identificador permanente administrado por el sistema.</small>
            </div>
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
    </CatalogDialog>;
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
