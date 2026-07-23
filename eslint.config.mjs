import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),

  /* Design.md §1 architecture rule — the browser never writes to Supabase
     directly, and the service-role key never reaches the client.

     The `server-only` package alone does not fail the build under Turbopack
     (verified: a "use client" module importing lib/supabase/server built
     cleanly, though the key was correctly stripped from the bundle). This rule
     turns that silent stripping into a loud lint error, so the mistake is
     caught in review rather than trusted to the bundler. */
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      /* Flags any client component ("use client") that imports the
         service-role client. Server components, server actions, and route
         handlers are unaffected — they are the legitimate consumers. */
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "Program:has(ExpressionStatement > Literal[value='use client'])" +
            " ImportDeclaration[source.value=/lib\\/supabase\\/server$/]",
          message:
            "supabaseAdmin bypasses RLS and is server-only. It must not be " +
            "imported into a client component. Use a server action, or read " +
            "via @/lib/supabase/client (Design.md §1).",
        },
      ],
    },
  },

  /* Migration and codegen scripts are plain Node, run outside Next. */
  {
    files: ["supabase/**/*.mjs"],
    rules: {
      "no-console": "off",
    },
  },
]);

export default eslintConfig;
