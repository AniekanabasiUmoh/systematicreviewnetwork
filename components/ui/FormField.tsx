import type { ComponentProps, ReactNode } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Icon } from "./Icon";

/* §4 — the form field set.

   Interface writing rules applied here: errors say what went wrong AND how to
   fix it, never apologise, never go vague. "Enter an email address" beats
   "Invalid input". Success messages confirm what happened. */

const controlBase =
  "w-full rounded-lg border bg-paper px-3.5 py-2.5 text-ink " +
  "placeholder:text-slate/60 transition-colors " +
  "disabled:cursor-not-allowed disabled:bg-mist disabled:text-slate";

const controlState = (error?: string) =>
  error
    ? "border-tag-orange focus:border-tag-orange"
    : "border-hairline hover:border-slate/50 focus:border-evidence";

function Wrapper({
  id,
  label,
  hint,
  error,
  required,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-ink text-small block font-medium">
        {label}
        {required ? (
          <span className="text-slate font-normal"> (required)</span>
        ) : (
          <span className="text-slate font-normal"> (optional)</span>
        )}
      </label>
      {hint ? <p className="text-slate mt-1 text-[0.8125rem]">{hint}</p> : null}
      <div className="mt-2">{children}</div>
      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-tag-orange mt-2 flex items-start gap-1.5 text-[0.8125rem] font-medium"
        >
          <Icon icon={AlertCircle} size="sm" className="mt-px shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function TextField({
  id,
  label,
  hint,
  error,
  required,
  ...props
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
} & ComponentProps<"input">) {
  return (
    <Wrapper
      id={id}
      label={label}
      hint={hint}
      error={error}
      required={required}
    >
      <input
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`${controlBase} ${controlState(error)}`}
        {...props}
      />
    </Wrapper>
  );
}

export function SelectField({
  id,
  label,
  hint,
  error,
  required,
  children,
  ...props
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
} & ComponentProps<"select">) {
  return (
    <Wrapper
      id={id}
      label={label}
      hint={hint}
      error={error}
      required={required}
    >
      <select
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`${controlBase} ${controlState(error)}`}
        {...props}
      >
        {children}
      </select>
    </Wrapper>
  );
}

export function TextareaField({
  id,
  label,
  hint,
  error,
  required,
  maxLength,
  value,
  ...props
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
} & ComponentProps<"textarea">) {
  const used = typeof value === "string" ? value.length : 0;
  return (
    <Wrapper
      id={id}
      label={label}
      hint={hint}
      error={error}
      required={required}
    >
      <textarea
        id={id}
        required={required}
        maxLength={maxLength}
        value={value}
        rows={5}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`${controlBase} ${controlState(error)} resize-y`}
        {...props}
      />
      {maxLength ? (
        <p className="text-slate mt-1.5 text-right text-[0.8125rem]">
          {used.toLocaleString()} of {maxLength.toLocaleString()} characters
        </p>
      ) : null}
    </Wrapper>
  );
}

/** §3.2 Sprint 3.2 — honeypot. Visually hidden, never announced, ignored by
    real users; a filled value means a bot and the submission is dropped
    silently. Not `display:none`, which some bots skip. */
export function Honeypot({ name = "website" }: { name?: string }) {
  return (
    <div
      aria-hidden
      className="absolute left-[-9999px] h-px w-px overflow-hidden"
    >
      <label htmlFor={name}>Leave this field empty</label>
      <input
        id={name}
        name={name}
        type="text"
        tabIndex={-1}
        autoComplete="off"
      />
    </div>
  );
}

export function FormMessage({
  tone,
  children,
}: {
  tone: "success" | "error";
  children: ReactNode;
}) {
  const success = tone === "success";
  return (
    <div
      role={success ? "status" : "alert"}
      className={`text-small flex items-start gap-2 rounded-lg p-3.5 ${
        success
          ? "bg-evidence-tint text-evidence"
          : "bg-tag-orange-tint text-tag-orange"
      }`}
    >
      <Icon
        icon={success ? CheckCircle2 : AlertCircle}
        size="sm"
        className="mt-0.5 shrink-0"
      />
      <span className="font-medium">{children}</span>
    </div>
  );
}
