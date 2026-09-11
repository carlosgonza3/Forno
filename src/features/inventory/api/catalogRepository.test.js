import {beforeEach, describe, expect, it, vi} from "vitest";

const database = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
}));

vi.mock("../../../lib/supabase", () => ({
  supabase: {from: database.from, rpc: database.rpc},
}));

import {loadCatalog, setCatalogItemIcon} from "./catalogRepository";

describe("catalog icon updates", () => {
  beforeEach(() => {
    database.from.mockReset();
    database.rpc.mockReset();
    database.update.mockReset();
    database.eq.mockReset();
    database.from.mockReturnValue({update: database.update});
    database.update.mockReturnValue({eq: database.eq});
    database.eq.mockResolvedValue({error: null});
  });

  it("attaches the latest historical notes to regular and processed inventory items", async () => {
    function queryResult(data) {
      const promise = Promise.resolve({data, error: null});
      const query = {
        select: vi.fn(() => query),
        order: vi.fn(() => query),
        then: promise.then.bind(promise),
      };
      return query;
    }

    database.from.mockImplementation((table) => queryResult({
      inventory_items: [{id: "tomato", name: "Tomate"}],
      processed_inventory_items: [{id: "pesto", name: "Pesto"}],
      departments: [],
      suppliers: [],
    }[table]));
    database.rpc.mockResolvedValue({
      error: null,
      data: [
        {inventory_type: "ingredient", item_id: "tomato", note: "Conteo de apertura", updated_at: "2026-09-11"},
        {inventory_type: "processed", item_id: "pesto", note: "Producción diaria", updated_at: "2026-09-11"},
      ],
    });

    const catalog = await loadCatalog();

    expect(database.rpc).toHaveBeenCalledWith("get_latest_inventory_notes");
    expect(catalog.items[0]).toMatchObject({last_note: "Conteo de apertura"});
    expect(catalog.processedItems[0]).toMatchObject({last_note: "Producción diaria"});
  });

  it("updates only the selected icon fields and timestamp", async () => {
    await setCatalogItemIcon("tomato", {iconKey: "produce", iconEmoji: ""});

    expect(database.from).toHaveBeenCalledWith("inventory_items");
    expect(database.update).toHaveBeenCalledWith({
      icon_key: "produce",
      icon_emoji: null,
      updated_at: expect.any(String),
    });
    expect(database.eq).toHaveBeenCalledWith("id", "tomato");
  });
});
