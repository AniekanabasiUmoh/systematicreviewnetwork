import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

/* Node environment, sequential, real network to remote Supabase. These are
 * integration tests against the live project's RLS — no mocking, because the
 * whole point is that the actual policies deny the actual anon key.
 *
 * `server-only` is aliased to an empty module: it exists purely to make Next
 * fail the build if a server module is imported from a client component, and
 * has no meaning (or Node entrypoint) under vitest. */
export default defineConfig({
  resolve: {
    alias: {
      "server-only": resolve(__dirname, "tests/stubs/server-only.ts"),
      "@": resolve(__dirname),
    },
  },
  test: {
    environment: "node",
    setupFiles: ["tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
    testTimeout: 20000,
    hookTimeout: 20000,
    fileParallelism: false,
  },
});
