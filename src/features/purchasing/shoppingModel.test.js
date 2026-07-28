import {describe, expect, it} from "vitest";
import {
    buildShoppingItems,
    groupShoppingItems,
    matchesShoppingItem,
    suggestedPurchaseQuantity,
} from "./shoppingModel";

const item = (values = {}) => ({
    id: "item-1",
    name: "Tomate",
    sku: "FOR-001",
    active: true,
    quantity: 2,
    reorder_point: 5,
    department: {id: "produce", name: "Frutas"},
    supplier: {id: "market", name: "Mercado"},
    ...values,
});

describe("shopping model", () => {
    it("calculates the quantity needed to reach the reorder point", () => {
        expect(suggestedPurchaseQuantity(item())).toBe(3);
        expect(suggestedPurchaseQuantity(item({quantity: 7}))).toBe(0);
    });

    it("only includes active items below a configured reorder point", () => {
        const items = buildShoppingItems([
            item(),
            item({id: "equal", quantity: 5}),
            item({id: "inactive", active: false}),
            item({id: "unconfigured", reorder_point: 0}),
        ]);
        expect(items.map((entry) => entry.id)).toEqual(["item-1"]);
        expect(items[0].purchaseQuantity).toBe(3);
    });

    it("applies persisted team decisions", () => {
        const [result] = buildShoppingItems([item()], [{
            item_id: "item-1",
            quantity_override: 8,
            included: false,
        }]);
        expect(result).toMatchObject({purchaseQuantity: 8, suggestedQuantity: 3, included: false});
    });

    it("excludes ingredients that are already on a pending purchase list", () => {
        expect(buildShoppingItems([item()], [], ["item-1"])).toEqual([]);
    });

    it("filters and groups purchase items using inventory relations", () => {
        const entry = item();
        expect(matchesShoppingItem(entry, {query: "mercado", supplierId: "market"})).toBe(true);
        expect(matchesShoppingItem(entry, {departmentId: "other"})).toBe(false);
        expect(groupShoppingItems([entry], "supplier")[0].label).toBe("Mercado");
    });
});
