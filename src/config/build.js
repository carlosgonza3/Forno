const version = import.meta.env.VITE_APP_VERSION;
const fullCommit = import.meta.env.VITE_BUILD_COMMIT;
const commit = fullCommit === "local" ? fullCommit : fullCommit.slice(0, 7);
const environment = import.meta.env.PROD ? "Producción" : "Desarrollo";

export const applicationBuild = Object.freeze({
  environment,
  version,
  commit: fullCommit,
  shortCommit: commit,
  label: `${environment} · v${version} · ${commit}`,
});
