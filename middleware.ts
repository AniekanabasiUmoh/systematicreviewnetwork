import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware-client";

/**
 * Gate for /admin/*. Coarse-grained on purpose: it answers "is anyone signed
 * in?" and nothing more. It deliberately does NOT read `profiles` — a DB
 * round trip per request in the edge runtime is both slow and the wrong
 * place for authorization. Role checks live server-side in lib/admin/auth.ts,
 * on every page and every mutation (Design.md §5.1: "role checks server-side
 * on every mutation, not just UI hiding").
 */
export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  if (pathname === "/admin/login") {
    if (user) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return response;
  }

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    const redirect = NextResponse.redirect(url);
    // Carry the refreshed cookies onto the redirect, or the refresh is lost
    // and staff get logged out roughly hourly.
    for (const c of response.cookies.getAll()) redirect.cookies.set(c);
    return redirect;
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
