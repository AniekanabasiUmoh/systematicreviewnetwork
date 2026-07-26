"use client";

import { ImageField } from "./ImageField";
import { RichTextField } from "./RichTextField";
import { SlugField } from "./SlugField";
import type { AdminField } from "@/lib/admin/resources";

/* Sprint 6.2 — the admin field renderer, extracted from ResourceForm.
 *
 * ResourceForm drives the flat registry in lib/admin/resources.ts and submits
 * to saveResource. Courses and cohorts are nested (Programme -> Course ->
 * Cohort) with option lists that depend on the current row, so they cannot go
 * in that registry without a `parent` concept leaking into every resource that
 * has no parent. They get their own forms — but they must not get their own
 * LOOK. Extracting the renderer is what keeps one set of inputs across the
 * whole admin: fix a focus ring here and it is fixed everywhere. */

export function textValue(value: unknown) {
  /* jsonb string arrays are edited as one item per line. Without this branch
     they'd render as an empty textarea and the next save would wipe the list. */
  if (Array.isArray(value))
    return value.filter((item) => typeof item === "string").join("\n");
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : "";
}

export function localDate(value: unknown) {
  if (typeof value !== "string" || !value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function AdminFormField({
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
      <RichTextField name={field.name} label={field.label} defaultValue={value} />
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
      <label htmlFor={field.name} className="text-ink text-small block font-medium">
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
  const errorNote = error ? (
    <p className="text-tag-orange text-small mt-2">{error}</p>
  ) : null;

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
        {errorNote}
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
          <option value="">
            {field.required ? "Choose one" : "None"}
          </option>
          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {errorNote}
      </div>
    );

  const type =
    field.kind === "datetime"
      ? "datetime-local"
      : field.kind === "date"
        ? "date"
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
        min={field.kind === "number" ? field.min : undefined}
        step={field.kind === "number" ? field.step : undefined}
        className={cls}
      />
      {errorNote}
    </div>
  );
}
