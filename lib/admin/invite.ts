import "server-only";

import { randomBytes } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/server";

/**
 * Shared invite logic used by both `supabase/invite-admin.mjs` (the CLI,
 * first-user bootstrap) and `lib/actions/admin-users.ts` (the in-app
 * invite). Factored out so the two paths cannot drift.
 *
 * Invite-only: there is no public signup surface anywhere in this app.
 */

export type InviteResult =
  | { ok: true; id: string; password: string; reused: boolean }
  | { ok: false; error: string };

export function generatePassword(): string {
  return randomBytes(18).toString("base64url");
}

export async function inviteStaffUser(params: {
  email: string;
  role: "admin" | "editor";
  fullName?: string | null;
}): Promise<InviteResult> {
  const email = params.email.trim().toLowerCase();
  const password = generatePassword();

  const created = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  let userId: string;
  let reused = false;

  if (created.error) {
    // Already registered — look the existing user up and reuse the id so a
    // re-run just fixes the profile/role rather than failing.
    const isDuplicate = /already been registered|already exists/i.test(
      created.error.message,
    );
    if (!isDuplicate) {
      return { ok: false, error: created.error.message };
    }

    const { data: list, error: listError } =
      await supabaseAdmin.auth.admin.listUsers();
    if (listError) return { ok: false, error: listError.message };

    const existing = list.users.find(
      (u) => u.email?.toLowerCase() === email,
    );
    if (!existing) {
      return { ok: false, error: "User reported as duplicate but not found." };
    }
    userId = existing.id;
    reused = true;
  } else {
    userId = created.data.user.id;
  }

  const { error: profileError } = await supabaseAdmin.from("profiles").upsert(
    {
      id: userId,
      role: params.role,
      full_name: params.fullName ?? null,
      email,
    },
    { onConflict: "id" },
  );

  if (profileError) return { ok: false, error: profileError.message };

  return { ok: true, id: userId, password, reused };
}
