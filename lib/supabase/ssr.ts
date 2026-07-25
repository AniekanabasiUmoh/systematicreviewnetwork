import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";

/**
 * Session-bearing anon client for SERVER COMPONENTS and SERVER ACTIONS.
 *
 * Identity only: it resolves who is signed in. It performs no writes — every
 * admin mutation goes through supabaseAdmin after a server-side role check
 * (Design.md §1, Sprint 5.1).
 */
export async function createSessionClient() {
  const store = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (list) => {
          // Next throws when a Server Component tries to set a cookie. The
          // middleware refreshes the session on every request, so silently
          // ignoring here is correct, not a bug. In a Server Action or Route
          // Handler this succeeds, which is what makes sign-in/sign-out work.
          try {
            for (const { name, value, options } of list) {
              store.set(name, value, options);
            }
          } catch {
            /* read-only context */
          }
        },
      },
    },
  );
}
