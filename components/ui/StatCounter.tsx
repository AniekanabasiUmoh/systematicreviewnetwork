"use client";

import { useEffect, useRef, useState } from "react";

/* §4 / §2.2 — StatCounter.
   The gotcha this exists to avoid: Evidence Synthesis Ireland's counters render
   `0` with JavaScript disabled. Ours server-renders the real value as the
   initial state, and animation is purely an enhancement layered on top. If JS
   never runs, the correct number is already on the page.

   Values are free text from `impact_stats` (e.g. "200+", "19,500", "6"), so we
   animate only the leading numeric part and keep any prefix/suffix intact. */

type Parsed = { prefix: string; value: number; suffix: string } | null;

function parseValue(raw: string): Parsed {
  const m = raw.match(/^(\D*?)([\d,]+)(.*)$/);
  if (!m) return null;
  const n = Number(m[2].replace(/,/g, ""));
  if (!Number.isFinite(n)) return null;
  return { prefix: m[1], value: n, suffix: m[3] };
}

const format = (n: number) => n.toLocaleString("en-US");

export function StatCounter({
  label,
  value,
  tone = "ink",
  className = "",
}: {
  label: string;
  value: string;
  /** `ink` on light bands, `paper` on the dark impact band. */
  tone?: "ink" | "paper";
  className?: string;
}) {
  const numTone = tone === "paper" ? "text-paper" : "text-ink";
  const labelTone = tone === "paper" ? "text-paper/70" : "text-slate";
  const parsed = parseValue(value);
  const ref = useRef<HTMLParagraphElement>(null);

  /* Initial state is the FINAL value, not zero — that is what server-renders
     and what a no-JS visitor sees. */
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    if (!parsed) return;

    const el = ref.current;
    if (!el) return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduced) return; // §3.3 — reduced motion disables all of it

    let frame = 0;
    let started = false;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || started) continue;
          started = true;
          observer.disconnect();

          const duration = 1100;
          const start = performance.now();
          const tick = (now: number) => {
            const t = Math.min((now - start) / duration, 1);
            // easeOutCubic — fast start, gentle settle
            const eased = 1 - Math.pow(1 - t, 3);
            const current = Math.round(parsed.value * eased);
            setDisplay(`${parsed.prefix}${format(current)}${parsed.suffix}`);
            if (t < 1) frame = requestAnimationFrame(tick);
          };
          // Only drop to zero once we know the animation will run.
          setDisplay(`${parsed.prefix}0${parsed.suffix}`);
          frame = requestAnimationFrame(tick);
        }
      },
      { threshold: 0.4 },
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
    // parsed is derived from `value`; re-running on value change is correct.
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={className}>
      <p
        ref={ref}
        className={`text-display-tight ${numTone} text-[2.5rem] leading-none md:text-[3rem]`}
      >
        {display}
      </p>
      <p className={`${labelTone} text-small mt-2`}>{label}</p>
    </div>
  );
}
