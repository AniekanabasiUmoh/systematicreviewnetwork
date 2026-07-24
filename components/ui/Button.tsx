import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/* §4 (redesign) — Button: primary green fill / secondary outline-ink. Sharp
   corners (border-radius:0) are the rule in the ESI-informed direction; the
   pill shape is reserved for small tags. Interface writing rule: buttons say
   what happens ("Register for this event"), and an action keeps its name
   through the flow. */

const base =
  "inline-flex items-center justify-center gap-2 rounded-none font-sans font-semibold " +
  "transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50";

const variants = {
  /* THE action color (§3.1) — CTAs, primary actions. */
  primary:
    "bg-evidence text-paper hover:bg-evidence-ink disabled:hover:bg-evidence",
  /* Outline-ink — secondary actions sitting beside a primary. */
  secondary:
    "border border-ink/25 bg-transparent text-ink hover:border-ink hover:bg-ink/5 " +
    "disabled:hover:border-ink/25 disabled:hover:bg-transparent",
  /* `gold` retired — aliased to primary so any lingering reference still
     renders a valid green button rather than an invisible one. */
  gold: "bg-evidence text-paper hover:bg-evidence-ink disabled:hover:bg-evidence",
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
