import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Browser client — anon key only.
 *
 * Safe to import into client components. RLS (Sprint 3.1) restricts this key
 * to published content and denies it every submission table outright, so it
 * can never read registrations, applications, donations, or contact messages.
 *
 * Public form writes do NOT go through here: they use server actions with the
 * service-role client (Design.md §1 architecture rule).
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
      "Copy .env.example to .env and fill them in.",
  );
}

export const supabase = createClient<Database>(url, anonKey);
