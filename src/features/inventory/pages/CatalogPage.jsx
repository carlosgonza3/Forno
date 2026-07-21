import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArchiveRestore,
  Boxes,
  Building2,
  CircleOff,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { useAuth } from "../../auth/AuthProvider";
import {
  loadCatalog,
  saveCatalogItem,
  saveSupplier,
  setCatalogItemActive,
  setSupplierActive,
} from "../api/catalogRepository";
import { matchesCatalogItem, stockStatus, UNIT_OPTIONS, unitLabel } from "../catalogModel";

const money = new Intl.NumberFormat("es-SV", { style: "currency", currency: "USD" });
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
  packageSize: "",
  packageUnit: "",
  active: true,
};
const emptySupplier = { id: null, name: "", email: "", phone: "", active: true };

function errorMessage(error) {
  if (error?.code === "23505") return "Ese nombre o SKU ya existe en el catálogo.";
  if (error?.code === "42501") return "Tu rol no tiene permiso para modificar el catálogo.";
  return "No pudimos completar la operación. Intenta nuevamente.";
}

export default function CatalogPage() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const [catalog, setCatalog] = useState({ items: [], departments: [], suppliers: [] });
  const [tab, setTab] = useState("items");
  const [query, setQuery] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [itemDraft, setItemDraft] = useState(null);
  const [supplierDraft, setSupplierDraft] = useState(null);

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

  useEffect(() => { refresh(); }, [refresh]);

  const items = useMemo(
    () => catalog.items.filter((item) => matchesCatalogItem(item, query, departmentId, includeInactive)),
    [catalog.items, departmentId, includeInactive, query],
  );
  const suppliers = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es");
    return catalog.suppliers.filter((supplier) => (
      (includeInactive || supplier.active)
      && (!normalized || [supplier.name, supplier.email, supplier.phone]
        .some((value) => String(value ?? "").toLocaleLowerCase("es").includes(normalized)))
    ));
  }, [catalog.suppliers, includeInactive, query]);
  const critical = catalog.items.filter((item) => item.active && stockStatus(item).key === "critical").length;

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
      packageSize: item.package_size == null ? "" : String(item.package_size),
      packageUnit: item.package_unit ?? "",
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
      <div><span className="eyebrow">CATÁLOGO OPERATIVO</span><h2>Ingredientes y proveedores</h2><p>Datos reales importados del inventario maestro de Forno.</p></div>
      {isAdmin ? <div className="admin-badge"><ShieldCheck size={17} /><span><strong>Modo administrador</strong>Los cambios se validan con RLS</span></div> : <div className="readonly-badge">Vista de solo lectura</div>}
    </section>

    <div className="catalog-stats">
      <div><Boxes size={20} /><span><strong>{catalog.items.filter((item) => item.active).length}</strong> productos activos</span></div>
      <div><CircleOff size={20} /><span><strong>{critical}</strong> bajo punto de reorden</span></div>
      <div><Building2 size={20} /><span><strong>{catalog.suppliers.filter((supplier) => supplier.active).length}</strong> proveedores</span></div>
    </div>

    <div className="panel page-panel catalog-panel">
      <div className="catalog-tabs">
        <button className={tab === "items" ? "active" : ""} onClick={() => setTab("items")}>Ingredientes</button>
        <button className={tab === "suppliers" ? "active" : ""} onClick={() => setTab("suppliers")}>Proveedores</button>
      </div>
      <div className="table-tools catalog-tools">
        <div className="search-box"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Buscar ${tab === "items" ? "ingrediente" : "proveedor"}…`} /></div>
        {tab === "items" && <select className="catalog-select" value={departmentId} onChange={(event) => setDepartmentId(event.target.value)}><option value="">Todos los departamentos</option>{catalog.departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select>}
        <label className="inactive-toggle"><input type="checkbox" checked={includeInactive} onChange={(event) => setIncludeInactive(event.target.checked)} /> Mostrar inactivos</label>
        {isAdmin && <button className="primary-btn" onClick={() => tab === "items" ? setItemDraft({ ...emptyItem }) : setSupplierDraft({ ...emptySupplier })}><Plus size={17} /> {tab === "items" ? "Ingrediente" : "Proveedor"}</button>}
      </div>

      {error && <div className="catalog-message error">{error}<button onClick={refresh}>Reintentar</button></div>}
      {loading ? <div className="catalog-empty"><div className="state-spinner" /><p>Cargando catálogo seguro…</p></div> : tab === "items" ? (
        <ItemsTable items={items} isAdmin={isAdmin} onEdit={editItem} onToggle={toggleItem} />
      ) : (
        <SuppliersTable suppliers={suppliers} isAdmin={isAdmin} onEdit={(supplier) => setSupplierDraft({ ...supplier, email: supplier.email ?? "", phone: supplier.phone ?? "" })} onToggle={toggleSupplier} />
      )}
    </div>

    {itemDraft && <ItemDialog draft={itemDraft} departments={catalog.departments} suppliers={catalog.suppliers} onClose={() => setItemDraft(null)} onSaved={async () => { setItemDraft(null); await refresh(); }} />}
    {supplierDraft && <SupplierDialog draft={supplierDraft} onClose={() => setSupplierDraft(null)} onSaved={async () => { setSupplierDraft(null); await refresh(); }} />}
  </>;
}

function ItemsTable({ items, isAdmin, onEdit, onToggle }) {
  if (!items.length) return <div className="catalog-empty"><Boxes size={28} /><h3>No hay ingredientes para mostrar</h3><p>Ajusta la búsqueda o los filtros.</p></div>;
  return <div className="table-wrap"><table><thead><tr><th>Ingrediente</th><th>Departamento</th><th>Existencia</th><th>Nivel ideal</th><th>Estado</th><th>Costo</th><th>Proveedor</th>{isAdmin && <th>Acciones</th>}</tr></thead><tbody>{items.map((item) => {
    const status = stockStatus(item);
    return <tr key={item.id} className={!item.active ? "inactive-row" : ""}><td><div className="product-cell"><div className="food-icon"><Boxes size={17} /></div><div><strong>{item.name}</strong><span>{item.sku || "Sin SKU"}{!item.active ? " · Inactivo" : ""}</span></div></div></td><td><span className="category-tag">{item.department?.name ?? "Sin asignar"}</span></td><td><strong>{Number(item.quantity).toLocaleString("es-SV")}</strong> {unitLabel(item.base_unit)}</td><td>{Number(item.par_level).toLocaleString("es-SV")} {unitLabel(item.base_unit)}</td><td><span className={`status ${status.key}`}><span />{status.label}</span></td><td>{money.format(Number(item.unit_cost))}</td><td>{item.supplier?.name ?? "Sin asignar"}</td>{isAdmin && <td><div className="row-actions"><button title="Editar" onClick={() => onEdit(item)}><Pencil size={15} /></button><button title={item.active ? "Desactivar" : "Reactivar"} onClick={() => onToggle(item)}>{item.active ? <CircleOff size={15} /> : <ArchiveRestore size={15} />}</button></div></td>}</tr>;
  })}</tbody></table></div>;
}

function SuppliersTable({ suppliers, isAdmin, onEdit, onToggle }) {
  if (!suppliers.length) return <div className="catalog-empty"><Building2 size={28} /><h3>No hay proveedores para mostrar</h3></div>;
  return <div className="table-wrap"><table><thead><tr><th>Proveedor</th><th>Correo</th><th>Teléfono</th><th>Estado</th>{isAdmin && <th>Acciones</th>}</tr></thead><tbody>{suppliers.map((supplier) => <tr key={supplier.id} className={!supplier.active ? "inactive-row" : ""}><td><strong>{supplier.name}</strong></td><td>{supplier.email || "—"}</td><td>{supplier.phone || "—"}</td><td><span className={`status ${supplier.active ? "healthy" : "critical"}`}><span />{supplier.active ? "Activo" : "Inactivo"}</span></td>{isAdmin && <td><div className="row-actions"><button title="Editar" onClick={() => onEdit(supplier)}><Pencil size={15} /></button><button title={supplier.active ? "Desactivar" : "Reactivar"} onClick={() => onToggle(supplier)}>{supplier.active ? <CircleOff size={15} /> : <ArchiveRestore size={15} />}</button></div></td>}</tr>)}</tbody></table></div>;
}

function ItemDialog({ draft, departments, suppliers, onClose, onSaved }) {
  const [values, setValues] = useState(draft);
  return <CatalogDialog title={draft.id ? "Editar ingrediente" : "Nuevo ingrediente"} values={values} setValues={setValues} onClose={onClose} onSave={() => saveCatalogItem(values)} onSaved={onSaved}>
    <label className="catalog-field wide"><span>Nombre *</span><input required value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })} /></label>
    <label className="catalog-field"><span>SKU</span><input value={values.sku} onChange={(event) => setValues({ ...values, sku: event.target.value })} placeholder="FOR-0001" /></label>
    <label className="catalog-field"><span>Unidad base *</span><select required value={values.baseUnit} onChange={(event) => setValues({ ...values, baseUnit: event.target.value })}>{UNIT_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
    <label className="catalog-field"><span>Departamento</span><select value={values.departmentId} onChange={(event) => setValues({ ...values, departmentId: event.target.value })}><option value="">Sin asignar</option>{departments.map((department) => <option value={department.id} key={department.id}>{department.name}</option>)}</select></label>
    <label className="catalog-field"><span>Proveedor</span><select value={values.supplierId} onChange={(event) => setValues({ ...values, supplierId: event.target.value })}><option value="">Sin asignar</option>{suppliers.filter((supplier) => supplier.active || supplier.id === values.supplierId).map((supplier) => <option value={supplier.id} key={supplier.id}>{supplier.name}</option>)}</select></label>
    <NumberField label="Nivel ideal" value={values.parLevel} onChange={(value) => setValues({ ...values, parLevel: value })} />
    <NumberField label="Punto de reorden" value={values.reorderPoint} onChange={(value) => setValues({ ...values, reorderPoint: value })} />
    <NumberField label="Costo unitario ($)" value={values.unitCost} onChange={(value) => setValues({ ...values, unitCost: value })} step="0.01" />
    <NumberField label="Tamaño del empaque" value={values.packageSize} onChange={(value) => setValues({ ...values, packageSize: value })} required={false} />
  </CatalogDialog>;
}

function SupplierDialog({ draft, onClose, onSaved }) {
  const [values, setValues] = useState(draft);
  return <CatalogDialog title={draft.id ? "Editar proveedor" : "Nuevo proveedor"} values={values} setValues={setValues} onClose={onClose} onSave={() => saveSupplier(values)} onSaved={onSaved}>
    <label className="catalog-field wide"><span>Nombre *</span><input required value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })} /></label>
    <label className="catalog-field"><span>Correo</span><input type="email" value={values.email} onChange={(event) => setValues({ ...values, email: event.target.value })} /></label>
    <label className="catalog-field"><span>Teléfono</span><input value={values.phone} onChange={(event) => setValues({ ...values, phone: event.target.value })} /></label>
  </CatalogDialog>;
}

function NumberField({ label, value, onChange, step = "0.001", required = true }) {
  return <label className="catalog-field"><span>{label}</span><input type="number" min="0" step={step} required={required} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function CatalogDialog({ title, children, values, setValues, onClose, onSave, onSaved }) {
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
  return <div className="modal-backdrop" onMouseDown={onClose}><form className="modal catalog-dialog" onMouseDown={(event) => event.stopPropagation()} onSubmit={submit}><button type="button" className="icon-btn modal-close" onClick={onClose}><X size={18} /></button><span className="eyebrow">ADMINISTRACIÓN</span><h2>{title}</h2><div className="catalog-form-grid">{children}</div><label className="active-checkbox"><input type="checkbox" checked={values.active} onChange={(event) => setValues({ ...values, active: event.target.checked })} /> Registro activo</label>{error && <div className="catalog-message error">{error}</div>}<div className="dialog-actions"><button type="button" className="secondary-btn" onClick={onClose}>Cancelar</button><button className="primary-btn" disabled={saving}>{saving ? "Guardando…" : "Guardar cambios"}</button></div></form></div>;
}
