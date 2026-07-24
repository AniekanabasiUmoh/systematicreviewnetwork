import type { ReactNode } from "react";

/* §4 — Eyebrow and SectionHeader (eyebrow + h2 + optional lede).
   Sentence case everywhere except the eyebrow, which is uppercase. */

export function Eyebrow({
  children,
  tone = "slate",
  className = "",
}: {
  children: ReactNode;
  tone?: "evidence" | "slate" | "paper";
  className?: string;
}) {
  /* Default is slate, not green: the redesign keeps green off text entirely,
     so eyebrows are quiet ink-soft labels. `evidence` is retained only for the
     rare deliberate exception. */
  const tones = {
    evidence: "text-evidence",
    slate: "text-slate",
    paper: "text-paper/70",
  };
  return (
    <p className={`text-eyebrow-style ${tones[tone]} ${className}`.trim()}>
      {children}
    </p>
  );
}

export function SectionHeader({
  eyebrow,
  heading,
  lede,
  align = "left",
  tone = "ink",
  as: Heading = "h2",
  className = "",
}: {
  eyebrow?: string;
  heading: string;
  lede?: string;
  align?: "left" | "center";
  tone?: "ink" | "paper";
  as?: "h1" | "h2" | "h3";
  className?: string;
}) {
  const isLight = tone === "paper";
  return (
    <div
      className={`${align === "center" ? "mx-auto text-center" : ""} ${className}`.trim()}
    >
      {eyebrow ? (
        <Eyebrow tone={isLight ? "paper" : "slate"}>{eyebrow}</Eyebrow>
      ) : null}
      <Heading
        className={`text-display mt-3 text-[length:var(--text-h2-mobile)] leading-[1.2] md:text-[length:var(--text-h2)] md:leading-[1.15] ${
          isLight ? "text-paper" : "text-ink"
        }`}
      >
        {heading}
      </Heading>
      {lede ? (
        <p
          className={`prose-measure mt-4 ${align === "center" ? "mx-auto" : ""} ${
            isLight ? "text-paper/80" : "text-slate"
          }`}
        >
          {lede}
        </p>
      ) : null}
    </div>
  );
}
