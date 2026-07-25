"use server";

import { requireStaffAction } from "@/lib/admin/auth";
import { parseEmbedUrl } from "@/lib/admin/embeds";

/* Sprint 5.8 — the editor never constructs an embed's provider/id itself. It
 * sends the pasted URL here and gets back the SERVER's normalised attrs, so
 * the allowlist and the password check run on the server even though the
 * insertion happens in the browser. */

export type EmbedResult =
  | {
      ok: true;
      attrs: {
        provider: string;
        id: string;
        title: string;
        url: string;
        inline: boolean;
      };
    }
  | { ok: false; error: string };

export async function resolveEmbed(
  url: string,
  title: string,
): Promise<EmbedResult> {
  const auth = await requireStaffAction();
  if (!auth.ok)
    return { ok: false, error: "Your session has expired. Sign in again." };

  const parsed = parseEmbedUrl(url, title);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  return {
    ok: true,
    attrs: {
      provider: parsed.provider,
      id: parsed.id,
      title: parsed.title,
      url: parsed.url,
      inline: parsed.inline,
    },
  };
}
