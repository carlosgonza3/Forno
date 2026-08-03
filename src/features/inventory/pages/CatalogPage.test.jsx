import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CatalogPage from "./CatalogPage";

const loadCatalog = vi.fn();
const saveCatalogItem = vi.fn();
const setCatalogItemIcon = vi.fn();
const setInventoryExistences = vi.fn();
const setProcessedInventoryExistences = vi.fn();
const downloadInventoryCsv = vi.fn();
let authRole = "local";

vi.mock("../../auth/AuthProvider", () => ({
  useAuth: () => ({ role: authRole }),
}));

vi.mock("../api/catalogRepository", () => ({
  setInventoryExistences: (...args) => setInventoryExistences(...args),
  setProcessedInventoryExistences: (...args) => setProcessedInventoryExistences(...args),
  loadCatalog: (...args) => loadCatalog(...args),
  saveCatalogItem: (...args) => saveCatalogItem(...args),
  saveProcessedCatalogItem: vi.fn(),
  setCatalogItemIcon: (...args) => setCatalogItemIcon(...args),
  saveSupplier: vi.fn(),
  setCatalogItemActive: vi.fn(),
  setProcessedCatalogItemActive: vi.fn(),
  setSupplierActive: vi.fn(),
}));

vi.mock("../inventoryCsv", async (importOriginal) => ({
  ...await importOriginal(),
  downloadInventoryCsv: (...args) => downloadInventoryCsv(...args),
}));

