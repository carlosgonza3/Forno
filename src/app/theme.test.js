import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { applyTheme, initializeTheme, readTheme, THEME_STORAGE_KEY } from "./theme";

const originalStorage = Object.getOwnPropertyDescriptor(window, "localStorage");

describe("application theme", () => {
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

  afterEach(() => {
    window.localStorage.clear();
    delete document.documentElement.dataset.theme;
    document.documentElement.style.colorScheme = "";
  });

  afterAll(() => {
    if (originalStorage) Object.defineProperty(window, "localStorage", originalStorage);
  });

  it("uses light mode when no valid preference exists", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "unknown");
    expect(readTheme()).toBe("light");
    expect(initializeTheme()).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("applies and persists dark mode", () => {
    expect(applyTheme("dark")).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
  });
});
