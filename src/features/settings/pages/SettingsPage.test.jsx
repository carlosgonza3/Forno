import {cleanup, fireEvent, render, screen, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import SettingsPage from "./SettingsPage";

const updateDisplayName = vi.fn();
const loadDepartmentSettings = vi.fn();
const createDepartment = vi.fn();
const deleteDepartment = vi.fn();
let authRole = "local";

vi.mock("../../auth/AuthProvider", () => ({
  useAuth: () => ({profile: {display_name: "Carlos"}, role: authRole, updateDisplayName}),
}));

vi.mock("../api/departmentRepository", () => ({
  loadDepartmentSettings: (...args) => loadDepartmentSettings(...args),
  createDepartment: (...args) => createDepartment(...args),
  deleteDepartment: (...args) => deleteDepartment(...args),
}));

describe("SettingsPage profile name", () => {
  afterEach(cleanup);

  beforeEach(() => {
    authRole = "local";
    updateDisplayName.mockReset();
    updateDisplayName.mockResolvedValue({data: "Aidan Williams", error: null});
    loadDepartmentSettings.mockReset();
    loadDepartmentSettings.mockResolvedValue([
      {id: "beverages", name: "Bebidas", sort_order: 10, item_count: 3},
      {id: "bakery", name: "Panadería", sort_order: 20, item_count: 0},
    ]);
    createDepartment.mockReset();
    createDepartment.mockResolvedValue("new-id");
    deleteDepartment.mockReset();
    deleteDepartment.mockResolvedValue(0);
  });

  it("saves a normalized display name for the active user", async () => {
    render(<SettingsPage theme="light" onThemeChange={vi.fn()}/>);

    fireEvent.change(screen.getByLabelText("Nombre visible"), {target: {value: "  Aidan   Williams  "}});
    fireEvent.click(screen.getByRole("button", {name: "Guardar nombre"}));

    await waitFor(() => expect(updateDisplayName).toHaveBeenCalledWith("Aidan Williams"));
    expect(await screen.findByText("Nombre actualizado")).toBeInTheDocument();
  });

  it("lets administrators add a normalized department", async () => {
    authRole = "admin";
    render(<SettingsPage theme="light" onThemeChange={vi.fn()}/>);
    await screen.findByText("Bebidas");

    fireEvent.change(screen.getByLabelText("Nuevo departamento"), {target: {value: "  Cocina   fría  "}});
    fireEvent.click(screen.getByRole("button", {name: "Agregar"}));

    await waitFor(() => expect(createDepartment).toHaveBeenCalledWith("Cocina fría"));
  });

  it("renders every department after the appearance settings", async () => {
    authRole = "admin";
    render(<SettingsPage theme="light" onThemeChange={vi.fn()}/>);

    const departmentsHeading = await screen.findByRole("heading", {name: "Departamentos"});
    const appearanceHeading = screen.getByRole("heading", {name: "Elige cómo ver Forno"});
    expect(appearanceHeading.compareDocumentPosition(departmentsHeading)
      & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByLabelText("Departamentos de inventario")).toHaveTextContent("Bebidas");
    expect(screen.getByLabelText("Departamentos de inventario")).toHaveTextContent("Panadería");
  });

  it("blocks repeated department names regardless of case or extra spaces", async () => {
    authRole = "admin";
    render(<SettingsPage theme="light" onThemeChange={vi.fn()}/>);
    await screen.findByText("Bebidas");

    fireEvent.change(screen.getByLabelText("Nuevo departamento"), {target: {value: "  bebidas  "}});
    fireEvent.click(screen.getByRole("button", {name: "Agregar"}));

    expect(await screen.findByText("Ese departamento ya existe.")).toBeInTheDocument();
    expect(createDepartment).not.toHaveBeenCalled();
  });

  it("requires confirmation before unassigning ingredients from a deleted department", async () => {
    authRole = "admin";
    render(<SettingsPage theme="light" onThemeChange={vi.fn()}/>);
    await screen.findByText("Bebidas");

    fireEvent.click(screen.getByRole("button", {name: "Eliminar Bebidas"}));
    expect(screen.getByRole("alertdialog", {name: "¿Eliminar Bebidas?"})).toHaveTextContent("3 ingredientes");
    expect(deleteDepartment).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", {name: "Continuar y dejar sin asignar"}));
    await waitFor(() => expect(deleteDepartment).toHaveBeenCalledWith("beverages", {unassignItems: true}));
  });

  it("deletes an unused department without an unassignment confirmation", async () => {
    authRole = "admin";
    render(<SettingsPage theme="light" onThemeChange={vi.fn()}/>);
    await screen.findByText("Panadería");

    fireEvent.click(screen.getByRole("button", {name: "Eliminar Panadería"}));

    await waitFor(() => expect(deleteDepartment).toHaveBeenCalledWith("bakery", {unassignItems: false}));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});
