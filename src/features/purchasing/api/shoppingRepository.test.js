import {beforeEach, describe, expect, it, vi} from "vitest";

const rpc = vi.hoisted(() => vi.fn());
const from = vi.hoisted(() => vi.fn());

vi.mock("../../../lib/supabase", () => ({
  supabase: {from, rpc},
}));

vi.mock("../../inventory/api/catalogRepository", () => ({
  loadCatalog: vi.fn(),
}));

vi.mock("../../inventory/inventoryEvents", () => ({
  announceActivityNotification: vi.fn(),
}));

import {cancelPurchaseList, loadPurchaseDashboardSummary} from "./shoppingRepository";

describe("purchase cancellation repository", () => {
  beforeEach(() => {
    rpc.mockReset();
    from.mockReset();
  });

  it("cancels a pending list through the transactional database function", async () => {
    rpc.mockResolvedValue({data: 2, error: null});

    await expect(cancelPurchaseList("list-id")).resolves.toBe(2);
    expect(rpc).toHaveBeenCalledWith("cancel_purchase_list", {target_list_id: "list-id"});
  });

  it("summarizes pending and current-month purchase orders", async () => {
    const pendingQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [{item_count: 2}, {item_count: 3}],
        error: null,
      }),
    };
    const monthlyQuery = {
      select: vi.fn().mockReturnThis(),
      gte: vi.fn().mockResolvedValue({
        data: [{status: "pending"}, {status: "received"}, {status: "received"}, {status: "cancelled"}],
        error: null,
      }),
    };
    from.mockReturnValueOnce(pendingQuery).mockReturnValueOnce(monthlyQuery);

    await expect(loadPurchaseDashboardSummary(new Date(2026, 8, 11))).resolves.toEqual({
      pendingOrders: 2,
      pendingItems: 5,
      monthlyOrders: 4,
      monthlyPending: 1,
      monthlyCompleted: 2,
      monthlyCancelled: 1,
    });
    expect(from).toHaveBeenNthCalledWith(1, "purchase_lists");
    expect(from).toHaveBeenNthCalledWith(2, "purchase_lists");
    expect(monthlyQuery.gte).toHaveBeenCalledWith("created_at", new Date(2026, 8, 1).toISOString());
  });
});
