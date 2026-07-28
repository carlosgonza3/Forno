import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CatalogPage from "./CatalogPage";

const loadCatalog = vi.fn();
const addInventoryExistences = vi.fn();
const downloadInventoryCsv = vi.fn();
let authRole = "local";

vi.mock("../../auth/AuthProvider", () => ({
  useAuth: () => ({ role: authRole }),
}));

vi.mock("../api/catalogRepository", () => ({
  addInventoryExistences: (...args) => addInventoryExistences(...args),
  loadCatalog: (...args) => loadCatalog(...args),
  saveCatalogItem: vi.fn(),
  saveSupplier: vi.fn(),
  setCatalogItemActive: vi.fn(),
  setSupplierActive: vi.fn(),
}));

vi.mock("../inventoryCsv", async (importOriginal) => ({
  ...await importOriginal(),
  downloadInventoryCsv: (...args) => downloadInventoryCsv(...args),
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
    addInventoryExistences.mockClear();
    addInventoryExistences.mockResolvedValue([]);
    downloadInventoryCsv.mockClear();
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

  it("uses one clear inventory unit without package fields in the ingredient editor", async () => {
    authRole = "admin";
    render(<CatalogPage />);
    await screen.findByText("Tomate");

    const editButtons = screen.getAllByTitle("Editar");
    fireEvent.click(editButtons[0]);

    expect(screen.getByLabelText(/^Unidad de inventario/)).toBeInTheDocument();
    expect(screen.getByText("Existencia, niveles y costo usan esta misma unidad.")).toBeInTheDocument();
    expect(screen.getByText("Costo por unidad de inventario ($)")).toBeInTheDocument();
    expect(screen.getByText("SKU automático")).toBeInTheDocument();
    expect(screen.getByText("Identificador permanente administrado por el sistema.")).toBeInTheDocument();
    expect(screen.queryByLabelText("SKU")).not.toBeInTheDocument();
    expect(screen.queryByText("Tamaño del empaque")).not.toBeInTheDocument();
    expect(screen.queryByText("Unidad del empaque")).not.toBeInTheDocument();
  });

  it("exports the currently filtered, grouped, and sorted inventory result", async () => {
    render(<CatalogPage />);
    await screen.findByText("Tomate");

    fireEvent.change(screen.getByLabelText("Agrupación"), { target: { value: "department" } });
    fireEvent.click(screen.getByRole("button", { name: /Críticos/ }));
    fireEvent.click(screen.getByRole("button", { name: /Exportar CSV/ }));

    expect(screen.getByRole("heading", { name: "Personaliza tu archivo CSV" })).toBeInTheDocument();
    expect(screen.getByText(/Se exportarán 1 ingrediente/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Nombre del archivo"), { target: { value: "Conteo crítico" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "Costo por unidad de inventario (USD)" }));
    fireEvent.click(screen.getByRole("button", { name: "Descargar CSV" }));

    expect(downloadInventoryCsv).toHaveBeenCalledTimes(1);
    const [groups, options] = downloadInventoryCsv.mock.calls[0];
    expect(options.groupBy).toBe("department");
    expect(options.filename).toBe("Conteo crítico");
    expect(options.columnKeys).toContain("group");
    expect(options.columnKeys).not.toContain("unitCost");
    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe("Frutas y verduras");
    expect(groups[0].items.map((entry) => entry.name)).toEqual(["Tomate"]);
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
    expect(screen.getByRole("heading", { name: "Ingredientes y proveedores" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Opciones/ }));
    expect(screen.queryByLabelText("Agrupación")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ingredientes y proveedores" })).toBeInTheDocument();
  });

  it("lets any user add existence and review only edited ingredients", async () => {
    render(<CatalogPage />);
    await screen.findByText("Tomate");

    fireEvent.click(screen.getByRole("button", { name: "Agregar existencias" }));
    expect(screen.getByRole("heading", { name: "Agregar existencias" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Sumar una unidad a Tomate" }));
    expect(screen.getByLabelText("Agregar a Tomate")).toHaveValue("1");
    expect(screen.getByRole("button", { name: "Restar una unidad a Tomate" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sumar una unidad a Tomate" })).toBeInTheDocument();
    expect([...screen.getByLabelText("Agregar a Tomate").parentElement.querySelectorAll("button")]
      .map((button) => button.getAttribute("aria-label"))).toEqual([
        "Sumar una unidad a Tomate",
        "Restar una unidad a Tomate",
      ]);
    fireEvent.click(screen.getByRole("button", { name: "Sumar una unidad a Tomate" }));
    expect(screen.getByLabelText("Agregar a Tomate")).toHaveValue("2");
    fireEvent.click(screen.getByRole("button", { name: "Restar una unidad a Tomate" }));
    expect(screen.getByLabelText("Agregar a Tomate")).toHaveValue("1");

    fireEvent.change(screen.getByLabelText("Agregar a Tomate"), { target: { value: "3.5" } });
    expect(screen.getByLabelText("Agregar a Tomate").closest("tr")).toHaveClass("edited-row");

    fireEvent.mouseDown(document.querySelector(".existence-backdrop"));
    expect(screen.getByRole("alertdialog", { name: "¿Salir sin guardar?" })).toBeInTheDocument();
    expect(screen.getByText(/estas cantidades no se guardarán/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Seguir editando" }));
    expect(screen.getByLabelText("Agregar a Tomate")).toHaveValue("3.5");

    fireEvent.click(screen.getByRole("button", { name: /Continuar/ }));

    expect(screen.getByRole("heading", { name: "Revisar actualizaciones" })).toBeInTheDocument();
    expect(screen.getByText("+3.5 Libras (lb)")).toBeInTheDocument();
    expect(screen.getByText("4.5 Libras (lb)")).toBeInTheDocument();
    const reviewDialog = screen.getByRole("region", { name: "Agregar existencias" });
    expect(reviewDialog).not.toHaveTextContent("Harina");

    fireEvent.click(screen.getByRole("button", { name: /Confirmar y guardar/ }));
    await waitFor(() => expect(addInventoryExistences).toHaveBeenCalledWith([
      expect.objectContaining({ id: "tomato", increment: 3.5 }),
    ]));
  });
});
