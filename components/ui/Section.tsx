import type { ReactNode, ElementType } from "react";

/* §3.3 — Layout primitives.
   Sections alternate paper/mist; the footer and at most one mid-page CTA band
   are ink (light text). Vertical padding 96px desktop / 56px mobile. */

const surfaces = {
  paper: "bg-paper text-ink",
  mist: "bg-mist text-ink",
  ink: "bg-ink text-paper",
  brand: "bg-brand text-paper",
} as const;

export function Section({
  surface = "paper",
  as: Tag = "section",
  className = "",
  children,
  id,
}: {
  surface?: keyof typeof surfaces;
  as?: ElementType;
  className?: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <Tag
      id={id}
      className={`${surfaces[surface]} py-[var(--spacing-section-mobile)] md:py-[var(--spacing-section)] ${className}`.trim()}
    >
      {children}
    </Tag>
  );
}

/** Max content width, 1200px (§3.3). */
export function Container({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`mx-auto w-full max-w-[var(--container-content)] px-6 ${className}`.trim()}
    >
      {children}
    </div>
  );
}

/** Prose column, 720px wide with a 68ch measure (§3.3). */
export function Prose({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`mx-auto w-full max-w-[var(--container-prose)] px-6 ${className}`.trim()}
    >
      <div className="prose-measure">{children}</div>
    </div>
  );
}
