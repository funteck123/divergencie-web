import { defineConfig } from "vitest/config";
import path from "path";

// Tests for the new UI (ui2/ and app/v2/). Pure-node tests for older code stay on `node --test` (npm test).
export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname) } },
  test: {
    include: ["ui2/**/*.test.{ts,tsx}", "app/v2/**/*.test.{ts,tsx}"],
    environment: "node",
    restoreMocks: true,
  },
});
