import {cleanup, fireEvent, render, screen, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import ShoppingPage from "./ShoppingPage";

const loadShoppingWorkspace = vi.fn();
const receivePurchaseList = vi.fn();
const saveShoppingDecision = vi.fn();

vi.mock("../api/shoppingRepository", () => ({
    createPurchaseList: vi.fn(),
    loadShoppingWorkspace: (...args) => loadShoppingWorkspace(...args),
    receivePurchaseList: (...args) => receivePurchaseList(...args),
    resetShoppingDecision: vi.fn(),
    saveShoppingDecision: (...args) => saveShoppingDecision(...args),
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
        saveShoppingDecision.mockReset();
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

    it("expands and collapses every recommendation group from one control", async () => {
        loadShoppingWorkspace.mockResolvedValue({
            catalog: {
                departments: [],
                suppliers: [],
                items: [{
                    id: "tomato",
                    name: "Tomate",
                    sku: "FOR-001",
                    active: true,
                    quantity: 10,
                    par_level: 30,
                    reorder_point: 10,
                    base_unit: "unidad",
                    department: {id: "produce", name: "Frutas"},
                    supplier: {id: "market", name: "Mercado"},
                }],
            },
            decisions: [],
            pendingItemIds: [],
            lists: [],
        });

        render(<ShoppingPage/>);

        const expandAll = await screen.findByRole("button", {name: "Expandir todos los grupos"});
        const group = screen.getByRole("button", {name: "Frutas, 1 ingrediente"});
        expect(group).toHaveAttribute("aria-expanded", "false");

        fireEvent.click(expandAll);
        expect(group).toHaveAttribute("aria-expanded", "true");
        expect(screen.getByRole("button", {name: "Contraer todos los grupos"})).toBeInTheDocument();
        expect(document.querySelector('[aria-label="Usar cantidad sugerida para Tomate"]'))
            .toHaveClass("is-hidden");

        fireEvent.click(screen.getByRole("button", {name: "Contraer todos los grupos"}));
        expect(group).toHaveAttribute("aria-expanded", "false");
    });

    it("restores the suggested quantity without changing inclusion", async () => {
        loadShoppingWorkspace.mockResolvedValue({
            catalog: {
                departments: [],
                suppliers: [],
                items: [{
                    id: "tomato",
                    name: "Tomate",
                    sku: "FOR-001",
                    active: true,
                    quantity: 10,
                    par_level: 30,
                    reorder_point: 10,
                    base_unit: "unidad",
                    department: {id: "produce", name: "Frutas"},
                    supplier: {id: "market", name: "Mercado"},
                }],
            },
            decisions: [{
                item_id: "tomato",
                quantity_override: 12,
                quantity_manually_overridden: true,
                included: false,
            }],
            pendingItemIds: [],
            lists: [],
        });

        render(<ShoppingPage/>);
        fireEvent.click(await screen.findByRole("button", {name: "Expandir todos los grupos"}));
        fireEvent.click(screen.getByRole("button", {name: "Usar cantidad sugerida para Tomate"}));

        await waitFor(() => expect(saveShoppingDecision).toHaveBeenCalledWith({
            itemId: "tomato",
            quantityOverride: null,
            quantityManuallyOverridden: false,
            included: false,
        }));
        expect(screen.getByRole("button", {name: "Incluir Tomate"})).toBeInTheDocument();
    });

    it("switches from recommendations to all ingredients for a list created from scratch", async () => {
        loadShoppingWorkspace.mockResolvedValue({
            catalog: {
                departments: [],
                suppliers: [],
                items: [
                    {
                        id: "tomato", name: "Tomate", active: true, quantity: 10, par_level: 30,
                        reorder_point: 10, base_unit: "unidad", department: {id: "produce", name: "Frutas"},
                    },
                    {
                        id: "flour", name: "Harina", active: true, quantity: 20, par_level: 20,
                        reorder_point: 5, base_unit: "lb", department: {id: "pantry", name: "Secos"},
                    },
                ],
            },
            decisions: [],
            pendingItemIds: [],
            lists: [],
        });

        render(<ShoppingPage/>);
        expect(await screen.findByRole("button", {name: "Frutas, 1 ingrediente"})).toBeInTheDocument();
        expect(screen.queryByRole("button", {name: "Secos, 1 ingrediente"})).not.toBeInTheDocument();

        const viewTrigger = screen.getByRole("button", {name: "Vista"});
        fireEvent.click(viewTrigger);
        const allIngredients = await screen.findByRole("button", {name: /Todos los ingredientes/});
        fireEvent.click(allIngredients);
        expect(await screen.findByRole("button", {name: "Secos, 1 ingrediente"})).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", {name: "Expandir todos los grupos"}));
        expect(await screen.findByText("Harina")).toBeInTheDocument();
        expect(screen.getByRole("button", {name: "Incluir Harina"})).toBeInTheDocument();
        expect(screen.getByLabelText("Cantidad a comprar de Harina")).toHaveValue(0);
    });
});
