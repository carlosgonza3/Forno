import {afterAll, afterEach, beforeEach, describe, expect, it} from "vitest";
import {
  DEFAULT_INVENTORY_TABLE_PREFERENCES,
  INVENTORY_TABLE_PREFERENCES_STORAGE_KEY,
  normalizeInventoryTablePreferences,
  readInventoryTablePreferences,
  saveInventoryTablePreferences,
} from "./inventoryTablePreferences";

const originalStorage = Object.getOwnPropertyDescriptor(window, "localStorage");

describe("inventory table preferences", () => {
  beforeEach(() => {
    const values = new Map();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, String(value)),
        clear: () => values.clear(),
      },
    });
  });

  afterEach(() => window.localStorage.clear());

  afterAll(() => {
    if (originalStorage) Object.defineProperty(window, "localStorage", originalStorage);
  });

  it("uses every applicable column by default", () => {
    expect(readInventoryTablePreferences()).toEqual(DEFAULT_INVENTORY_TABLE_PREFERENCES);
  });

  it("persists an independent selection for every inventory section", () => {
    const preferences = saveInventoryTablePreferences({
      ingredients: ["stock", "status"],
      processed: ["last-note", "last-note-at"],
      beverages: ["updated-at"],
    });

    expect(preferences).toEqual({
      ingredients: ["stock", "status"],
      processed: ["last-note", "last-note-at"],
      beverages: ["updated-at"],
    });
    expect(JSON.parse(window.localStorage.getItem(INVENTORY_TABLE_PREFERENCES_STORAGE_KEY)))
      .toEqual(preferences);
    expect(readInventoryTablePreferences()).toEqual(preferences);
  });

  it("ignores unknown columns and repairs missing sections", () => {
    expect(normalizeInventoryTablePreferences({ingredients: ["stock", "unknown"]})).toEqual({
      ingredients: ["stock"],
      processed: DEFAULT_INVENTORY_TABLE_PREFERENCES.processed,
      beverages: DEFAULT_INVENTORY_TABLE_PREFERENCES.beverages,
    });
  });
});
