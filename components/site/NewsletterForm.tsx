"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { subscribeNewsletter } from "@/lib/actions/newsletter";
import { idle } from "@/lib/actions/types";
import { Honeypot } from "@/components/ui/FormField";

/* §3.1 / §4.3 / §5.5 — newsletter signup, live. Deduped server-side; a repeat
 * address gets the same friendly confirmation. Works without JS via the form
 * action; useActionState adds the inline status. Two surfaces share this
 * component: the --brand footer (dark) and the paper-card homepage section
 * (light) — `surface` swaps the palette rather than forking the component. */

function SubscribeButton({ surface }: { surface: "dark" | "light" }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`text-small px-4 py-2 font-semibold transition-opacity hover:opacity-90 disabled:opacity-60 ${
        surface === "dark" ? "bg-paper text-brand" : "bg-evidence text-paper"
      }`}
    >
      {pending ? "…" : "Subscribe"}
    </button>
  );
}

export function NewsletterForm({
  surface = "dark",
}: {
  surface?: "dark" | "light";
}) {
  const [state, formAction] = useActionState(subscribeNewsletter, idle);

  const emailError =
    state.status === "error" ? state.fieldErrors?.email : undefined;
  const formError = state.status === "error" ? state.formError : undefined;

  const inputId =
    surface === "dark" ? "footer-email" : "home-email";
  const statusId = `newsletter-status-${surface}`;

  return (
    <form action={formAction} className="mt-4" aria-describedby={statusId}>
      <Honeypot />
      <label htmlFor={inputId} className="sr-only">
        Email address
      </label>
      <div className="flex gap-2">
        <input
          id={inputId}
          name="email"
          type="email"
          required
          placeholder="you@example.com"
          aria-invalid={emailError ? true : undefined}
          aria-describedby={statusId}
          className={`text-small w-full min-w-0 flex-1 border px-3 py-2 outline-none ${
            surface === "dark"
              ? "border-paper/25 text-paper placeholder:text-paper/40 focus:border-paper bg-transparent"
              : "border-hairline text-ink placeholder:text-slate/60 focus:border-ink bg-paper"
          }`}
        />
        <SubscribeButton surface={surface} />
      </div>
      <p
        id={statusId}
        role={state.status === "success" ? "status" : undefined}
        className={`mt-2 text-[0.75rem] ${
          state.status === "success"
            ? surface === "dark"
              ? "text-paper"
              : "text-ink"
            : emailError || formError
              ? "text-tag-orange"
              : surface === "dark"
                ? "text-paper/60"
                : "text-slate"
        }`}
      >
        {state.status === "success"
          ? state.message
          : (emailError ??
            formError ??
            "We'll email you when new training opens.")}
      </p>
    </form>
  );
}
