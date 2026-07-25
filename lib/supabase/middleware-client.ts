import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/database.types";

/**
 * Refreshes the auth cookie and returns { response, user }. The response
 * carries the rotated cookies; the caller MUST return it (or copy its cookies
 * onto whatever it returns) or the refresh is lost and the staffer is bounced
 * to login on the next navigation.
 *
 * Runs in the edge runtime — cannot import "server-only".
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          for (const { name, value } of list) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of list) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // getUser(), NOT getSession(): getSession reads the cookie without
  // verifying it, so a forged cookie would pass. getUser round-trips to
  // Supabase and validates the JWT. This is the whole point of the
  // middleware.
  const { data } = await supabase.auth.getUser();
  return { response, user: data.user };
}
