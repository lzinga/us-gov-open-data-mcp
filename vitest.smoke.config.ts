import { defineConfig } from "vitest/config";

/**
 * Live smoke tests against real government APIs (opt-in: `npm run test:smoke`).
 *
 * Keys come from the repo's .env (loaded quietly by tests/smoke/setup.ts).
 * Checks that need a missing key are skipped with a warning, or fail when
 * SMOKE_STRICT=1 (used by the scheduled CI workflow).
 */
export default defineConfig({
  test: {
    include: ["tests/smoke/**/*.smoke.test.ts"],
    setupFiles: ["tests/setup/isolate-cache.ts", "tests/smoke/setup.ts"],
    testTimeout: 90_000,
    hookTimeout: 90_000,
    // Show every check (including skipped ones and why) in the output.
    reporters: ["verbose"],
    // Many upstream APIs rate-limit per IP; run files one at a time.
    fileParallelism: false,
  },
});
