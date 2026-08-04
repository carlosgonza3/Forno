import {cleanup, fireEvent, render, screen, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import DashboardPage from "./DashboardPage";

const loadCatalog = vi.fn();
const loadInventoryAdditionTransactions = vi.fn();

vi.mock("../../inventory/api/catalogRepository", () => ({
  loadCatalog: (...args) => loadCatalog(...args),
  loadInventoryAdditionTransactions: (...args) => loadInventoryAdditionTransactions(...args),
}));

function transaction(id, date, actor) {
  return {
    id,
    created_at: date.toISOString(),
    created_by: actor,
    actor_name: actor,
    item_count: 1,
    items: [],
  };
}

describe("Dashboard inventory activity views", () => {
  afterEach(cleanup);

  beforeEach(() => {
    loadCatalog.mockReset();
    loadCatalog.mockResolvedValue({items: [], suppliers: [], processedItems: []});
    loadInventoryAdditionTransactions.mockReset();
    loadInventoryAdditionTransactions.mockResolvedValue({transactions: [], total: 0, page: 0, pageSize: 5});
  });

  it("opens inventory with the critical stock filter from the critical metric", async () => {
    const onNavigate = vi.fn();
    loadCatalog.mockResolvedValue({
      items: [{id: "tomato", name: "Tomate", active: true, quantity: 0, reorder_point: 1, par_level: 3}],
      suppliers: [],
      processedItems: [],
    });

    render(<DashboardPage onNavigate={onNavigate}/>);
    fireEvent.click(await screen.findByRole("button", {name: /^Críticos/}));

    expect(onNavigate).toHaveBeenCalledWith("inventory", {stockFilter: "critical"});
  });

  it("shows the latest inventory movement in the service banner", async () => {
    render(<DashboardPage onNavigate={vi.fn()} lastInventoryMovement={{
      id: "1",
      event_type: "processed_updated",
      created_at: "2026-08-04T13:00:00.000Z",
    }}/>);

    expect(screen.getByText("Última actualización")).toBeInTheDocument();
    expect(screen.getByText(/4 de agosto de 2026/)).toBeInTheDocument();
    expect(screen.queryByText(/Próximo servicio/)).not.toBeInTheDocument();
  });

  it("opens inventory with the out-of-stock filter from the no-existence metric", async () => {
    const onNavigate = vi.fn();
    loadCatalog.mockResolvedValue({
      items: [{id: "tomato", name: "Tomate", active: true, quantity: 0, reorder_point: 1, par_level: 3}],
      suppliers: [],
      processedItems: [],
    });

    render(<DashboardPage onNavigate={onNavigate}/>);
    fireEvent.click(await screen.findByRole("button", {name: /^Sin existencia/}));

    expect(onNavigate).toHaveBeenCalledWith("inventory", {stockFilter: "out"});
  });

  it("shows the newest inventory activity first in list view", async () => {
    const older = transaction("older", new Date(2026, 7, 2, 9, 0), "Ana");
    const newer = transaction("newer", new Date(2026, 7, 4, 18, 30), "Carlos");
    loadInventoryAdditionTransactions.mockResolvedValue({
      transactions: [older, newer], total: 2, page: 0, pageSize: 5,
    });

    render(<DashboardPage onNavigate={vi.fn()}/>);
    await screen.findByText(/Carlos/);

    expect([...document.querySelectorAll(
      ".inventory-activity-card > .inventory-transaction-list .transaction-copy small",
    )].map((entry) => entry.textContent)).toEqual([
      "1 ingrediente · Carlos",
      "1 ingrediente · Ana",
    ]);
  });

  it("loads a month calendar and shows every activity for the selected day", async () => {
    const today = new Date();
    const activityDay = Math.min(12, new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate());
    const first = transaction("first", new Date(today.getFullYear(), today.getMonth(), activityDay, 9, 15), "Ana");
    const second = transaction("second", new Date(today.getFullYear(), today.getMonth(), activityDay, 16, 30), "Carlos");
    loadInventoryAdditionTransactions.mockImplementation(async (options) => {
      if (options.dateFrom) return {transactions: [second, first], total: 2, page: 0, pageSize: 1000};
      return {transactions: [second], total: 2, page: 0, pageSize: options.pageSize};
    });

    render(<DashboardPage onNavigate={vi.fn()}/>);
    await screen.findByText(/Carlos/);
    fireEvent.click(screen.getByRole("button", {name: "Calendario"}));

    await waitFor(() => expect(loadInventoryAdditionTransactions).toHaveBeenCalledWith(expect.objectContaining({
      page: 0,
      pageSize: 1000,
      dateFrom: expect.any(String),
      dateTo: expect.any(String),
    })));
    const currentDayButton = screen.getByRole("button", {
      name: new RegExp(`^${today.getDate()} de `, "i"),
    });
    expect(currentDayButton).toHaveAttribute("aria-pressed", "true");
    const dayButton = await screen.findByRole("button", {
      name: new RegExp(`${activityDay} de .*, 2 actividades`, "i"),
    });
    expect(dayButton.querySelector("i")).toBeInTheDocument();

    fireEvent.click(dayButton);
    expect(await screen.findByText("2 actividades")).toBeInTheDocument();
    expect(screen.getByText(/Ana/)).toBeInTheDocument();
    expect(screen.getByText(/Carlos/)).toBeInTheDocument();
    expect([...document.querySelectorAll(".calendar-day-list .transaction-copy small")]
      .map((entry) => entry.textContent)).toEqual([
      "1 ingrediente · Ana",
      "1 ingrediente · Carlos",
    ]);

    expect(screen.queryByRole("button", {name: "Expandir"})).not.toBeInTheDocument();
    expect(screen.getByRole("separator", {name: "Redimensionar paneles del dashboard"}))
      .toBeInTheDocument();
    expect(document.querySelectorAll(".inventory-metric")).toHaveLength(4);
    expect(document.querySelector(".stat-card")).not.toBeInTheDocument();
  });
});
