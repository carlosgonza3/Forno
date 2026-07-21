import {stockStatus, unitLabel} from "./catalogModel";

export const INVENTORY_CSV_COLUMNS = [
    {key: "group", label: "Grupo actual", groupedOnly: true, select: (_item, groupLabel) => groupLabel},
    {key: "name", label: "Ingrediente", select: (item) => item.name},
    {key: "sku", label: "SKU", select: (item) => item.sku ?? ""},
    {key: "department", label: "Departamento", select: (item) => item.department?.name ?? "Sin asignar"},
    {key: "supplier", label: "Proveedor", select: (item) => item.supplier?.name ?? "Sin asignar"},
    {key: "quantity", label: "Existencia", select: (item) => Number(item.quantity)},
    {key: "unit", label: "Unidad", select: (item) => unitLabel(item.base_unit)},
    {key: "parLevel", label: "Nivel ideal", select: (item) => Number(item.par_level)},
    {key: "reorderPoint", label: "Punto de reorden", select: (item) => Number(item.reorder_point)},
    {key: "status", label: "Estado", select: (item) => stockStatus(item).label},
    {key: "unitCost", label: "Costo por unidad de inventario (USD)", select: (item) => Number(item.unit_cost)},
    {key: "active", label: "Activo", select: (item) => item.active ? "Sí" : "No"},
];

export const DEFAULT_INVENTORY_CSV_COLUMN_KEYS = INVENTORY_CSV_COLUMNS
    .filter((column) => !column.groupedOnly)
    .map((column) => column.key);

function csvCell(value) {
    let text = value == null ? "" : String(value);
    if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
}

export function availableInventoryCsvColumns(groupBy = "none") {
    return INVENTORY_CSV_COLUMNS.filter((column) => !column.groupedOnly || groupBy !== "none");
}

export function buildInventoryCsv(groups, {groupBy = "none", columnKeys = DEFAULT_INVENTORY_CSV_COLUMN_KEYS} = {}) {
    const allowedKeys = new Set(availableInventoryCsvColumns(groupBy).map((column) => column.key));
    const selectedKeys = new Set(columnKeys.filter((key) => allowedKeys.has(key)));
    const columns = INVENTORY_CSV_COLUMNS.filter((column) => selectedKeys.has(column.key));
    if (!columns.length) throw new Error("Select at least one CSV column.");

    const rows = groups.flatMap((group) => group.items.map((item) => (
        columns.map((column) => column.select(item, group.label))
    )));
    return `\uFEFF${[columns.map((column) => column.label), ...rows]
        .map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}

export function defaultInventoryExportName(date = new Date()) {
    return `forno-inventario-${date.toISOString().slice(0, 10)}`;
}

export function normalizeInventoryCsvFilename(filename, date = new Date()) {
    const withoutExtension = String(filename ?? "").trim().replace(/\.csv$/i, "");
    const safeName = withoutExtension
        .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
        .replace(/\s+/g, " ")
        .replace(/[. ]+$/g, "")
        .slice(0, 100);
    return `${safeName || defaultInventoryExportName(date)}.csv`;
}

export function downloadInventoryCsv(groups, options = {}) {
    const blob = new Blob([buildInventoryCsv(groups, options)], {type: "text/csv;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = normalizeInventoryCsvFilename(options.filename);
    link.click();
    URL.revokeObjectURL(url);
}
