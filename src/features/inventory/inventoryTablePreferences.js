export const INVENTORY_TABLE_PREFERENCES_STORAGE_KEY = "forno-inventory-table-columns";

export const INVENTORY_TABLE_SECTIONS = [
  {
    id: "ingredients",
    label: "Ingredientes",
    description: "La tabla principal de ingredientes.",
    columns: ["stock", "last-note", "last-note-at", "updated-at", "status", "cost"],
  },
  {
    id: "processed",
    label: "Preparados",
    description: "Productos elaborados y listos para utilizar.",
    columns: ["stock", "last-note", "last-note-at", "updated-at", "status", "cost"],
  },
  {
    id: "beverages",
    label: "Bebidas",
    description: "Inventario dedicado a bebidas.",
    columns: ["stock", "last-note", "last-note-at", "updated-at", "status"],
  },
];

export const INVENTORY_TABLE_COLUMN_LABELS = {
  stock: "Inventario",
  "last-note": "Última nota",
  "last-note-at": "Fecha de nota",
  "updated-at": "Último cambio",
  status: "Estado",
  cost: "Costo",
};

export const DEFAULT_INVENTORY_TABLE_PREFERENCES = Object.fromEntries(
  INVENTORY_TABLE_SECTIONS.map((section) => [section.id, [...section.columns]]),
);

export function normalizeInventoryTablePreferences(value) {
  return Object.fromEntries(INVENTORY_TABLE_SECTIONS.map((section) => {
    const savedColumns = value?.[section.id];
    if (!Array.isArray(savedColumns)) return [section.id, [...section.columns]];
    const selected = new Set(savedColumns);
    return [section.id, section.columns.filter((column) => selected.has(column))];
  }));
}

export function readInventoryTablePreferences() {
  try {
    const saved = window.localStorage.getItem(INVENTORY_TABLE_PREFERENCES_STORAGE_KEY);
    return normalizeInventoryTablePreferences(saved ? JSON.parse(saved) : null);
  } catch {
    return normalizeInventoryTablePreferences(null);
  }
}

export function saveInventoryTablePreferences(value) {
  const normalized = normalizeInventoryTablePreferences(value);
  try {
    window.localStorage.setItem(INVENTORY_TABLE_PREFERENCES_STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // The active preference still applies until the application is closed.
  }
  return normalized;
}
