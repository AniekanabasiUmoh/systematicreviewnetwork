import type { ReactNode } from "react";
import { Plus } from "lucide-react";
import { Icon } from "./Icon";

/* §2.7 — the FAQ disclosure pattern.

   Built on native <details>/<summary>. This is the deliberate choice over a
   JS-driven ARIA accordion: it is keyboard-operable (Enter/Space toggles the
   summary), screen-reader-announced as an expandable group, and — because it is
   HTML, not script — it works with zero JavaScript. No focus management or
   aria-expanded wiring to get wrong.

   The marker triangle is removed and replaced with a plus that rotates to an ×
   when open, driven purely by the [open] attribute in CSS. */

export function Accordion({ children }: { children: ReactNode }) {
  return (
    <div className="border-hairline border-t">{children}</div>
  );
}

export function AccordionItem({
  question,
  children,
}: {
  question: string;
  children: ReactNode;
}) {
  return (
    <details className="group border-hairline border-b">
      <summary className="text-ink hover:text-evidence flex cursor-pointer list-none items-center justify-between gap-6 py-5 font-semibold [&::-webkit-details-marker]:hidden">
        <span className="text-[1.0625rem] leading-snug">{question}</span>
        <Icon
          icon={Plus}
          size="sm"
          className="text-slate shrink-0 transition-transform duration-200 group-open:rotate-45"
        />
      </summary>
      <div className="pb-6 [&>p:first-child]:mt-0">{children}</div>
    </details>
  );
}
