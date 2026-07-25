/* `server-only` is a build-time guard for Next, not a runtime module with a
   Node entrypoint. Under vitest it is aliased here so importing a server module
   in a test doesn't blow up. Intentionally empty. */
export {};
