import {describe, expect, it} from "vitest";
import {
    buildInventoryCsv,
    defaultInventoryExportName,
    normalizeInventoryCsvFilename,
} from "./inventoryCsv";

function inventoryItem(overrides = {}) {
    return {
        name: "Tomate, cocina",
        sku: "FOR-\"001\"",
        department: {name: "Frutas y verduras"},
        supplier: {name: "Mercado"},
        quantity: 1,
        base_unit: "lb",
        par_level: 10,
        reorder_point: 2,
        unit_cost: 1.25,
        active: true,
        ...overrides,
    };
}

describe("inventory CSV export", () => {
    it("exports the supplied result order with a group column", () => {
        const csv = buildInventoryCsv([
            {label: "Frutas", items: [inventoryItem()]},
            {label: "Otros", items: [inventoryItem({name: "Harina", quantity: 20})]},
        ], {groupBy: "department", columnKeys: ["group", "name", "sku", "status"]});

        expect(csv.startsWith('\uFEFF"Grupo actual","Ingrediente","SKU"')).toBe(true);
        expect(csv).toContain('"Frutas","Tomate, cocina","FOR-""001"""');
        expect(csv.indexOf("Tomate, cocina")).toBeLessThan(csv.indexOf("Harina"));
        expect(csv).toContain('"Crítico"');
    });

    it("omits grouping in the global view and neutralizes spreadsheet formulas", () => {
        const csv = buildInventoryCsv([{label: "Todos", items: [inventoryItem({name: "=IMPORTXML(1)"})]}], {
            columnKeys: ["name", "sku"],
        });

        expect(csv.startsWith('\uFEFF"Ingrediente","SKU"')).toBe(true);
        expect(csv).toContain('"\'=IMPORTXML(1)"');
        expect(csv).not.toContain('"Grupo"');
    });

    it("creates and sanitizes custom inventory filenames", () => {
        const date = new Date("2026-07-21T12:00:00Z");
        expect(defaultInventoryExportName(date)).toBe("forno-inventario-2026-07-21");
        expect(normalizeInventoryCsvFilename("Conteo: noche?.csv", date)).toBe("Conteo- noche-.csv");
        expect(normalizeInventoryCsvFilename("", date)).toBe("forno-inventario-2026-07-21.csv");
    });
});
