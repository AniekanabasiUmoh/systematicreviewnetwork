"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { signOutLearner } from "@/lib/actions/academy-auth";

function Inner() {
  const { pending } = useFormStatus();
  return (
    <Button variant="secondary" disabled={pending}>
      {pending ? "Signing out…" : "Sign out"}
    </Button>
  );
}

export function SignOutButton() {
  return (
    <form action={signOutLearner}>
      <Inner />
    </form>
  );
}
