import {describe, expect, it} from "vitest";
import {buildShoppingCsv, defaultShoppingCsvName} from "./shoppingCsv";

describe("shopping CSV", () => {
    it("exports exactly ingredient, supplier, and purchase quantity", () => {
        const csv = buildShoppingCsv([{
            name: "Tomate, cocina",
            supplier: {name: "Mercado Central"},
            base_unit: "lb",
            purchaseQuantity: 3,
            included: true,
        }]);
        expect(csv).toBe('\uFEFF"Ingrediente","Proveedor","Cantidad a comprar"\r\n"Tomate, cocina","Mercado Central","3 Libras (lb)"');
    });

    it("omits excluded and zero-quantity rows and protects spreadsheet formulas", () => {
        const csv = buildShoppingCsv([
            {name: "=CMD()", supplier: null, base_unit: "unidad", purchaseQuantity: 2, included: true},
            {name: "Harina", supplier: null, base_unit: "lb", purchaseQuantity: 4, included: false},
            {name: "Aceite", supplier: null, base_unit: "l", purchaseQuantity: 0, included: true},
        ]);
        expect(csv).toContain('"\'=CMD()","Sin proveedor","2 Unidades"');
        expect(csv).not.toContain("Harina");
        expect(csv).not.toContain("Aceite");
    });

    it("uses a stable dated filename", () => {
        expect(defaultShoppingCsvName(new Date("2026-07-28T12:00:00Z"))).toBe("forno-compras-2026-07-28.csv");
    });
});
