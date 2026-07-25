"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { subscribeNewsletter } from "@/lib/actions/newsletter";
import { idle } from "@/lib/actions/types";
import { Honeypot } from "@/components/ui/FormField";

/* §3.1 / §4.3 — footer newsletter signup, live. Deduped server-side; a repeat
 * address gets the same friendly confirmation. Works without JS via the form
 * action; useActionState adds the inline status. Styled for the --brand footer
 * ground, so its own palette rather than the FormField light-surface set. */

function SubscribeButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-paper text-brand text-small px-4 py-2 font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      {pending ? "…" : "Subscribe"}
    </button>
  );
}

export function NewsletterForm() {
  const [state, formAction] = useActionState(subscribeNewsletter, idle);

  const emailError =
    state.status === "error" ? state.fieldErrors?.email : undefined;
  const formError = state.status === "error" ? state.formError : undefined;

  return (
    <form action={formAction} className="mt-4" aria-describedby="newsletter-status">
      <Honeypot />
      <label htmlFor="footer-email" className="sr-only">
        Email address
      </label>
      <div className="flex gap-2">
        <input
          id="footer-email"
          name="email"
          type="email"
          required
          placeholder="you@example.com"
          aria-invalid={emailError ? true : undefined}
          aria-describedby="newsletter-status"
          className="border-paper/25 text-paper placeholder:text-paper/40 focus:border-paper w-full min-w-0 flex-1 border bg-transparent px-3 py-2 text-[0.8125rem] outline-none"
        />
        <SubscribeButton />
      </div>
      <p
        id="newsletter-status"
        role={state.status === "success" ? "status" : undefined}
        className={`mt-2 text-[0.75rem] ${
          state.status === "success"
            ? "text-paper"
            : emailError || formError
              ? "text-tag-orange"
              : "text-paper/60"
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
