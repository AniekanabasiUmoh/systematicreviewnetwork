import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/* §4 — Button: primary green / secondary outline-ink / gold (one gold per page).
   Interface writing rule: buttons say what happens ("Register for this event"),
   and an action keeps its name through the flow. */

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-sans font-semibold " +
  "transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50";

const variants = {
  /* THE action color (§3.1) — CTAs, primary actions. */
  primary:
    "bg-evidence text-paper hover:bg-evidence/90 disabled:hover:bg-evidence",
  /* Outline-ink — secondary actions sitting beside a primary. */
  secondary:
    "border border-ink/25 bg-transparent text-ink hover:border-ink hover:bg-ink/5 " +
    "disabled:hover:border-ink/25 disabled:hover:bg-transparent",
  /* Gold — max ONE highlighted CTA per page (§3.1). */
  /* --gold-bright, not --gold: a large fill wants the lighter yellow behind
     dark text. The darkened --gold is for gold TEXT on light surfaces. */
  gold: "bg-gold-bright text-ink hover:bg-gold-bright/90 disabled:hover:bg-gold-bright",
} as const;

const sizes = {
  md: "px-5 py-2.5 text-[0.9375rem]",
  lg: "px-6 py-3 text-body",
} as const;

type ButtonVariant = keyof typeof variants;
type ButtonSize = keyof typeof sizes;

type SharedProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: SharedProps & ComponentProps<"button">) {
  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: SharedProps & ComponentProps<typeof Link>) {
  return (
    <Link
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`.trim()}
      {...props}
    >
      {children}
    </Link>
  );
}

export type { ButtonVariant, ButtonSize };
