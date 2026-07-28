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
const PLURAL_UNIT_LABELS = {
  unidad: "Unidades",
  g: "Gramos (g)",
  kg: "Kilogramos (kg)",
  lb: "Libras (lb)",
  oz: "Onzas (oz)",
  ml: "Mililitros (ml)",
  l: "Litros (L)",
  botella: "Botellas",
  lata: "Latas",
  bolsa: "Bolsas",
  bote: "Botes",
  caja: "Cajas",
  carton: "Cartones",
  paquete: "Paquetes",
  manojo: "Manojos",
  cabeza: "Cabezas",
  galon: "Galones",
  barril: "Barriles",
  orden: "Órdenes",
};

export function unitLabel(unit) {
  return UNIT_LABELS[unit] ?? unit ?? "—";
}

export function quantityUnitLabel(unit, quantity) {
  if (Number(quantity) === 1) return unitLabel(unit);
  if (PLURAL_UNIT_LABELS[unit]) return PLURAL_UNIT_LABELS[unit];
  const label = unitLabel(unit);
  return label === "—" || label.toLocaleLowerCase("es").endsWith("s") ? label : `${label}s`;
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

export function inventoryDashboardSummary(items = [], suppliers = []) {
  const activeItems = items.filter((item) => item.active);
  const counts = activeItems.reduce((summary, item) => {
    const status = stockStatus(item).key;
    summary[status] += 1;
    if (Number(item.quantity) > 0) summary.withExistence += 1;
    return summary;
  }, { critical: 0, low: 0, healthy: 0, neutral: 0, withExistence: 0 });

  return {
    activeItems,
    activeProducts: activeItems.length,
    criticalProducts: counts.critical,
    restockProducts: counts.critical + counts.low,
    productsWithExistence: counts.withExistence,
    productsWithoutExistence: activeItems.length - counts.withExistence,
    activeSuppliers: suppliers.filter((supplier) => supplier.active).length,
  };
}

export function matchesCatalogItem(item, query, departmentId, includeInactive, supplierId = "") {
  const normalized = query.trim().toLocaleLowerCase("es");
  const matchesText = !normalized || [item.name, item.sku, item.supplier?.name]
    .some((value) => String(value ?? "").toLocaleLowerCase("es").includes(normalized));
  return matchesText
    && (!departmentId || item.department?.id === departmentId)
    && (!supplierId || item.supplier?.id === supplierId)
    && (includeInactive || item.active);
}

const STATUS_PRIORITY = { critical: 0, low: 1, neutral: 2, healthy: 3 };

export function sortCatalogItems(items, sortBy = "attention") {
  return [...items].sort((left, right) => {
    if (sortBy === "name") return left.name.localeCompare(right.name, "es");
    if (sortBy === "stock") {
      const difference = Number(left.quantity) - Number(right.quantity);
      return difference || left.name.localeCompare(right.name, "es");
    }
    if (sortBy === "gap") {
      const leftGap = Number(left.par_level) - Number(left.quantity);
      const rightGap = Number(right.par_level) - Number(right.quantity);
      return rightGap - leftGap || left.name.localeCompare(right.name, "es");
    }
    const statusDifference = STATUS_PRIORITY[stockStatus(left).key] - STATUS_PRIORITY[stockStatus(right).key];
    return statusDifference || left.name.localeCompare(right.name, "es");
  });
}

export function groupCatalogItems(items, groupBy = "department") {
  if (groupBy === "none") return [{ key: "all", label: "Todos los ingredientes", items }];
  const groups = new Map();
  for (const item of items) {
    const relation = groupBy === "supplier" ? item.supplier : item.department;
    const key = relation?.id ?? "unassigned";
    const label = relation?.name ?? (groupBy === "supplier" ? "Sin proveedor" : "Sin departamento");
    const group = groups.get(key) ?? { key, label, items: [] };
    group.items.push(item);
    groups.set(key, group);
  }
  return [...groups.values()].sort((left, right) => {
    if (left.key === "unassigned") return 1;
    if (right.key === "unassigned") return -1;
    return left.label.localeCompare(right.label, "es");
  });
}
