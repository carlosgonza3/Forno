import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import {readFileSync} from "node:fs";

const packageMetadata = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));
const buildCommit = process.env.GITHUB_SHA ?? process.env.VITE_BUILD_COMMIT ?? "local";

export default defineConfig({
  // GitHub project pages are served from /<repository>/.
  // Keep local development and custom-domain builds rooted at `/`.
  base: process.env.GITHUB_ACTIONS === "true"
    ? `/${process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "Forno"}/`
    : "/",
  define: {
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(packageMetadata.version),
    "import.meta.env.VITE_BUILD_COMMIT": JSON.stringify(buildCommit),
  },
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.js",
  },
});
