"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormField";
import { inviteUser } from "@/lib/actions/admin-users";
import { idle } from "@/lib/actions/types";

export function InviteUserForm() {
  const [state, action, pending] = useActionState(inviteUser, idle);
  const message =
    state.status === "success"
      ? state.message
      : state.status === "error"
        ? (state.formError ?? "Check the highlighted fields.")
        : null;
  return (
    <form action={action} className="border-hairline bg-paper border p-6">
      <h2 className="text-display text-ink text-h3">Invite staff</h2>
      <p className="text-slate text-small mt-2">
        There is no public signup. Give a newly generated password to the person
        through a secure channel, not email.
      </p>
      {message ? (
        <div className="mt-4">
          <FormMessage tone={state.status === "success" ? "success" : "error"}>
            {message}
          </FormMessage>
        </div>
      ) : null}
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <div>
          <label
            htmlFor="invite-email"
            className="text-ink text-small font-medium"
          >
            Email
          </label>
          <input
            id="invite-email"
            name="email"
            type="email"
            required
            className="border-hairline bg-paper text-ink text-small mt-2 w-full border px-3 py-2.5"
          />
        </div>
        <div>
          <label
            htmlFor="invite-name"
            className="text-ink text-small font-medium"
          >
            Name
          </label>
          <input
            id="invite-name"
            name="full_name"
            className="border-hairline bg-paper text-ink text-small mt-2 w-full border px-3 py-2.5"
          />
        </div>
        <div>
          <label
            htmlFor="invite-role"
            className="text-ink text-small font-medium"
          >
            Role
          </label>
          <select
            id="invite-role"
            name="role"
            defaultValue="editor"
            className="border-hairline bg-paper text-ink text-small mt-2 w-full border px-3 py-2.5"
          >
            <option value="editor">Editor</option>
            <option value="admin">Administrator</option>
          </select>
        </div>
      </div>
      <div className="mt-5">
        <Button disabled={pending}>
          {pending ? "Creating…" : "Create staff account"}
        </Button>
      </div>
    </form>
  );
}
