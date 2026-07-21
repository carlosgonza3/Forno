export const RELEASE_SCOPES = Object.freeze({
  FULL: "full",
  INVENTORY: "inventory",
});

export function normalizeReleaseScope(value, fallback = RELEASE_SCOPES.FULL) {
  if (value === RELEASE_SCOPES.INVENTORY || value === RELEASE_SCOPES.FULL) return value;
  return fallback;
}

export const releaseScope = normalizeReleaseScope(
  import.meta.env.VITE_RELEASE_SCOPE,
  import.meta.env.DEV ? RELEASE_SCOPES.FULL : RELEASE_SCOPES.INVENTORY,
);
export const isInventoryRelease = releaseScope === RELEASE_SCOPES.INVENTORY;
