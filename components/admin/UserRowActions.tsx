"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { changeUserRole, removeUser } from "@/lib/actions/admin-users";
import { idle } from "@/lib/actions/types";

export function UserRowActions({
  id,
  role,
  isSelf,
}: {
  id: string;
  role: string;
  isSelf: boolean;
}) {
  const [, changeAction, changing] = useActionState(changeUserRole, idle);
  const [, removeAction, removing] = useActionState(removeUser, idle);
  if (isSelf)
    return <span className="text-slate text-small">Your account</span>;
  return (
    <div className="flex justify-end gap-2">
      <form action={changeAction}>
        <input type="hidden" name="id" value={id} />
        <select
          name="role"
          defaultValue={role}
          className="border-hairline bg-paper text-ink text-small border px-2 py-1"
        >
          <option value="editor">Editor</option>
          <option value="admin">Administrator</option>
        </select>
        <Button size="md" variant="secondary" disabled={changing}>
          Save
        </Button>
      </form>
      <form
        action={removeAction}
        onSubmit={(event) => {
          if (
            !window.confirm(
              "Remove this staff account? They will no longer be able to sign in.",
            )
          )
            event.preventDefault();
        }}
      >
        <input type="hidden" name="id" value={id} />
        <Button size="md" variant="secondary" disabled={removing}>
          Remove
        </Button>
      </form>
    </div>
  );
}
