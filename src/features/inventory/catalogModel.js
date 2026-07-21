export const UNIT_OPTIONS = [
  ["unidad", "Unidad"],
  ["g", "Gramo (g)"],
  ["kg", "Kilogramo (kg)"],
  ["lb", "Libra (lb)"],
  ["oz", "Onza (oz)"],
  ["ml", "Mililitro (ml)"],
  ["l", "Litro (L)"],
  ["botella", "Botella"],
  ["lata", "Lata"],
  ["bolsa", "Bolsa"],
  ["bote", "Bote"],
  ["caja", "Caja"],
  ["carton", "Cartón"],
  ["paquete", "Paquete"],
  ["manojo", "Manojo"],
  ["cabeza", "Cabeza"],
  ["galon", "Galón"],
  ["barril", "Barril"],
  ["orden", "Orden"],
];

const UNIT_LABELS = Object.fromEntries(UNIT_OPTIONS);

export function unitLabel(unit) {
  return UNIT_LABELS[unit] ?? unit ?? "—";
}

export function stockStatus(item) {
  const quantity = Number(item.quantity);
  const reorder = Number(item.reorder_point);
  const par = Number(item.par_level);
  if (par <= 0 && reorder <= 0) return { key: "neutral", label: "Sin niveles" };
  if (quantity <= reorder) return { key: "critical", label: "Crítico" };
  if (par > 0 && quantity / par < 0.7) return { key: "low", label: "Bajo" };
  return { key: "healthy", label: "Óptimo" };
}

export function matchesCatalogItem(item, query, departmentId, includeInactive) {
  const normalized = query.trim().toLocaleLowerCase("es");
  const matchesText = !normalized || [item.name, item.sku, item.supplier?.name]
    .some((value) => String(value ?? "").toLocaleLowerCase("es").includes(normalized));
  return matchesText
    && (!departmentId || item.department?.id === departmentId)
    && (includeInactive || item.active);
}
