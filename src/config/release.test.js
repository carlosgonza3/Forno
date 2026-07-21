import { describe, expect, it } from "vitest";
import { normalizeReleaseScope, RELEASE_SCOPES } from "./release";

describe("release scope", () => {
  it("enables the inventory client release explicitly", () => {
    expect(normalizeReleaseScope("inventory")).toBe(RELEASE_SCOPES.INVENTORY);
  });

  it("keeps unfinished modules available only in the full development scope", () => {
    expect(normalizeReleaseScope("full")).toBe(RELEASE_SCOPES.FULL);
    expect(normalizeReleaseScope(undefined)).toBe(RELEASE_SCOPES.FULL);
    expect(normalizeReleaseScope("unexpected")).toBe(RELEASE_SCOPES.FULL);
  });

  it("supports a fail-closed inventory fallback for production builds", () => {
    expect(normalizeReleaseScope(undefined, RELEASE_SCOPES.INVENTORY)).toBe(RELEASE_SCOPES.INVENTORY);
  });
});
