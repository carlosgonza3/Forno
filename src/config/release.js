export const RELEASE_SCOPES = Object.freeze({
  FULL: "full",
  INVENTORY: "inventory",
  OPERATIONS: "operations",
});

export function normalizeReleaseScope(value, fallback = RELEASE_SCOPES.FULL) {
  if (Object.values(RELEASE_SCOPES).includes(value)) return value;
  return fallback;
}

export const releaseScope = normalizeReleaseScope(
  import.meta.env.VITE_RELEASE_SCOPE,
  import.meta.env.DEV ? RELEASE_SCOPES.FULL : RELEASE_SCOPES.OPERATIONS,
);
export const isInventoryRelease = releaseScope === RELEASE_SCOPES.INVENTORY;
export const isOperationsRelease = releaseScope === RELEASE_SCOPES.OPERATIONS;
