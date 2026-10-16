import {cleanup, fireEvent, render, screen, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import ShoppingPage from "./ShoppingPage";

const loadShoppingWorkspace = vi.fn();
const receivePurchaseList = vi.fn();
const cancelPurchaseList = vi.fn();
const saveShoppingDecision = vi.fn();

vi.mock("../api/shoppingRepository", () => ({
    cancelPurchaseList: (...args) => cancelPurchaseList(...args),
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
    cancelled_at: null,
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

const tomatoCatalogItem = {
    id: "tomato",
    name: "Tomate",
    sku: "FOR-001",
    base_unit: "lb",
    quantity: 1,
    par_level: 10,
    reorder_point: 2,
    unit_cost: 1,
    active: true,
    department: {id: "produce", name: "Frutas"},
    supplier: {id: "market", name: "Mercado"},
};

const shoppingItem = (overrides) => ({
    ...tomatoCatalogItem,
    ...overrides,
});

describe("ShoppingPage purchase receipt review", () => {
    afterEach(cleanup);

    beforeEach(() => {
        loadShoppingWorkspace.mockReset();
        receivePurchaseList.mockReset();
        cancelPurchaseList.mockReset();
        saveShoppingDecision.mockReset();
        loadShoppingWorkspace.mockResolvedValue({
            catalog: {items: [], departments: [], suppliers: []},
            decisions: [],
            pendingItemIds: [],
            lists: [pendingList],
        });
        receivePurchaseList.mockResolvedValue("transaction-id");
        cancelPurchaseList.mockResolvedValue(2);
    });

    it("reviews ordered and received quantities before adding inventory", async () => {
        loadShoppingWorkspace
            .mockResolvedValueOnce({
                catalog: {items: [], departments: [], suppliers: []},
                decisions: [],
                pendingItemIds: [],
                lists: [pendingList],
            })
            .mockResolvedValueOnce({
                catalog: {items: [tomatoCatalogItem], departments: [], suppliers: []},
                decisions: [{
                    item_id: "tomato",
                    quantity_override: null,
                    quantity_manually_overridden: false,
                    included: false,
                }],
                pendingItemIds: [],
                lists: [{...pendingList, status: "received", received_at: "2026-10-14T12:00:00Z"}],
            });
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

        expect(await screen.findByText("0 seleccionados")).toBeInTheDocument();
        expect(await screen.findByRole("button", {name: "Incluir Tomate"})).toBeInTheDocument();
    });

    it("confirms cancellation of a pending order without receiving inventory", async () => {
        const mascarpone = shoppingItem({
            id: "mascarpone",
            name: "Queso Mascarpone",
            sku: "FOR-090",
            quantity: 10,
            par_level: 10,
            reorder_point: 2,
            department: {id: "dairy", name: "Lácteos"},
        });
        const basil = shoppingItem({
            id: "basil",
            name: "Albahaca",
            sku: "FOR-091",
            quantity: 1,
            par_level: 3,
            reorder_point: 1,
        });
        const arugula = shoppingItem({
            id: "arugula",
            name: "Arúgula",
            sku: "FOR-092",
            quantity: 1,
            par_level: 4,
            reorder_point: 1,
        });
        const mascarponeList = {
            ...pendingList,
            item_count: 1,
            items: [{
                item_id: "mascarpone",
                item_name: "Queso Mascarpone",
                supplier_name: "Proveedor",
                base_unit: "lb",
                quantity_ordered: 3,
                quantity_received: null,
            }],
        };
        loadShoppingWorkspace
            .mockResolvedValueOnce({
                catalog: {items: [mascarpone, basil, arugula], departments: [], suppliers: []},
                decisions: [{
                    item_id: "mascarpone",
                    quantity_override: 3,
                    quantity_manually_overridden: true,
                    included: true,
                }],
                pendingItemIds: ["mascarpone"],
                lists: [mascarponeList],
            })
            .mockResolvedValueOnce({
                catalog: {items: [mascarpone, basil, arugula], departments: [], suppliers: []},
                decisions: [{
                    item_id: "mascarpone",
                    quantity_override: null,
                    quantity_manually_overridden: false,
                    included: false,
                }],
                pendingItemIds: [],
                lists: [{...mascarponeList, status: "cancelled", cancelled_at: "2026-10-15T18:00:00Z"}],
            });
        render(<ShoppingPage/>);

        fireEvent.click(await screen.findByRole("button", {name: /Lista #11111111/i}));
        fireEvent.click(screen.getByRole("button", {name: "Cancelar orden"}));

        const dialog = screen.getByRole("alertdialog", {name: "¿Cancelar esta orden?"});
        expect(dialog).toHaveTextContent("El inventario no cambiará");
        expect(cancelPurchaseList).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole("button", {name: "Confirmar cancelación"}));

        await waitFor(() => expect(cancelPurchaseList).toHaveBeenCalledWith(mascarponeList.id));
        expect(receivePurchaseList).not.toHaveBeenCalled();
        expect(await screen.findByText("La orden pendiente fue cancelada. No se modificó el inventario."))
            .toBeInTheDocument();
        expect(screen.getByText("2 seleccionados")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", {name: /Revisar y guardar/i}));
        const review = screen.getByRole("dialog", {name: "Lista para comprar"});
        expect(review).toHaveTextContent("Albahaca");
        expect(review).toHaveTextContent("Arúgula");
        expect(review).not.toHaveTextContent("Queso Mascarpone");
    });

    it("uses singular cancellation copy for an order with one ingredient", async () => {
        loadShoppingWorkspace.mockResolvedValue({
            catalog: {items: [], departments: [], suppliers: []},
            decisions: [],
            pendingItemIds: [],
            lists: [{...pendingList, item_count: 1, items: [pendingList.items[0]]}],
        });
        render(<ShoppingPage/>);

        fireEvent.click(await screen.findByRole("button", {name: /Lista #11111111/i}));
        fireEvent.click(screen.getByRole("button", {name: "Cancelar orden"}));

        expect(screen.getByRole("alertdialog", {name: "¿Cancelar esta orden?"}))
            .toHaveTextContent("El ingrediente quedará disponible para agregarlo a otra lista");
    });

    it("shows cancelled orders separately in history", async () => {
        loadShoppingWorkspace.mockResolvedValue({
            catalog: {items: [], departments: [], suppliers: []},
            decisions: [],
            pendingItemIds: [],
            lists: [{...pendingList, status: "cancelled", cancelled_at: "2026-09-11T12:00:00Z"}],
        });
        render(<ShoppingPage/>);

        expect(await screen.findByText("Cancelada")).toBeInTheDocument();
        fireEvent.click(screen.getByRole("tab", {name: /Canceladas/}));
        fireEvent.click(screen.getByRole("button", {name: /Lista #11111111/i}));
        expect(screen.getByText(/Cancelada.*sept/i)).toBeInTheDocument();
        expect(screen.queryByRole("button", {name: "Cancelar orden"})).not.toBeInTheDocument();
    });

    it("paginates every order status view in groups of ten", async () => {
        const lists = ["pending", "received", "cancelled"].flatMap((status, statusIndex) =>
            Array.from({length: 11}, (_, index) => ({
                ...pendingList,
                id: `${statusIndex + 1}${String(index).padStart(7, "0")}-1111-1111-1111-111111111111`,
                status,
                received_at: status === "received" ? "2026-09-10T12:00:00Z" : null,
                cancelled_at: status === "cancelled" ? "2026-09-11T12:00:00Z" : null,
            })),
        );
        loadShoppingWorkspace.mockResolvedValue({
            catalog: {items: [], departments: [], suppliers: []},
            decisions: [],
            pendingItemIds: [],
            lists,
        });
        render(<ShoppingPage/>);

        await screen.findByRole("tab", {name: /Todas/});
        expect(document.querySelectorAll(".purchase-history-entry")).toHaveLength(10);
        expect(screen.getByRole("navigation", {name: "Paginación de órdenes"}))
            .toHaveTextContent("Página 1 de 4");

        for (const tabName of ["Pendientes", "Completadas", "Canceladas"]) {
            fireEvent.click(screen.getByRole("tab", {name: new RegExp(tabName)}));
            expect(document.querySelectorAll(".purchase-history-entry")).toHaveLength(10);
            expect(screen.getByRole("navigation", {name: "Paginación de órdenes"}))
                .toHaveTextContent("Página 1 de 2");
            fireEvent.click(screen.getByRole("button", {name: "Página siguiente"}));
            expect(document.querySelectorAll(".purchase-history-entry")).toHaveLength(1);
            expect(screen.getByRole("navigation", {name: "Paginación de órdenes"}))
                .toHaveTextContent("Página 2 de 2");
        }
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
