import {describe, expect, it} from "vitest";
import {RELEASE_SCOPES} from "../config/release";
import {initialPageForRelease, navigationForRelease, PAGE_TITLES} from "./navigation";

describe("application navigation", () => {
  it("limits the inventory release to inventory", () => {
    expect(navigationForRelease(RELEASE_SCOPES.INVENTORY).map(({id}) => id))
      .toEqual(["inventory"]);
    expect(initialPageForRelease(RELEASE_SCOPES.INVENTORY)).toBe("inventory");
  });

  it("exposes only approved operations pages in production", () => {
    expect(navigationForRelease(RELEASE_SCOPES.OPERATIONS).map(({id}) => id))
      .toEqual(["dashboard", "inventory", "shopping"]);
    expect(initialPageForRelease(RELEASE_SCOPES.OPERATIONS)).toBe("dashboard");
  });

  it("keeps a title for every full navigation destination", () => {
    for (const {id} of navigationForRelease(RELEASE_SCOPES.FULL)) {
      expect(PAGE_TITLES[id]).toBeTruthy();
    }
  });
});
