import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/* Sprint 5.11 — one-click unsubscribe, no confirmation form (the email
 * standard, and the point of "one click"). An unknown or already-used token
 * shows the SAME confirmation page as a real one — never disclose whether a
 * token was valid, which would make the link enumerable. */

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("t");

  if (token) {
    /* rpc() isn't typed for this function (see lib/actions/guard.ts) */
    const rpc = supabaseAdmin.rpc.bind(supabaseAdmin) as unknown as (
      fn: string,
      args?: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: unknown }>;
    await rpc("unsubscribe_newsletter", { p_token: token });
  }

  return new NextResponse(
    `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Unsubscribed — Systematic Reviews Network</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background:#F4F5F7; color:#16182B; margin:0; padding:0; }
  .card { max-width: 480px; margin: 64px auto; background:#fff; border:1px solid #E4E5EA; padding: 40px; }
  h1 { font-size: 22px; margin: 0 0 12px; }
  p { font-size: 15px; line-height: 1.6; color: #494C63; margin: 0 0 16px; }
  a { color: #16182B; }
</style>
</head>
<body>
  <div class="card">
    <h1>You're unsubscribed.</h1>
    <p>You won't receive any more newsletter emails from the Systematic Reviews Network. If this was a mistake, just sign up again from the site.</p>
    <p><a href="/">Return to the homepage</a></p>
  </div>
</body>
</html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}
