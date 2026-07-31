import {beforeEach, describe, expect, it, vi} from "vitest";

const database = vi.hoisted(() => ({
  from: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
}));

vi.mock("../../../lib/supabase", () => ({
  supabase: {from: database.from},
}));

import {setCatalogItemIcon} from "./catalogRepository";

describe("catalog icon updates", () => {
  beforeEach(() => {
    database.from.mockReset();
    database.update.mockReset();
    database.eq.mockReset();
    database.from.mockReturnValue({update: database.update});
    database.update.mockReturnValue({eq: database.eq});
    database.eq.mockResolvedValue({error: null});
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
