import type { ReactNode } from "react";

/* §3.1 — Category tag hues. This is the ONE sanctioned echo of the logo's four
   mark colors: tinted background, dark text. They appear nowhere else on the
   site, and never together outside the logo itself. */

const hues = {
  blue: "bg-tag-blue-tint text-tag-blue",
  orange: "bg-tag-orange-tint text-tag-orange",
  yellow: "bg-tag-yellow-tint text-tag-yellow",
  green: "bg-tag-green-tint text-tag-green",
  neutral: "bg-mist text-slate",
} as const;

export type TagHue = keyof typeof hues;

/** Event types and resource categories each get one mark color. */
export const eventTypeHue: Record<string, TagHue> = {
  webinar: "blue",
  course: "green",
  workshop: "orange",
  mentorship: "yellow",
};

export const resourceCategoryHue: Record<string, TagHue> = {
  guide: "green",
  template: "blue",
  webinar: "orange",
  tool: "yellow",
  publication: "neutral",
};

export function Tag({
  children,
  hue = "neutral",
  className = "",
}: {
  children: ReactNode;
  hue?: TagHue;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[0.75rem] font-semibold tracking-[0.02em] ${hues[hue]} ${className}`.trim()}
    >
      {children}
    </span>
  );
}

/* §4 — StatusBadge, for the application workflow and registration states.
   Colors carry meaning, but never carry it alone — the label always says it. */

const statuses = {
  received: "bg-mist text-slate",
  under_review: "bg-tag-blue-tint text-tag-blue",
  accepted: "bg-evidence-tint text-evidence",
  waitlisted: "bg-tag-yellow-tint text-tag-yellow",
  rejected: "bg-tag-orange-tint text-tag-orange",
  open: "bg-evidence-tint text-evidence",
  not_yet_open: "bg-tag-blue-tint text-tag-blue",
  closed: "bg-mist text-slate",
  full: "bg-tag-orange-tint text-tag-orange",
  past: "bg-mist text-slate",
  paid: "bg-evidence-tint text-evidence",
  pending: "bg-tag-yellow-tint text-tag-yellow",
  failed: "bg-tag-orange-tint text-tag-orange",
  expired: "bg-mist text-slate",
  refunded: "bg-mist text-slate",
  not_required: "bg-mist text-slate",
  draft: "bg-mist text-slate",
  published: "bg-evidence-tint text-evidence",
} as const;

export function StatusBadge({
  status,
  label,
  className = "",
}: {
  status: keyof typeof statuses;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[0.75rem] font-semibold ${statuses[status]} ${className}`.trim()}
    >
      {label}
    </span>
  );
}
