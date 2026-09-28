/**
 * Global test setup: point the disk cache at a throwaway directory.
 *
 * src/shared/client.ts resolves its cache directory from XDG_CACHE_HOME (or
 * ~/.cache) when it is first imported, and several tests call clearCache()
 * on every module. Without this, `npm test` reads and rewrites the
 * developer's real ~/.cache/us-gov-open-data-mcp cache.
 *
 * Setup files run before each test file's imports, so every module graph
 * sees the temporary directory.
 */

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll } from "vitest";

const cacheHome = mkdtempSync(join(tmpdir(), "govdata-test-cache-"));
process.env.XDG_CACHE_HOME = cacheHome;

afterAll(() => {
  rmSync(cacheHome, { recursive: true, force: true });
});
