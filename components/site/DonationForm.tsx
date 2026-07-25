"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Heart } from "lucide-react";
import {
  TextField,
  TextareaField,
  FormMessage,
  Honeypot,
} from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { submitDonation } from "@/lib/actions/donation";
import { idle } from "@/lib/actions/types";

/* §13.5 donation form. Quick-pick amounts + a custom field, optional message,
 * anonymous toggle. On submit the action initializes Paystack and returns a
 * checkout URL we redirect to; the webhook confirms and receipts. If Paystack
 * isn't configured yet, the action returns an honest formError with the email
 * fallback — never a dead or fake checkout. */

const PRESETS_NGN = [5000, 10000, 25000, 50000];

function GiveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending} className="w-full justify-center">
      <Icon icon={Heart} size="sm" />
      {pending ? "Taking you to payment…" : "Give securely"}
    </Button>
  );
}

export function DonationForm() {
  const [state, formAction] = useActionState(submitDonation, idle);
  const [amount, setAmount] = useState("10000");

  useEffect(() => {
    if (state.status === "redirect") window.location.href = state.url;
  }, [state]);

  const fieldErrors = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={formAction} className="space-y-5">
      <Honeypot />
      <input type="hidden" name="currency" value="NGN" />

      {state.status === "error" && state.formError ? (
        <FormMessage tone="error">{state.formError}</FormMessage>
      ) : null}

      <div>
        <span className="text-ink text-small block font-medium">
          Amount <span className="text-slate font-normal">(NGN)</span>
        </span>
        <div className="mt-2 flex flex-wrap gap-2">
          {PRESETS_NGN.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setAmount(String(v))}
              className={`border px-4 py-2 text-small font-semibold transition-colors ${
                amount === String(v)
                  ? "border-evidence bg-evidence text-paper"
                  : "border-hairline text-ink hover:border-slate/50"
              }`}
            >
              ₦{v.toLocaleString()}
            </button>
          ))}
        </div>
        <div className="mt-3">
          <TextField
            id="don-amount"
            name="amount"
            type="number"
            min={1}
            step="any"
            label="Or enter your own amount"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            error={fieldErrors.amount}
          />
        </div>
      </div>

      <TextField
        id="don-name"
        name="donor_name"
        label="Your name"
        autoComplete="name"
        error={fieldErrors.donor_name}
      />
      <TextField
        id="don-email"
        name="email"
        type="email"
        label="Email (for your receipt)"
        required
        autoComplete="email"
        error={fieldErrors.email}
      />
      <TextareaField
        id="don-message"
        name="message"
        label="Message"
        maxLength={500}
        error={fieldErrors.message}
      />

      <label className="flex items-center gap-2.5">
        <input
          type="checkbox"
          name="anonymous"
          value="true"
          className="accent-evidence h-4 w-4"
        />
        <span className="text-slate text-small">
          Give anonymously (we won&apos;t show your name publicly)
        </span>
      </label>

      <div className="pt-1">
        <GiveButton />
      </div>
    </form>
  );
}
