import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/**/*.smoke.test.ts"],
    setupFiles: ["tests/setup/isolate-cache.ts"],
    testTimeout: 10000,
  },
});
