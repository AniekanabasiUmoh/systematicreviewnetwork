import { encodeFilterKey } from "@/lib/public-filters";
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
/* Sprint 5.10 — routes reachable while signed OUT. /admin/login/forgot is the
   password-recovery request form; /admin/reset is where the emailed link
   lands, in a short-lived Supabase recovery session that is not a normal
   staff sign-in. Neither should redirect to the login page — that would make
   password recovery unreachable for exactly the person who needs it. */
const PUBLIC_ADMIN_PATHS = new Set([
  "/admin/login",
  "/admin/login/forgot",
  "/admin/reset",
]);

/* Sprint 6.1 — learner-side gate. Same coarse question as the admin gate ("is
   anyone signed in?") and, just as deliberately, nothing more: whether that
   person is a LEARNER rather than staff, and whether they are verified, is
   decided server-side in lib/academy/auth.ts on every page and every mutation.
   A learner who signs in and then types /admin still gets nothing, because
   lib/admin/auth.ts requires a `profiles` row they cannot have — the database
   refuses to give one account both identities (20260727000001). */
const LEARNER_PATHS = ["/account", "/academy/enrol", "/academy/learn"];

export async function middleware(request: NextRequest) {
  const filtered = publicFilterResponse(request);
  if (filtered) return filtered;
  const { response, user } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  if (
    LEARNER_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))
  ) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/academy/sign-in";
      url.search = `?next=${encodeURIComponent(pathname + search)}`;
      const redirect = NextResponse.redirect(url);
      for (const c of response.cookies.getAll()) redirect.cookies.set(c);
      return redirect;
    }
    return response;
  }

  if (pathname === "/admin/login") {
    if (user) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return response;
  }

  if (PUBLIC_ADMIN_PATHS.has(pathname)) {
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

const PUBLIC_FILTERS: Record<string, readonly string[]> = {
  "/news": ["view", "type"],
  "/resources": ["category"],
};

function publicFilterResponse(request: NextRequest) {
  const allowed = PUBLIC_FILTERS[request.nextUrl.pathname];
  if (!allowed) return null;
  const key = encodeFilterKey(request.nextUrl.searchParams, allowed);
  if (!key) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname += "/filtered/" + key;
  url.search = "";
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    { source: "/news", has: [{ type: "query", key: "view" }] },
    { source: "/news", has: [{ type: "query", key: "type" }] },
    { source: "/resources", has: [{ type: "query", key: "category" }] },
    "/admin/:path*",
    "/account/:path*",
    "/account",
    "/academy/enrol/:path*",
    // Sprint 6.3 — the course player. Middleware only asks "is anyone signed
    // in"; whether they are ENROLLED is decided in lib/academy/curriculum.ts.
    "/academy/learn/:path*",
  ],
};
