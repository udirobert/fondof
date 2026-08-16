import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Shared test runner for pure-logic suites (api + web libs).
 * Foundry tests (packages/contracts) run separately: `forge test`.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["packages/*/src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      // Web uses the "@/*" → src/* Next.js alias
      "@": path.resolve(__dirname, "packages/web/src"),
    },
  },
});
