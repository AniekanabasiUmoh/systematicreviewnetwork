import { defineConfig } from "vitest/config";

/* Node environment, sequential, real network to remote Supabase. These are
 * integration tests against the live project's RLS — no mocking, because the
 * whole point is that the actual policies deny the actual anon key. */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 20000,
    hookTimeout: 20000,
    fileParallelism: false,
  },
});
