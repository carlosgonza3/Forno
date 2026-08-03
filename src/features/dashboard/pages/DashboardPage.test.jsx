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
    expect(document.querySelector(".inventory-activity-card")).not.toHaveClass("is-expanded");
    const currentDayButton = screen.getByRole("button", {
      name: new RegExp(`^${today.getDate()} de `, "i"),
    });
    expect(currentDayButton).toHaveAttribute("aria-pressed", "true");
    const dayButton = await screen.findByRole("button", {
      name: new RegExp(`${activityDay} de .*, 2 actividades`, "i"),
    });
    expect(dayButton.querySelector("i")).toBeInTheDocument();

    fireEvent.click(dayButton);
    expect(document.querySelector(".inventory-activity-card")).not.toHaveClass("is-expanded");
    expect(await screen.findByText("2 actividades")).toBeInTheDocument();
    expect(screen.getByText(/Ana/)).toBeInTheDocument();
    expect(screen.getByText(/Carlos/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", {name: "Expandir"}));
    expect(document.querySelector(".inventory-activity-card")).toHaveClass("is-expanded");
  });
});
