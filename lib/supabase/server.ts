import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Service-role client — FULL ACCESS, BYPASSES RLS.
 *
 * The `server-only` import above is the guard: importing this module from a
 * client component is a build-time error, not a runtime surprise. That is what
 * keeps the service-role key out of the browser bundle.
 *
 * Use for: server actions handling public form submissions, the Paystack
 * webhook, and admin mutations — each of which must do its own validation and
 * authorization, because RLS is not protecting anything here (Design.md §1).
 *
 * Never import this into a client component. Never expose the key.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
      "The service role key is server-only — never prefix it NEXT_PUBLIC_.",
  );
}

export const supabaseAdmin = createClient<Database>(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
