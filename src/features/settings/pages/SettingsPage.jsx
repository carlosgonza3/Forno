import {useCallback, useEffect, useState} from "react";
import {Building2, Check, Moon, Plus, Save, Sun, Trash2, UserRound, X} from "lucide-react";
import {useAuth} from "../../auth/AuthProvider";
import {createDepartment, deleteDepartment, loadDepartmentSettings} from "../api/departmentRepository";

const THEME_CHOICES = [
  {
    id: "light",
    label: "Modo claro",
    description: "Una interfaz luminosa para espacios bien iluminados.",
    icon: Sun,
  },
  {
    id: "dark",
    label: "Modo oscuro",
    description: "Menos brillo y mayor comodidad durante el servicio nocturno.",
    icon: Moon,
  },
];

export default function SettingsPage({theme, onThemeChange}) {
  const {profile, role, updateDisplayName} = useAuth();
  const isAdmin = role === "admin";
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState("");
  const [nameSaved, setNameSaved] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [departmentName, setDepartmentName] = useState("");
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [departmentSaving, setDepartmentSaving] = useState(false);
  const [departmentError, setDepartmentError] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);

  useEffect(() => {
    setDisplayName(profile?.display_name ?? "");
  }, [profile?.display_name]);

  const refreshDepartments = useCallback(async () => {
    if (!isAdmin) return;
    setDepartmentsLoading(true);
    setDepartmentError("");
    try {
      setDepartments(await loadDepartmentSettings());
    } catch {
      setDepartmentError("No pudimos cargar los departamentos.");
    } finally {
      setDepartmentsLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    refreshDepartments();
  }, [refreshDepartments]);

  function normalizedDepartmentName(value) {
    return value.trim().replace(/\s+/g, " ");
  }

  async function addDepartment(event) {
    event.preventDefault();
    const normalized = normalizedDepartmentName(departmentName);
    if (!normalized) {
      setDepartmentError("Ingresa un nombre para el departamento.");
      return;
    }
    if (departments.some((department) => normalizedDepartmentName(department.name)
      .localeCompare(normalized, "es", {sensitivity: "base"}) === 0)) {
      setDepartmentError("Ese departamento ya existe.");
      return;
    }

    setDepartmentSaving(true);
    setDepartmentError("");
    try {
      await createDepartment(normalized);
      setDepartmentName("");
      await refreshDepartments();
    } catch (error) {
      setDepartmentError(error?.code === "23505"
        ? "Ese departamento ya existe."
        : "No pudimos agregar el departamento.");
    } finally {
      setDepartmentSaving(false);
    }
  }

  async function removeDepartment(department, unassignItems = false) {
    if (Number(department.item_count) > 0 && !unassignItems) {
      setPendingDelete(department);
      return;
    }
    setDepartmentSaving(true);
    setDepartmentError("");
    try {
      await deleteDepartment(department.id, {unassignItems});
      setPendingDelete(null);
      await refreshDepartments();
    } catch (error) {
      if (error?.code === "23503") {
        await refreshDepartments();
        setPendingDelete(department);
      } else {
        setDepartmentError("No pudimos eliminar el departamento.");
      }
    } finally {
      setDepartmentSaving(false);
    }
  }

  async function saveName(event) {
    event.preventDefault();
    const normalized = displayName.trim().replace(/\s+/g, " ");
    if (!normalized) {
      setNameError("Ingresa el nombre que quieres mostrar.");
      return;
    }
    setSavingName(true);
    setNameError("");
    setNameSaved(false);
    try {
      const result = await updateDisplayName(normalized);
      if (result.error) {
        setNameError(result.error.code === "22023"
          ? "El nombre debe tener entre 1 y 80 caracteres."
          : "No pudimos guardar el nombre. Intenta nuevamente.");
        return;
      }
      setNameSaved(true);
    } catch {
      setNameError("No pudimos guardar el nombre. Intenta nuevamente.");
    } finally {
      setSavingName(false);
    }
  }

  return <div className="settings-layout">
    <section className="panel settings-card profile-settings-card">
      <div className="settings-heading"><span className="eyebrow">PERFIL</span>
        <h2>Tu nombre en Forno</h2>
        <p>Este nombre aparece en el saludo, en tu perfil y junto a la actividad que registras.</p>
      </div>
      <form className="profile-name-form" onSubmit={saveName}>
        <label htmlFor="profile-display-name">Nombre visible</label>
        <div className="profile-name-control">
          <span><UserRound size={18}/></span>
          <input id="profile-display-name" required maxLength="80" autoComplete="name"
            value={displayName} onChange={(event) => {
              setDisplayName(event.target.value);
              setNameError("");
              setNameSaved(false);
            }} placeholder="Ej. Carlos"/>
          <button className="primary-btn" disabled={savingName
            || displayName.trim().replace(/\s+/g, " ") === (profile?.display_name ?? "")}>
            {savingName ? "Guardando…" : <><Save size={15}/>Guardar nombre</>}
          </button>
        </div>
        {nameError && <p className="profile-name-message error">{nameError}</p>}
        {nameSaved && <p className="profile-name-message success"><Check size={14}/>Nombre actualizado</p>}
      </form>
    </section>
    <section className="panel settings-card">
      <div className="settings-heading"><span className="eyebrow">APARIENCIA</span>
        <h2>Elige cómo ver Forno</h2>
        <p>Tu preferencia se guarda en este dispositivo y se aplica también al inicio de sesión.</p>
      </div>
      <div className="theme-options" role="radiogroup" aria-label="Tema de color">
        {THEME_CHOICES.map(({id, label, description, icon: Icon}) =>
          <button key={id} role="radio" aria-checked={theme === id}
            className={`theme-option ${theme === id ? "selected" : ""}`}
            onClick={() => onThemeChange(id)}>
            <span className="theme-option-icon"><Icon size={22}/></span>
            <span><strong>{label}</strong><small>{description}</small></span>
            <i className="theme-check">{theme === id && <Check size={15}/>}</i>
          </button>)}
      </div>
    </section>
    {isAdmin && <section className="panel settings-card department-settings-card">
      <div className="settings-heading"><span className="eyebrow">INVENTARIO</span>
        <h2>Departamentos</h2>
        <p>Agrega opciones para organizar ingredientes o elimina las que ya no se utilizan.</p>
      </div>
      <form className="department-create-form" onSubmit={addDepartment}>
        <label htmlFor="new-department">Nuevo departamento</label>
        <div className="department-create-control">
          <span><Building2 size={18}/></span>
          <input id="new-department" maxLength="80" value={departmentName}
            onChange={(event) => {
              setDepartmentName(event.target.value);
              setDepartmentError("");
            }} placeholder="Ej. Panadería"/>
          <button className="primary-btn" disabled={departmentSaving || !departmentName.trim()}>
            <Plus size={15}/>Agregar
          </button>
        </div>
      </form>
      {departmentError && <p className="department-message error">{departmentError}</p>}
      <div className="department-list" aria-label="Departamentos de inventario">
        {departmentsLoading ? <p className="department-empty">Cargando departamentos…</p>
          : departments.length ? departments.map((department) => <div className="department-row" key={department.id}>
            <span className="department-row-icon"><Building2 size={16}/></span>
            <span className="department-row-copy"><strong>{department.name}</strong>
              <small>{Number(department.item_count)} {Number(department.item_count) === 1 ? "ingrediente" : "ingredientes"}</small>
            </span>
            <button type="button" className="department-delete-button"
              aria-label={`Eliminar ${department.name}`} disabled={departmentSaving}
              onClick={() => removeDepartment(department)}><Trash2 size={16}/></button>
          </div>) : <p className="department-empty">No hay departamentos configurados.</p>}
      </div>
    </section>}
    {pendingDelete && <div className="modal-backdrop department-delete-backdrop"
      onMouseDown={() => !departmentSaving && setPendingDelete(null)}>
      <section className="modal department-delete-dialog" role="alertdialog" aria-modal="true"
        aria-labelledby="department-delete-title" onMouseDown={(event) => event.stopPropagation()}>
        <button type="button" className="department-dialog-close" aria-label="Cerrar"
          disabled={departmentSaving} onClick={() => setPendingDelete(null)}><X size={18}/></button>
        <span className="eyebrow">DEPARTAMENTO EN USO</span>
        <h2 id="department-delete-title">¿Eliminar {pendingDelete.name}?</h2>
        <p>Este departamento está asignado a <strong>{Number(pendingDelete.item_count)}</strong>
          {Number(pendingDelete.item_count) === 1 ? " ingrediente" : " ingredientes"}.
          Si continúas, esos ingredientes quedarán como <strong>Sin asignar</strong>.</p>
        <div className="department-dialog-actions">
          <button type="button" className="secondary-btn" disabled={departmentSaving}
            onClick={() => setPendingDelete(null)}>Cancelar</button>
          <button type="button" className="danger-btn" disabled={departmentSaving}
            onClick={() => removeDepartment(pendingDelete, true)}>
            {departmentSaving ? "Eliminando…" : "Continuar y dejar sin asignar"}
          </button>
        </div>
      </section>
    </div>}
  </div>;
}
