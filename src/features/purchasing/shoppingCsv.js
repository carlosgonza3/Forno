import {quantityUnitLabel} from "../inventory/catalogModel";

function csvCell(value) {
  const safe = /^[=+\-@]/.test(String(value)) ? `'${value}` : value;
  return `"${String(safe ?? "").replaceAll('"', '""')}"`;
}

export function buildShoppingCsv(items) {
  const rows = items
    .filter((item) => item.included && Number(item.purchaseQuantity) > 0)
    .map((item) => [
      item.name,
      item.supplier?.name ?? "Sin proveedor",
      `${Number(item.purchaseQuantity).toLocaleString("es-SV")} ${quantityUnitLabel(item.base_unit, item.purchaseQuantity)}`,
    ]);
  return `\uFEFF${[
    ["Ingrediente", "Proveedor", "Cantidad a comprar"],
    ...rows,
  ].map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}

export function defaultShoppingCsvName(date = new Date()) {
  return `forno-compras-${date.toISOString().slice(0, 10)}.csv`;
}

export function downloadShoppingCsv(items, date = new Date()) {
  const blob = new Blob([buildShoppingCsv(items)], {type: "text/csv;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = defaultShoppingCsvName(date);
  link.click();
  URL.revokeObjectURL(url);
}
