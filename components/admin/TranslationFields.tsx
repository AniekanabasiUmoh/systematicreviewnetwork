"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/Button";
import { FormMessage, TextField, TextareaField } from "@/components/ui/FormField";
import { idle } from "@/lib/actions/types";
import { saveTranslation } from "@/lib/actions/admin-translations";
import { LOCALE_LABELS } from "@/lib/i18n/locale";

/* Sprint 7.4 — authoring French beside the English.
 *
 * §7.4: "Admin must let a staffer author both locales side by side." The
 * English is shown read-only next to each French box rather than in another
 * tab, because a translator needs the source in front of them and switching
 * tabs to check a phrase is how inconsistencies get in.
 *
 * Collapsed by default. Most editing sessions are not translation sessions, and
 * an always-open second copy of every field doubles the length of the form for
 * everyone who is not a translator. */

export type TranslatableField = {
  name: string;
  label: string;
  /** The English value, shown for reference. */
  english: string;
  multiline?: boolean;
};

export function TranslationFields({
  table,
  id,
  fields,
  existing,
}: {
  table: string;
  id: string;
  fields: TranslatableField[];
  /** Current French values, if any. */
  existing: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(saveTranslation, idle);

  const filled = fields.filter((f) => (existing[f.name] ?? "").trim()).length;

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-display text-ink text-h3">
          {LOCALE_LABELS.fr}
        </h2>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-ink text-small underline underline-offset-2"
        >
          {open ? "Hide" : filled > 0 ? "Edit translation" : "Add a translation"}
        </button>
      </div>

      <p className="text-slate text-small mt-2 mb-5 max-w-2xl">
        {filled === 0
          ? "Nothing translated yet. Anything left blank falls back to the English, so a part-finished translation is safe to save."
          : `${filled} of ${fields.length} fields translated. Blank fields fall back to the English.`}
      </p>

      {open ? (
        <form action={formAction} className="border-hairline bg-paper border p-5">
          <input type="hidden" name="table" value={table} />
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="locale" value="fr" />

          {state.status === "error" && state.formError ? (
            <div className="mb-4">
              <FormMessage tone="error">{state.formError}</FormMessage>
            </div>
          ) : null}
          {state.status === "success" ? (
            <div className="mb-4">
              <FormMessage tone="success">{state.message}</FormMessage>
            </div>
          ) : null}

          <div className="space-y-6">
            {fields.map((field) => (
              <div
                key={field.name}
                className="grid gap-4 lg:grid-cols-2 lg:gap-6"
              >
                <div>
                  <p className="text-slate text-[0.75rem] font-medium tracking-[0.08em] uppercase">
                    {field.label} — English
                  </p>
                  <div className="border-hairline bg-mist/50 mt-2 border p-3">
                    <p className="text-slate text-small whitespace-pre-wrap">
                      {field.english || "—"}
                    </p>
                  </div>
                </div>

                {field.multiline ? (
                  <TextareaField
                    id={`fr_${field.name}`}
                    name={field.name}
                    rows={5}
                    label={`${field.label} — ${LOCALE_LABELS.fr}`}
                    defaultValue={existing[field.name] ?? ""}
                  />
                ) : (
                  <TextField
                    id={`fr_${field.name}`}
                    name={field.name}
                    type="text"
                    label={`${field.label} — ${LOCALE_LABELS.fr}`}
                    defaultValue={existing[field.name] ?? ""}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end">
            <Button disabled={pending}>
              {pending ? "Saving…" : "Save the translation"}
            </Button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
