"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormField";
import { idle } from "@/lib/actions/types";
import { saveResource } from "@/lib/actions/admin-content";
import type { AdminField, AdminResourceKey } from "@/lib/admin/resources";
import { ImageField } from "./ImageField";
import { RichTextField } from "./RichTextField";
import { SlugField } from "./SlugField";

type FormResource = {
  key: AdminResourceKey;
  labelSingular: string;
  fields: ReadonlyArray<AdminField>;
};
type Values = Record<string, unknown> & { id?: string };

function localDate(value: unknown) {
  if (typeof value !== "string" || !value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function textValue(value: unknown) {
  /* jsonb string arrays (programmes.covers / for_who) are edited as one item
     per line. Without this branch they'd render as an empty textarea and the
     next save would silently wipe the stored list. */
  if (Array.isArray(value))
    return value.filter((item) => typeof item === "string").join("\n");
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : "";
}

export function ResourceForm({
  resource,
  initial,
}: {
  resource: FormResource;
  initial?: Values | null;
}) {
  const [state, action, pending] = useActionState(saveResource, idle);
  return (
    <form action={action} className="border-hairline bg-paper border p-6">
      <input type="hidden" name="resource" value={resource.key} />
      {initial?.id ? (
        <input type="hidden" name="id" value={initial.id} />
      ) : null}
      {state.status === "error" && state.formError ? (
        <div className="mb-5">
          <FormMessage tone="error">{state.formError}</FormMessage>
        </div>
      ) : null}
      {state.status === "success" ? (
        <div className="mb-5">
          <FormMessage tone="success">{state.message}</FormMessage>
        </div>
      ) : null}
      <div className="grid gap-5 md:grid-cols-2">
        {resource.fields.map((field) => (
          <Field
            key={field.name}
            field={field}
            value={initial?.[field.name]}
            error={
              state.status === "error"
                ? state.fieldErrors?.[field.name]
                : undefined
            }
          />
        ))}
      </div>
      <div className="mt-7 flex justify-end">
        <Button disabled={pending}>
          {pending ? "Saving…" : `Save ${resource.labelSingular}`}
        </Button>
      </div>
    </form>
  );
}

function Field({
  field,
  value,
  error,
}: {
  field: AdminField;
  value: unknown;
  error?: string;
}) {
  if (field.kind === "richtext")
    return (
      <RichTextField
        name={field.name}
        label={field.label}
        defaultValue={value}
      />
    );
  if (field.kind === "image")
    return (
      <ImageField
        name={field.name}
        label={field.label}
        hint={field.hint}
        defaultValue={textValue(value)}
      />
    );
  if (field.kind === "slug")
    return (
      <SlugField
        name={field.name}
        label={field.label}
        defaultValue={textValue(value)}
        sourceId={field.slugFrom ?? "title"}
        error={error}
      />
    );
  const cls = `border-hairline bg-paper text-ink mt-2 w-full border px-3.5 py-2.5 ${error ? "border-tag-orange" : ""}`;
  const base = (
    <>
      <label
        htmlFor={field.name}
        className="text-ink text-small block font-medium"
      >
        {field.label}
        {field.required ? (
          <span className="text-slate font-normal"> (required)</span>
        ) : null}
      </label>
      {field.hint ? (
        <p className="text-slate mt-1 text-[0.8125rem]">{field.hint}</p>
      ) : null}
    </>
  );
  if (field.kind === "textarea")
    return (
      <div className={field.wide ? "md:col-span-2" : ""}>
        {base}
        <textarea
          id={field.name}
          name={field.name}
          defaultValue={textValue(value)}
          maxLength={field.maxLength}
          className={`${cls} min-h-28 resize-y`}
        />
        {error ? (
          <p className="text-tag-orange text-small mt-2">{error}</p>
        ) : null}
      </div>
    );
  if (field.kind === "select")
    return (
      <div className={field.wide ? "md:col-span-2" : ""}>
        {base}
        <select
          id={field.name}
          name={field.name}
          defaultValue={textValue(value) || field.defaultValue || ""}
          className={cls}
        >
          <option value="">Choose one</option>
          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error ? (
          <p className="text-tag-orange text-small mt-2">{error}</p>
        ) : null}
      </div>
    );
  const type =
    field.kind === "datetime"
      ? "datetime-local"
      : field.kind === "number"
        ? "number"
        : field.kind === "email"
          ? "email"
          : field.kind === "url"
            ? "url"
            : "text";
  const defaultValue =
    field.kind === "datetime" ? localDate(value) : textValue(value);
  return (
    <div className={field.wide ? "md:col-span-2" : ""}>
      {base}
      <input
        id={field.name}
        name={field.name}
        type={type}
        defaultValue={defaultValue}
        maxLength={field.maxLength}
        required={field.required}
        className={cls}
      />
      {error ? (
        <p className="text-tag-orange text-small mt-2">{error}</p>
      ) : null}
    </div>
  );
}
