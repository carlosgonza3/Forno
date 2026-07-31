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
    par_level: 10,
    reorder_point: 5,
    department: {id: "produce", name: "Frutas"},
    supplier: {id: "market", name: "Mercado"},
    ...values,
});

describe("shopping model", () => {
    it("calculates the quantity needed to reach the ideal level", () => {
        expect(suggestedPurchaseQuantity(item())).toBe(8);
        expect(suggestedPurchaseQuantity(item({quantity: 12}))).toBe(0);
    });

    it("uses the derived low threshold as the trigger and the ideal level as the purchase target", () => {
        const items = buildShoppingItems([
            item({id: "below-low", quantity: 5.5}),
            item({id: "equal-low", quantity: 6}),
            item({id: "inactive", active: false}),
            item({id: "zero-reorder", quantity: 0, reorder_point: 0}),
            item({id: "above-low", quantity: 6.001}),
            item({id: "no-purchase-needed", quantity: 0, par_level: 0, reorder_point: 0}),
        ]);
        expect(items.map((entry) => entry.id)).toEqual(["below-low", "equal-low", "zero-reorder"]);
        expect(items[0].purchaseQuantity).toBe(4.5);
        expect(items[1].purchaseQuantity).toBe(4);
        expect(items[2].purchaseQuantity).toBe(10);
    });

    it("matches the client's 30 ideal, 10 reorder, and 14 low boundary", () => {
        expect(buildShoppingItems([
            item({id: "healthy", par_level: 30, reorder_point: 10, quantity: 15}),
            item({id: "low", par_level: 30, reorder_point: 10, quantity: 14}),
            item({id: "critical", par_level: 30, reorder_point: 10, quantity: 10}),
        ]).map((entry) => entry.id)).toEqual(["low", "critical"]);
    });

    it("applies persisted team decisions", () => {
        const [result] = buildShoppingItems([item()], [{
            item_id: "item-1",
            quantity_override: 12,
            quantity_manually_overridden: true,
            included: false,
        }]);
        expect(result).toMatchObject({purchaseQuantity: 12, suggestedQuantity: 8, included: false});
    });

    it("does not freeze the suggestion when only inclusion was persisted", () => {
        const [result] = buildShoppingItems([item()], [{
            item_id: "item-1",
            quantity_override: null,
            included: false,
        }]);
        expect(result).toMatchObject({
            purchaseQuantity: 8,
            suggestedQuantity: 8,
            quantityOverride: null,
            included: false,
        });
    });

    it("ignores legacy quantities that were not explicitly marked as manual", () => {
        const [result] = buildShoppingItems([item()], [{
            item_id: "item-1",
            quantity_override: 60,
            quantity_manually_overridden: false,
            included: true,
        }]);
        expect(result).toMatchObject({
            purchaseQuantity: 8,
            suggestedQuantity: 8,
            quantityOverride: null,
            quantityManuallyOverridden: false,
        });
    });

    it("excludes ingredients that are already on a pending purchase list", () => {
        expect(buildShoppingItems([item()], [], ["item-1"])).toEqual([]);
    });

    it("can include healthy ingredients for a resupply created from scratch", () => {
        const results = buildShoppingItems([
            item({id: "recommended", quantity: 2}),
            item({id: "healthy", quantity: 12}),
        ], [], [], {includeAll: true});

        expect(results).toHaveLength(2);
        expect(results[0]).toMatchObject({id: "recommended", recommended: true, included: true});
        expect(results[1]).toMatchObject({
            id: "healthy",
            recommended: false,
            included: false,
            purchaseQuantity: 0,
        });
    });

    it("filters and groups purchase items using inventory relations", () => {
        const entry = item();
        expect(matchesShoppingItem(entry, {query: "mercado", supplierId: "market"})).toBe(true);
        expect(matchesShoppingItem(entry, {departmentId: "other"})).toBe(false);
        expect(groupShoppingItems([entry], "supplier")[0].label).toBe("Mercado");
    });
});
