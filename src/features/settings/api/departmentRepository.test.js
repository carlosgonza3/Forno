import {beforeEach, describe, expect, it, vi} from "vitest";

const rpc = vi.hoisted(() => vi.fn());

vi.mock("../../../lib/supabase", () => ({
  supabase: {rpc},
}));

import {createDepartment, deleteDepartment, loadDepartmentSettings} from "./departmentRepository";

describe("department repository", () => {
  beforeEach(() => {
    rpc.mockReset();
  });

  it("loads department usage counts", async () => {
    const departments = [{id: "drinks", name: "Bebidas", item_count: 4}];
    rpc.mockResolvedValue({data: departments, error: null});

    await expect(loadDepartmentSettings()).resolves.toEqual(departments);
    expect(rpc).toHaveBeenCalledWith("get_department_settings");
  });

  it("uses the transactional database operations for creation and confirmed deletion", async () => {
    rpc.mockResolvedValue({data: null, error: null});

    await createDepartment("Panadería");
    await deleteDepartment("bakery", {unassignItems: true});

    expect(rpc).toHaveBeenNthCalledWith(1, "create_inventory_department", {
      department_name: "Panadería",
    });
    expect(rpc).toHaveBeenNthCalledWith(2, "delete_inventory_department", {
      target_department_id: "bakery",
      unassign_items: true,
    });
  });
});
