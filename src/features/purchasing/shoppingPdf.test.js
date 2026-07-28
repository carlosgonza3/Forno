import {describe, expect, it} from "vitest";
import {buildShoppingPdf} from "./shoppingPdf";

describe("shopping PDF", () => {
    it("builds a valid PDF document from the reviewed list", async () => {
        const bytes = await buildShoppingPdf([{
            name: "Tomate de cocina",
            supplier: {name: "Mercado Central"},
            base_unit: "lb",
            purchaseQuantity: 3,
        }], {createdAt: new Date("2026-07-28T12:00:00Z")});
        expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
        expect(bytes.byteLength).toBeGreaterThan(1000);
    });
});