vi.mock("emoji-picker-react", () => ({
  default: ({autoFocusSearch, onEmojiClick, theme}) => <button type="button" aria-label="pizza"
    data-autofocus={autoFocusSearch ? "true" : "false"} data-theme={theme}
    onClick={() => onEmojiClick({emoji: "🍕"})}>🍕</button>,
  EmojiStyle: {NATIVE: "native"},
  Theme: {AUTO: "auto", LIGHT: "light"},
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
    setInventoryExistences.mockClear();
    setProcessedInventoryExistences.mockReset();
    setProcessedInventoryExistences.mockResolvedValue([]);
    saveCatalogItem.mockReset();
    saveCatalogItem.mockResolvedValue({id: "tomato"});
    setCatalogItemIcon.mockReset();
    setCatalogItemIcon.mockResolvedValue(undefined);
    setInventoryExistences.mockResolvedValue([]);
    downloadInventoryCsv.mockClear();
    loadCatalog.mockResolvedValue({
      departments: [produce, pantry],
      suppliers: [market],
      iconFieldAvailable: true,
      emojiFieldAvailable: true,
      items: [
        item({ id: "tomato", name: "Tomate", sku: "FOR-001", quantity: 1, par: 10, reorder: 2, department: produce }),
        item({ id: "lime", name: "Limón", sku: "FOR-002", quantity: 8, par: 10, reorder: 2, department: produce }),
        item({ id: "flour", name: "Harina", sku: "FOR-003", quantity: 20, par: 20, reorder: 5, department: pantry }),
        item({ id: "retired", name: "Producto archivado", sku: "FOR-004", quantity: 0, par: 0, reorder: 0, department: pantry, active: false }),
      ],
      processedItems: [
        item({id: "pesto", name: "Pesto", sku: "PROC-001", quantity: 500, par: 0, reorder: 0}),
      ],
    });
  });

  it("groups by department and filters the catalog by attention status", async () => {
    render(<CatalogPage />);

    expect(await screen.findByText("Tomate")).toBeInTheDocument();
    expect([...document.querySelectorAll(".catalog-tabs button")].map((button) => button.textContent.trim()))
      .toEqual(["Ingredientes", "Ingredientes Procesados", "Proveedores"]);
    expect(screen.getByRole("menubar", { name: "Opciones de tabla" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("menuitem", { name: "Agrupación" }));
    expect(await screen.findByRole("menuitemradio", { name: "Sin agrupar" })).toHaveAttribute(
      "aria-checked", "true",
    );
    expect(screen.queryByText("Producto archivado")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Frutas y verduras/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("menuitemradio", { name: "Departamento" }));
    expect(await screen.findByRole("button", { name: /Frutas y verduras/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Otros/ })).toBeInTheDocument();
    expect(screen.getByText("Harina")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("menuitem", { name: "Estado" }));
    fireEvent.click(await screen.findByRole("menuitemradio", { name: /Críticos/ }));
    await waitFor(() => expect(screen.queryByText("Harina")).not.toBeInTheDocument());
    expect(screen.getByText("Tomate")).toBeInTheDocument();
  });

  it("shows processed ingredients in their own inventory tab", async () => {
    render(<CatalogPage />);
    await screen.findByText("Tomate");

    fireEvent.click(screen.getByRole("button", {name: "Ingredientes Procesados"}));

    expect(await screen.findByText("Pesto")).toBeInTheDocument();
    expect(screen.queryByText("Tomate")).not.toBeInTheDocument();
    expect(screen.getByText(/500/)).toBeInTheDocument();
    expect(screen.queryByRole("menubar", {name: "Opciones de tabla"})).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", {name: "Buscar ingrediente"})).toBeInTheDocument();
    expect(document.querySelector(".inventory-results-bar")).not.toBeInTheDocument();
  });

  it("updates processed-item existences through the separate processed inventory workflow", async () => {
    render(<CatalogPage />);
    await screen.findByText("Tomate");

    fireEvent.click(screen.getByRole("button", {name: "Ingredientes Procesados"}));
    await screen.findByText("Pesto");
    fireEvent.click(screen.getByRole("button", {name: "Actualizar existencias"}));

    fireEvent.change(screen.getByLabelText("Nueva existencia de Pesto"), {target: {value: "475"}});
    fireEvent.change(screen.getByLabelText("Nota de Pesto"), {target: {value: "Conteo de producción"}});
    fireEvent.click(screen.getByRole("button", {name: /Continuar/}));
    expect(screen.getByRole("heading", {name: "Revisar actualizaciones"})).toBeInTheDocument();
    expect(screen.getByText("475 Libras (lb)")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", {name: /Confirmar y guardar/}));
    await waitFor(() => expect(setProcessedInventoryExistences).toHaveBeenCalledWith([
      expect.objectContaining({id: "pesto", newQuantity: 475, note: "Conteo de producción"}),
    ]));
    expect(setInventoryExistences).not.toHaveBeenCalled();
  });

  it("can include or hide deactivated ingredients from the inventory toolbar", async () => {
    render(<CatalogPage />);
    await screen.findByText("Tomate");

    expect(screen.queryByText("Producto archivado")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("menuitem", {name: "Visibilidad"}));
    expect(await screen.findByRole("menuitemradio", {name: "Solo activos"}))
      .toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("menuitemradio", {name: "Incluir desactivados"}));
    expect(await screen.findByText("Producto archivado")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("menuitem", {name: "Visibilidad"}));
    fireEvent.click(await screen.findByRole("menuitemradio", {name: "Solo activos"}));
    await waitFor(() => expect(screen.queryByText("Producto archivado")).not.toBeInTheDocument());
  });

  it("places the contextual create action in the catalog header", async () => {
    authRole = "admin";
    render(<CatalogPage />);

    const createButton = await screen.findByRole("button", { name: /^Ingrediente$/ });
    expect(createButton).toHaveClass("catalog-create-button");
    expect(createButton.closest(".catalog-item-create-row")).toBeInTheDocument();
    expect(createButton.closest(".catalog-item-create-row")?.nextElementSibling)
      .toHaveClass("catalog-data-toolbar");
    expect(createButton.closest(".catalog-tools")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", {name: "Proveedores"}));
    const supplierButton = screen.getByRole("button", {name: /^Proveedor$/});
    expect(supplierButton.closest(".catalog-item-create-row")?.nextElementSibling)
      .toHaveClass("catalog-data-toolbar");
  });

  it("uses one clear inventory unit without package fields in the ingredient editor", async () => {
    authRole = "admin";
    render(<CatalogPage />);
    await screen.findByText("Tomate");

    const editButtons = screen.getAllByTitle("Editar");
    fireEvent.click(editButtons[0]);

    expect(screen.getByRole("dialog", { name: "Editar ingrediente" })).toHaveClass("ingredient-sheet");
    expect(screen.getByLabelText(/^Unidad de inventario/)).toBeInTheDocument();
    expect(screen.getByText("Existencia, niveles y costo usan esta misma unidad.")).toBeInTheDocument();
    expect(screen.getByText("Costo por unidad de inventario ($)")).toBeInTheDocument();
    expect(screen.queryByText("SKU automático")).not.toBeInTheDocument();
    expect(screen.queryByText("Identificador permanente administrado por el sistema.")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("SKU")).not.toBeInTheDocument();
    expect(screen.queryByText("Tamaño del empaque")).not.toBeInTheDocument();
    expect(screen.queryByText("Unidad del empaque")).not.toBeInTheDocument();
  });

  it("selects and persists a curated ingredient icon while editing", async () => {
    authRole = "admin";
    render(<CatalogPage />);
    await screen.findByText("Tomate");

    const tomatoRow = screen.getByText("Tomate").closest("tr");
    fireEvent.click(tomatoRow.querySelector('button[title="Editar"]'));
    const iconTrigger = screen.getByRole("button", {name: /Elegir ícono/});
    expect(iconTrigger.closest("[data-slot='input-group-addon']")).toHaveAttribute("data-interactive");
    fireEvent.click(iconTrigger);
    expect(screen.getByRole("tab", {name: "Íconos"})).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByRole("tab", {name: "Recomendados"})).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText("Buscar ícono")).toHaveFocus());
    fireEvent.click(screen.getByRole("radio", {name: "Vegetales"}));
    expect(screen.getByRole("button", {name: /Actual: Vegetales/})).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", {name: /Elegir ícono/}));
    expect(screen.getByRole("radio", {name: "General"})).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Buscar ícono"), {target: {value: "vino"}});
    expect(screen.getByRole("radio", {name: "Vinos"})).toBeInTheDocument();
    expect(screen.queryByRole("radio", {name: "General"})).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", {name: "Guardar cambios"}));

    await waitFor(() => expect(saveCatalogItem).toHaveBeenCalledWith(
      expect.objectContaining({id: "tomato", iconKey: "produce"}),
    ));
  });

  it("updates an ingredient icon directly from the inventory table", async () => {
    authRole = "admin";
    render(<CatalogPage />);
    await screen.findByText("Tomate");

    fireEvent.click(screen.getByRole("button", {name: "Cambiar ícono de Tomate"}));
    await waitFor(() => expect(screen.getByLabelText("Buscar ícono")).toHaveFocus());
    fireEvent.click(screen.getByRole("radio", {name: "Vegetales"}));

    await waitFor(() => expect(setCatalogItemIcon).toHaveBeenCalledWith("tomato", {
      iconKey: "produce",
      iconEmoji: "",
    }));
    expect(screen.queryByRole("dialog", {name: "Editar ingrediente"})).not.toBeInTheDocument();
  });

  it("selects any emoji from the complete searchable picker", async () => {
    authRole = "admin";
    render(<CatalogPage />);
    await screen.findByText("Tomate");

    const tomatoRow = screen.getByText("Tomate").closest("tr");
    fireEvent.click(tomatoRow.querySelector('button[title="Editar"]'));
    fireEvent.click(screen.getByRole("button", {name: /Elegir ícono/}));
    fireEvent.click(screen.getByRole("tab", {name: "Emojis"}));
    const emoji = await screen.findByRole("button", {name: "pizza"});
    expect(emoji).toHaveAttribute("data-theme", "light");
    expect(emoji).toHaveAttribute("data-autofocus", "true");
    fireEvent.click(emoji);

    expect(screen.getByRole("button", {name: /Actual: 🍕/})).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", {name: "Guardar cambios"}));
    await waitFor(() => expect(saveCatalogItem).toHaveBeenCalledWith(
      expect.objectContaining({id: "tomato", iconKey: "", iconEmoji: "🍕"}),
    ));
  });

  it("exports the currently filtered, grouped, and sorted inventory result", async () => {
    render(<CatalogPage />);
    await screen.findByText("Tomate");

    fireEvent.click(screen.getByRole("menuitem", { name: "Agrupación" }));
    fireEvent.click(await screen.findByRole("menuitemradio", { name: "Departamento" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Estado" }));
    fireEvent.click(await screen.findByRole("menuitemradio", { name: /Críticos/ }));
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
    fireEvent.click(screen.getByRole("menuitem", { name: "Agrupación" }));
    fireEvent.click(await screen.findByRole("menuitemradio", { name: "Departamento" }));
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
    expect(screen.getByRole("menuitem", { name: "Agrupación" })).toBeInTheDocument();

    fireEvent.pointerDown(tomato);
    expect(screen.getByRole("menuitem", { name: "Agrupación" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ingredientes y proveedores" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("menuitem", { name: "Agrupación" }));
    expect(await screen.findByRole("menuitemradio", { name: "Sin agrupar" })).toBeInTheDocument();
    expect(screen.getByRole("menubar", { name: "Opciones de tabla" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ingredientes y proveedores" })).toBeInTheDocument();
  });

  it("lets any user enter the final existence with a note and review only edited ingredients", async () => {
    render(<CatalogPage />);
    await screen.findByText("Tomate");

    fireEvent.click(screen.getByRole("button", { name: "Actualizar existencias" }));
    expect(screen.getByRole("heading", { name: "Actualizar existencias" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Aumentar una unidad de Tomate" }));
    expect(screen.getByLabelText("Nueva existencia de Tomate")).toHaveValue("2");
    expect(screen.getByRole("button", { name: "Disminuir una unidad de Tomate" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aumentar una unidad de Tomate" })).toBeInTheDocument();
    expect([...screen.getByLabelText("Nueva existencia de Tomate").parentElement.querySelectorAll("button")]
      .map((button) => button.getAttribute("aria-label"))).toEqual([
        "Aumentar una unidad de Tomate",
        "Disminuir una unidad de Tomate",
    ]);
    fireEvent.click(screen.getByRole("button", { name: "Disminuir una unidad de Tomate" }));
    expect(screen.getByLabelText("Nueva existencia de Tomate")).toHaveValue("1");
    fireEvent.click(screen.getByRole("button", { name: "Disminuir una unidad de Tomate" }));
    expect(screen.getByLabelText("Nueva existencia de Tomate")).toHaveValue("0");
    expect(screen.getByRole("button", { name: "Disminuir una unidad de Tomate" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Nueva existencia de Tomate"), { target: { value: "3.5" } });
    fireEvent.change(screen.getByLabelText("Nota de Tomate"), { target: { value: "Conteo después de entrega" } });
    expect(screen.getByLabelText("Nueva existencia de Tomate").closest("tr")).toHaveClass("edited-row");

    fireEvent.mouseDown(document.querySelector(".existence-backdrop"));
    expect(screen.getByRole("alertdialog", { name: "¿Salir sin guardar?" })).toBeInTheDocument();
    expect(screen.getByText(/las cantidades y sus notas no se guardarán/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Seguir editando" }));
    expect(screen.getByLabelText("Nueva existencia de Tomate")).toHaveValue("3.5");

    fireEvent.click(screen.getByRole("button", { name: /Continuar/ }));

    expect(screen.getByRole("heading", { name: "Revisar actualizaciones" })).toBeInTheDocument();
    expect(screen.getByText("+2.5 Libras (lb)")).toBeInTheDocument();
    expect(screen.getByText("3.5 Libras (lb)")).toBeInTheDocument();
    expect(screen.getByText("Conteo después de entrega")).toBeInTheDocument();
    const reviewDialog = screen.getByRole("region", { name: "Actualizar existencias" });
    expect(reviewDialog).not.toHaveTextContent("Harina");

    fireEvent.click(screen.getByRole("button", { name: /Confirmar y guardar/ }));
    await waitFor(() => expect(setInventoryExistences).toHaveBeenCalledWith([
      expect.objectContaining({ id: "tomato", newQuantity: 3.5, note: "Conteo después de entrega" }),
    ]));
  });
});
