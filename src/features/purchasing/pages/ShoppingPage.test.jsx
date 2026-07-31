import {cleanup, fireEvent, render, screen, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import ShoppingPage from "./ShoppingPage";

const loadShoppingWorkspace = vi.fn();
const receivePurchaseList = vi.fn();

vi.mock("../api/shoppingRepository", () => ({
    createPurchaseList: vi.fn(),
    loadShoppingWorkspace: (...args) => loadShoppingWorkspace(...args),
    receivePurchaseList: (...args) => receivePurchaseList(...args),
    resetShoppingDecision: vi.fn(),
    saveShoppingDecision: vi.fn(),
    saveShoppingDecisions: vi.fn(),
}));

vi.mock("../shoppingCsv", () => ({downloadShoppingCsv: vi.fn()}));
vi.mock("../shoppingPdf", () => ({downloadShoppingPdf: vi.fn()}));

const pendingList = {
    id: "11111111-1111-1111-1111-111111111111",
    status: "pending",
    item_count: 2,
    created_at: "2026-07-28T12:00:00Z",
    received_at: null,
    items: [{
        item_id: "tomato",
        item_name: "Tomate",
        supplier_name: "Mercado",
        base_unit: "lb",
        quantity_ordered: 5,
        quantity_received: null,
    }, {
        item_id: "flour",
        item_name: "Harina",
        supplier_name: "Molino",
        base_unit: "lb",
        quantity_ordered: 3,
        quantity_received: null,
    }],
};

describe("ShoppingPage purchase receipt review", () => {
    afterEach(cleanup);

    beforeEach(() => {
        loadShoppingWorkspace.mockReset();
        receivePurchaseList.mockReset();
        loadShoppingWorkspace.mockResolvedValue({
            catalog: {items: [], departments: [], suppliers: []},
            decisions: [],
            pendingItemIds: [],
            lists: [pendingList],
        });
        receivePurchaseList.mockResolvedValue("transaction-id");
    });

    it("reviews ordered and received quantities before adding inventory", async () => {
        render(<ShoppingPage/>);

        fireEvent.click(await screen.findByRole("button", {name: /Lista #11111111/i}));
        fireEvent.click(screen.getByRole("button", {name: /Marcar recibida y agregar al inventario/i}));

        expect(screen.getByRole("dialog", {name: "Revisar recepción"})).toBeInTheDocument();
        expect(screen.getByLabelText("Cantidad recibida de Tomate")).toHaveValue("5");
        expect(screen.getByLabelText("Cantidad recibida de Harina")).toHaveValue("3");

        fireEvent.change(screen.getByLabelText("Cantidad recibida de Tomate"), {target: {value: "0"}});
        expect(screen.getByText("Faltan 5")).toBeInTheDocument();
        expect(screen.getByText("1 con diferencia")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", {name: "Confirmar recepción"}));
        await waitFor(() => expect(receivePurchaseList).toHaveBeenCalledWith(pendingList.id, [{
            itemId: "tomato",
            quantityReceived: 0,
        }, {
            itemId: "flour",
            quantityReceived: 3,
        }]));
    });
});
