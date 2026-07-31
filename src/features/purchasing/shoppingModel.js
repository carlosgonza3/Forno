import {lowStockThreshold} from "../inventory/catalogModel";

export function suggestedPurchaseQuantity(item) {
  return Math.max(0, Number(item.par_level) - Number(item.quantity));
}

export function buildShoppingItems(items = [], decisions = [], pendingItemIds = [], {includeAll = false} = {}) {
  const decisionsByItem = new Map(decisions.map((decision) => [decision.item_id, decision]));
  const pendingItems = new Set(pendingItemIds);
  return items
    .filter((item) => item.active && !pendingItems.has(item.id))
    .map((item) => {
      const decision = decisionsByItem.get(item.id);
      const suggestedQuantity = suggestedPurchaseQuantity(item);
      const recommended = Number(item.quantity) <= lowStockThreshold(item)
        && suggestedQuantity > 0;
      const quantityManuallyOverridden = decision?.quantity_manually_overridden === true;
      const quantityOverride = !quantityManuallyOverridden || decision?.quantity_override == null
        ? null
        : Number(decision.quantity_override);
      return {
        ...item,
        recommended,
        suggestedQuantity,
        quantityOverride,
        quantityManuallyOverridden,
        purchaseQuantity: quantityOverride ?? (recommended ? suggestedQuantity : 0),
        included: decision?.included ?? recommended,
      };
    })
    .filter((item) => includeAll || item.recommended);
}

export function matchesShoppingItem(item, {query = "", departmentId = "", supplierId = ""} = {}) {
  const normalized = query.trim().toLocaleLowerCase("es");
  const matchesText = !normalized || [item.name, item.sku, item.supplier?.name]
    .some((value) => String(value ?? "").toLocaleLowerCase("es").includes(normalized));
  return matchesText
    && (!departmentId || item.department?.id === departmentId)
    && (!supplierId || item.supplier?.id === supplierId);
}

export function groupShoppingItems(items, groupBy = "department") {
  if (groupBy === "none") return [{key: "all", label: "Todos los ingredientes", items}];
  const groups = new Map();
  for (const item of items) {
    const relation = groupBy === "supplier" ? item.supplier : item.department;
    const key = relation?.id ?? "unassigned";
    const label = relation?.name ?? (groupBy === "supplier" ? "Sin proveedor" : "Sin departamento");
    const group = groups.get(key) ?? {key, label, items: []};
    group.items.push(item);
    groups.set(key, group);
  }
  return [...groups.values()].sort((left, right) => {
    if (left.key === "unassigned") return 1;
    if (right.key === "unassigned") return -1;
    return left.label.localeCompare(right.label, "es");
  });
}
