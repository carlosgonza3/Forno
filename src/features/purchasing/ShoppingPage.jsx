import {useEffect, useMemo, useState} from "react";
import {
    Check,
    ChevronDown,
    ChevronRight,
    ClipboardCheck,
    Download,
    FileText,
    FilterX,
    Leaf,
    Minus,
    PackageCheck,
    Plus,
    RefreshCw,
    Save,
    Search,
    ShoppingBasket,
    X,
} from "lucide-react";
import {quantityUnitLabel} from "../inventory/catalogModel";
import FornoFoxLogo from "../../assets/nico-whine-white.png";
import {downloadShoppingCsv} from "./shoppingCsv";
import {downloadShoppingPdf} from "./shoppingPdf";
import {
    buildShoppingItems,
    groupShoppingItems,
    matchesShoppingItem,
} from "./shoppingModel";
import {
    createPurchaseList,
    loadShoppingWorkspace,
    receivePurchaseList,
    resetShoppingDecision,
    saveShoppingDecision,
    saveShoppingDecisions,
} from "./shoppingRepository";

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
    const [groupBy, setGroupBy] = useState("department");
    const [collapsedGroups, setCollapsedGroups] = useState(() => new Set());
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
            setItems(buildShoppingItems(next.catalog.items, next.decisions, next.pendingItemIds));
        } catch (error) {
            setMessage(errorMessage(error));
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        refresh();
    }, []);

    const filteredItems = useMemo(() => items.filter((item) => matchesShoppingItem(item, {
        query,
    })), [items, query]);
    const groups = useMemo(() => groupShoppingItems(filteredItems, groupBy), [filteredItems, groupBy]);
    const selectedItems = items.filter((item) => item.included && Number(item.purchaseQuantity) > 0);
    const selectedSupplierNames = [...new Map(selectedItems.map((item) => [
        item.supplier?.id ?? "unassigned",
        item.supplier?.name ?? "Sin proveedor",
    ])).values()].sort((left, right) => left.localeCompare(right, "es"));
    const hasFilters = Boolean(query);

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
        const next = {...current, ...changes};
        setItems((entries) => entries.map((item) => item.id === itemId ? next : item));
        setSaving(itemId, true);
        setMessage("");
        try {
            await saveShoppingDecision({
                itemId,
                quantityOverride: Number(next.purchaseQuantity),
                included: next.included,
            });
        } catch (error) {
            setItems((entries) => entries.map((item) => item.id === itemId ? current : item));
            setMessage(errorMessage(error));
        } finally {
            setSaving(itemId, false);
        }
    }

    async function resetItem(item) {
        setSaving(item.id, true);
        setMessage("");
        try {
            await resetShoppingDecision(item.id);
            setItems((entries) => entries.map((entry) => entry.id === item.id ? {
                ...entry,
                purchaseQuantity: entry.suggestedQuantity,
                included: true,
            } : entry));
        } catch (error) {
            setMessage(errorMessage(error));
        } finally {
            setSaving(item.id, false);
        }
    }

    function resetFilters() {
        setQuery("");
    }

    function toggleGroup(groupKey) {
        setCollapsedGroups((current) => {
            const next = new Set(current);
            if (next.has(groupKey)) next.delete(groupKey);
            else next.add(groupKey);
            return next;
        });
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
                quantityOverride: Number(item.purchaseQuantity),
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
            setSuccess("La lista de compras se guardó como pendiente.");
        } catch (error) {
            setMessage(errorMessage(error));
        } finally {
            setSavingList(false);
        }
    }

    async function confirmReceipt() {
        if (!receivingList) return;
        setSavingList(true);
        setMessage("");
        try {
            await receivePurchaseList(receivingList.id);
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
                <div><span className="eyebrow">COMPRAS</span><h2>Ingredientes bajo el punto de reorden</h2>
                    <p>Las cantidades sugeridas comparan la existencia actual con el punto de reorden.</p></div>
                <button className="secondary-btn" onClick={refresh} disabled={loading}>
                    <RefreshCw size={16} className={loading ? "spinning" : ""}/>Actualizar
                </button>
            </div>
            <div className="shopping-filters shopping-filters-simple">
                <label className="search-box"><Search size={17}/><input value={query}
                    onChange={(event) => setQuery(event.target.value)} placeholder="Buscar ingrediente o proveedor…"/></label>
                <label className="shopping-select"><span>Agrupar</span><select value={groupBy}
                    onChange={(event) => setGroupBy(event.target.value)}>
                    <option value="department">Departamento</option>
                    <option value="supplier">Proveedor</option>
                    <option value="none">Sin agrupación</option>
                </select><ChevronDown size={14}/></label>
                {hasFilters && <button className="shopping-reset-filters" onClick={resetFilters}>
                    <FilterX size={15}/>Limpiar
                </button>}
            </div>
            {message && <div className="catalog-message error">{message}</div>}
            {success && <div className="catalog-message success">{success}</div>}
            <div className="shopping-results-bar"><span><strong>{filteredItems.length}</strong>
                {filteredItems.length === 1 ? " ingrediente encontrado" : " ingredientes encontrados"}</span>
                <span>Solo se muestran existencias bajo el punto de reorden.</span></div>
            {loading ? <div className="shopping-state"><div className="state-spinner"/>Cargando lista de compras…</div>
                : groups.some((group) => group.items.length) ? <div className="shopping-groups">
                    {groups.filter((group) => group.items.length).map((group) => {
                        const collapsed = collapsedGroups.has(group.key);
                        return <section className={`shopping-group ${collapsed ? "collapsed" : ""}`} key={group.key}>
                        <header><button className="shopping-group-toggle" onClick={() => toggleGroup(group.key)}
                            aria-expanded={!collapsed} aria-controls={`shopping-group-${group.key}`}>
                            <span className="shopping-group-chevron">{collapsed
                                ? <ChevronRight size={16}/> : <ChevronDown size={16}/>}</span>
                            <span><Leaf size={16}/><strong>{group.label}</strong></span>
                            <b>{group.items.length}</b>
                        </button>
                            <button className="shopping-group-select" onClick={() => toggleGroupSelection(group.items)}
                                disabled={group.items.some((item) => savingIds.has(item.id))}>
                                {group.items.every((item) => item.included)
                                    ? <><Minus size={14}/>Quitar todos</>
                                    : <><Check size={14}/>Seleccionar todos</>}
                            </button>
                        </header>
                        {!collapsed && <div className="table-wrap shopping-table" id={`shopping-group-${group.key}`}><table><thead><tr>
                            <th>Incluir</th><th>Ingrediente</th><th>Proveedor</th><th>Existencia</th>
                            <th>Punto de reorden</th><th>Cantidad a comprar</th><th></th>
                        </tr></thead><tbody>{group.items.map((item) => {
                            const saving = savingIds.has(item.id);
                            return <tr className={!item.included ? "shopping-excluded" : ""} key={item.id}>
                                <td><button className={`shopping-check ${item.included ? "selected" : ""}`}
                                    onClick={() => persist(item.id, {included: !item.included})}
                                    disabled={saving} aria-label={`${item.included ? "Excluir" : "Incluir"} ${item.name}`}>
                                    {item.included && <Check size={14}/>}</button></td>
                                <td><div className="shopping-product"><span className="food-icon"><Leaf size={16}/></span>
                                    <span><strong>{item.name}</strong><small>{item.sku || "Sin SKU"}</small></span></div></td>
                                <td>{item.supplier?.name ?? <span className="shopping-missing">Sin proveedor</span>}</td>
                                <td>{Number(item.quantity).toLocaleString("es-SV")} {quantityUnitLabel(item.base_unit, item.quantity)}</td>
                                <td>{Number(item.reorder_point).toLocaleString("es-SV")} {quantityUnitLabel(item.base_unit, item.reorder_point)}</td>
                                <td><div className="shopping-quantity">
                                    <button onClick={() => persist(item.id, {purchaseQuantity: Number(item.purchaseQuantity) + 1})}
                                        disabled={saving} aria-label={`Agregar una unidad de ${item.name}`}><Plus size={14}/></button>
                                    <input type="number" min="0" step="0.001" value={item.purchaseQuantity}
                                        disabled={saving} aria-label={`Cantidad a comprar de ${item.name}`}
                                        onChange={(event) => setItems((entries) => entries.map((entry) =>
                                            entry.id === item.id ? {...entry, purchaseQuantity: Math.max(0, Number(event.target.value))} : entry))}
                                        onBlur={() => persist(item.id, {purchaseQuantity: Number(item.purchaseQuantity)})}/>
                                    <span>{quantityUnitLabel(item.base_unit, item.purchaseQuantity)}</span>
                                    <button onClick={() => persist(item.id, {purchaseQuantity: Math.max(0, Number(item.purchaseQuantity) - 1)})}
                                        disabled={saving || Number(item.purchaseQuantity) <= 0}
                                        aria-label={`Quitar una unidad de ${item.name}`}><Minus size={14}/></button>
                                </div></td>
                                <td><button className="shopping-suggested" onClick={() => resetItem(item)}
                                    disabled={saving || (item.included && Number(item.purchaseQuantity) === item.suggestedQuantity)}>
                                    Sugerido: {Number(item.suggestedQuantity).toLocaleString("es-SV")}
                                </button></td>
                            </tr>;
                        })}</tbody></table></div>}
                    </section>;
                    })}
                </div> : <div className="shopping-state healthy"><ShoppingBasket size={24}/>
                    <strong>No hay ingredientes por reponer</strong><span>Las existencias están sobre sus puntos de reorden.</span></div>}
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

function supplierCount(items) {
    return new Set(items.map((item) => item.supplier?.name ?? item.supplier_name ?? "Sin proveedor")).size;
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
    const providers = supplierCount(review.items);
    return <div className="modal-backdrop purchase-review-backdrop" onMouseDown={onClose}>
        <section className="modal purchase-review-dialog" role="dialog" aria-modal="true"
            aria-label="Revisar lista de compras" onMouseDown={(event) => event.stopPropagation()}>
            <header className="purchase-review-toolbar">
                <div><span className="eyebrow">REVISAR LISTA</span><strong>Documento de compra</strong></div>
                <div>
                    <button className="secondary-btn" onClick={() => downloadShoppingCsv(review.items)}>
                        <Download size={15}/>CSV
                    </button>
                    <button className="secondary-btn" onClick={() => downloadShoppingPdf(review.items, {
                        createdAt: review.createdAt,
                        logoUrl: FornoFoxLogo,
                    })}><FileText size={15}/>PDF</button>
                    <button className="icon-btn" onClick={onClose} aria-label="Cerrar revisión"><X size={18}/></button>
                </div>
            </header>
            <div className="purchase-document-scroll">
                <article className="purchase-document">
                    <header>
                        <div className="purchase-document-brand"><span><img src={FornoFoxLogo} alt="Forno"/></span><div><strong>FORNO</strong>
                            <small>LISTA DE COMPRAS</small></div></div>
                        <div className="purchase-document-date"><span>Preparada</span>
                            <strong>{review.createdAt.toLocaleString("es-SV", {
                                dateStyle: "medium",
                                timeStyle: "short",
                            })}</strong></div>
                    </header>
                    <h2>Lista para comprar</h2>
                    <p>Documento pendiente de recepción</p>
                    <div className="purchase-document-summary">
                        <div><span>Ingredientes</span><strong>{review.items.length}</strong></div>
                        <div><span>Proveedores</span><strong>{providers}</strong></div>
                    </div>
                    <div className="purchase-document-table"><table><thead><tr>
                        <th>Ingrediente</th><th>Proveedor</th><th>Cantidad a comprar</th>
                    </tr></thead><tbody>{review.items.map((item) => <tr key={item.id}>
                        <td><strong>{item.name}</strong><small>{item.sku || "Sin SKU"}</small></td>
                        <td>{item.supplier?.name ?? "Sin proveedor"}</td>
                        <td><strong>{Number(item.purchaseQuantity).toLocaleString("es-SV")} {quantityUnitLabel(item.base_unit, item.purchaseQuantity)}</strong></td>
                    </tr>)}</tbody></table></div>
                    <footer><span>Forno · Lista generada desde inventario</span></footer>
                </article>
            </div>
            <footer className="purchase-review-actions">
                <div><strong>¿Todo correcto?</strong><span>Al guardar, estos ingredientes dejarán de aparecer como recomendados.</span></div>
                <button className="primary-btn" onClick={onSave} disabled={saving}>
                    <Save size={16}/>{saving ? "Guardando…" : "Guardar lista pendiente"}
                </button>
            </footer>
        </section>
    </div>;
}

function PurchaseListHistory({lists, expandedLists, onToggle, onReceive}) {
    return <section className="panel purchase-history">
        <header className="purchase-history-heading"><div><span className="eyebrow">HISTORIAL</span>
            <h2>Listas de compras guardadas</h2><p>Pendientes y recibidas por el equipo.</p></div>
            <strong>{lists.length}</strong></header>
        {lists.length ? <div className="purchase-history-list">{lists.map((list) => {
            const expanded = expandedLists.has(list.id);
            const exportedItems = savedListExportItems(list);
            const providers = new Set(list.items.map((item) => item.supplier_name)).size;
            return <article className="purchase-history-entry" key={list.id}>
                <button className="purchase-history-toggle" onClick={() => onToggle(list.id)}
                    aria-expanded={expanded}>
                    <span className="purchase-history-icon"><FileText size={17}/></span>
                    <span><strong>Lista #{list.id.slice(0, 8).toUpperCase()}</strong>
                        <small>{new Date(list.created_at).toLocaleString("es-SV", {
                            dateStyle: "medium",
                            timeStyle: "short",
                        })} · {providers} {providers === 1 ? "proveedor" : "proveedores"}</small></span>
                    <span className={`purchase-status ${list.status}`}>
                        {list.status === "pending" ? "Pendiente" : "Recibida"}
                    </span>
                    <span>{list.item_count} {list.item_count === 1 ? "ingrediente" : "ingredientes"}</span>
                    {expanded ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
                </button>
                {expanded && <div className="purchase-history-detail">
                    <div className="table-wrap"><table><thead><tr>
                        <th>Ingrediente</th><th>Proveedor</th><th>Cantidad ordenada</th>
                    </tr></thead><tbody>{list.items.map((item) => <tr key={item.item_id}>
                        <td><strong>{item.item_name}</strong></td><td>{item.supplier_name}</td>
                        <td>{Number(item.quantity_ordered).toLocaleString("es-SV")} {quantityUnitLabel(item.base_unit, item.quantity_ordered)}</td>
                    </tr>)}</tbody></table></div>
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
                            Recibida {new Date(list.received_at).toLocaleString("es-SV", {
                                dateStyle: "medium",
                                timeStyle: "short",
                            })}</span>}
                    </footer>
                </div>}
            </article>;
        })}</div> : <div className="purchase-history-empty"><FileText size={23}/>
            <strong>Aún no hay listas guardadas</strong><span>Las nuevas listas aparecerán aquí.</span></div>}
    </section>;
}

function ReceivePurchaseDialog({list, saving, onClose, onConfirm}) {
    return <div className="modal-backdrop" onMouseDown={onClose}>
        <section className="modal receive-purchase-dialog" role="dialog" aria-modal="true"
            aria-label="Confirmar recepción" onMouseDown={(event) => event.stopPropagation()}>
            <div className="receive-purchase-icon"><PackageCheck size={24}/></div>
            <span className="eyebrow">CONFIRMAR RECEPCIÓN</span>
            <h2>¿Ya recibiste esta compra?</h2>
            <p>Se agregarán las cantidades ordenadas de {list.item_count} {list.item_count === 1
                ? "ingrediente" : "ingredientes"} al inventario. Esta acción no puede repetirse.</p>
            <div className="receive-purchase-actions">
                <button className="secondary-btn" onClick={onClose} disabled={saving}>Cancelar</button>
                <button className="primary-btn" onClick={onConfirm} disabled={saving}>
                    <PackageCheck size={16}/>{saving ? "Agregando…" : "Recibir y agregar"}
                </button>
            </div>
        </section>
    </div>;
}
