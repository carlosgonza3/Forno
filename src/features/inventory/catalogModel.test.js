import { describe, expect, it } from "vitest";
import { groupCatalogItems, matchesCatalogItem, sortCatalogItems, stockStatus, unitLabel } from "./catalogModel";

describe("catalog model", () => {
  it("classifies stock against reorder and par levels", () => {
    expect(stockStatus({ quantity: 1, reorder_point: 2, par_level: 10 }).key).toBe("critical");
    expect(stockStatus({ quantity: 5, reorder_point: 2, par_level: 10 }).key).toBe("low");
    expect(stockStatus({ quantity: 8, reorder_point: 2, par_level: 10 }).key).toBe("healthy");
    expect(stockStatus({ quantity: 0, reorder_point: 0, par_level: 0 }).key).toBe("neutral");
  });

  it("searches names, SKUs, and suppliers while honoring filters", () => {
    const item = { name: "Aceite de oliva", sku: "XLS-OT-004", active: true, department: { id: "other" }, supplier: { name: "PriceSmart" } };
    expect(matchesCatalogItem(item, "pricesmart", "other", false)).toBe(true);
    expect(matchesCatalogItem(item, "XLS-OT", "another", false)).toBe(false);
    expect(matchesCatalogItem({ ...item, active: false }, "aceite", "", false)).toBe(false);
    expect(matchesCatalogItem({ ...item, supplier: { id: "supplier", name: "PriceSmart" } }, "", "", false, "supplier")).toBe(true);
  });

  it("sorts attention items before healthy stock", () => {
    const healthy = { name: "Harina", quantity: 10, reorder_point: 2, par_level: 10 };
    const critical = { name: "Tomate", quantity: 1, reorder_point: 2, par_level: 10 };
    expect(sortCatalogItems([healthy, critical], "attention").map((item) => item.name)).toEqual(["Tomate", "Harina"]);
  });

  it("groups items and keeps unassigned entries last", () => {
    const assigned = { name: "Tomate", department: { id: "produce", name: "Frutas" } };
    const unassigned = { name: "Otro", department: null };
    const groups = groupCatalogItems([unassigned, assigned], "department");
    expect(groups.map((group) => group.label)).toEqual(["Frutas", "Sin departamento"]);
  });

  it("provides Spanish labels for canonical units", () => {
    expect(unitLabel("lb")).toBe("Libra (lb)");
    expect(unitLabel("personalizada")).toBe("personalizada");
  });
});
