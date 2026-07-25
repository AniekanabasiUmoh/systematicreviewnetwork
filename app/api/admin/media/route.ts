import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/admin/auth";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { data, error } = await supabaseAdmin
    .from("media")
    .select("id, storage_path, file_name, alt_text, width, height, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error)
    return NextResponse.json(
      { error: "Could not load media." },
      { status: 500 },
    );
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return NextResponse.json({
    media: (data ?? []).map((item) => ({
      ...item,
      url: `${base}/storage/v1/object/public/media/${item.storage_path}`,
    })),
  });
}
