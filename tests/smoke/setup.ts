/**
 * Smoke-test setup: load API keys from the repo's .env without printing anything.
 * Values already present in the environment (e.g. CI secrets) take precedence.
 */

import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
config({ path: join(repoRoot, ".env"), quiet: true });
