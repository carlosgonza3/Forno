import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CatalogPage from "./CatalogPage";

const loadCatalog = vi.fn();
let authRole = "local";

vi.mock("../../auth/AuthProvider", () => ({
  useAuth: () => ({ role: authRole }),
}));

vi.mock("../api/catalogRepository", () => ({
  loadCatalog: (...args) => loadCatalog(...args),
  saveCatalogItem: vi.fn(),
  saveSupplier: vi.fn(),
  setCatalogItemActive: vi.fn(),
  setSupplierActive: vi.fn(),
}));

const produce = { id: "produce", name: "Frutas y verduras", sort_order: 10 };
const pantry = { id: "pantry", name: "Otros", sort_order: 99 };
const market = { id: "market", name: "Mercado", active: true };

function item(overrides) {
  return {
    id: overrides.id,
    name: overrides.name,
    sku: overrides.sku,
    base_unit: "lb",
    quantity: overrides.quantity,
    par_level: overrides.par,
    reorder_point: overrides.reorder,
    unit_cost: 1,
    package_size: null,
    package_unit: null,
    active: overrides.active ?? true,
    department: overrides.department,
    supplier: market,
  };
}

describe("CatalogPage inventory explorer", () => {
  afterEach(cleanup);

  beforeEach(() => {
    authRole = "local";
    loadCatalog.mockClear();
    loadCatalog.mockResolvedValue({
      departments: [produce, pantry],
      suppliers: [market],
      items: [
        item({ id: "tomato", name: "Tomate", sku: "FOR-001", quantity: 1, par: 10, reorder: 2, department: produce }),
        item({ id: "lime", name: "Limón", sku: "FOR-002", quantity: 8, par: 10, reorder: 2, department: produce }),
        item({ id: "flour", name: "Harina", sku: "FOR-003", quantity: 20, par: 20, reorder: 5, department: pantry }),
        item({ id: "retired", name: "Producto archivado", sku: "FOR-004", quantity: 0, par: 0, reorder: 0, department: pantry, active: false }),
      ],
    });
  });

  it("groups by department and filters the catalog by attention status", async () => {
    render(<CatalogPage />);

    expect(await screen.findByText("Tomate")).toBeInTheDocument();
    expect([...document.querySelectorAll(".catalog-tabs button")].map((button) => button.textContent.trim()))
      .toEqual(["Ingredientes", "Proveedores"]);
    expect(screen.getByRole("checkbox", { name: "Inactivos" }).closest(".catalog-panel-head"))
      .toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Inactivos" })).toBeChecked();
    expect(screen.getByLabelText("Agrupación")).toHaveValue("none");
    expect(screen.getByText("Producto archivado")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Frutas y verduras/ })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Agrupación"), { target: { value: "department" } });
    expect(await screen.findByRole("button", { name: /Frutas y verduras/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Otros/ })).toBeInTheDocument();
    expect(screen.getByText("Harina")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Críticos/ }));
    await waitFor(() => expect(screen.queryByText("Harina")).not.toBeInTheDocument());
    expect(screen.getByText("Tomate")).toBeInTheDocument();
  });

  it("places the contextual create action in the catalog header", async () => {
    authRole = "admin";
    render(<CatalogPage />);

    const createButton = await screen.findByRole("button", { name: /^Ingrediente$/ });
    expect(createButton).toHaveClass("catalog-create-button");
    expect(createButton.closest(".catalog-panel-head")).toBeInTheDocument();
    expect(createButton.closest(".catalog-tools")).not.toBeInTheDocument();
  });

  it("collapses and expands an inventory group", async () => {
    render(<CatalogPage />);
    await screen.findByText("Tomate");
    fireEvent.change(screen.getByLabelText("Agrupación"), { target: { value: "department" } });
    const groupButton = await screen.findByRole("button", { name: /Frutas y verduras/ });
    const group = groupButton.closest(".inventory-group");

    expect(group?.querySelector(".inventory-subgroup")).toBeInTheDocument();
    expect(group?.querySelector(".inventory-subgroup")).toContainElement(screen.getByText("Tomate"));

    fireEvent.click(groupButton);
    await waitFor(() => expect(groupButton).toHaveAttribute("aria-expanded", "false"));
    await waitFor(() => expect(screen.queryByText("Tomate")).not.toBeInTheDocument());
    expect(group?.querySelector(".inventory-subgroup")).not.toBeInTheDocument();

    fireEvent.click(groupButton);
    expect(await screen.findByText("Tomate")).toBeInTheDocument();
  });

  it("keeps the normal page layout while the table is used", async () => {
    render(<CatalogPage />);
    const tomato = await screen.findByText("Tomate");
    expect(screen.getByLabelText("Agrupación")).toBeInTheDocument();

    fireEvent.pointerDown(tomato);
    expect(screen.getByLabelText("Agrupación")).toBeInTheDocument();
    expect(screen.getByText("CATÁLOGO OPERATIVO")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Opciones/ }));
    expect(screen.queryByLabelText("Agrupación")).not.toBeInTheDocument();
    expect(screen.getByText("CATÁLOGO OPERATIVO")).toBeInTheDocument();
  });
});
