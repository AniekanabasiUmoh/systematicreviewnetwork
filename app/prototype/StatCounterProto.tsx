"use client";

import { useEffect, useRef, useState } from "react";

/* Same principle as the live StatCounter: the real value is the initial state
   and server-renders, so it is correct with JavaScript disabled (the ESI bug —
   their counters show 0 without JS — that we beat). Animation only enhances. */

export function StatCounterProto({ value }: { value: string }) {
  const m = value.match(/^(\D*?)([\d,]+)(.*)$/);
  const target = m ? Number(m[2].replace(/,/g, "")) : null;
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    if (target === null || !m) return;
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    let done = false;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting || done) continue;
          done = true;
          obs.disconnect();
          const start = performance.now();
          const tick = (now: number) => {
            const t = Math.min((now - start) / 1100, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            const n = Math.round(target * eased).toLocaleString("en-US");
            setDisplay(`${m[1]}${n}${m[3]}`);
            if (t < 1) frame = requestAnimationFrame(tick);
          };
          setDisplay(`${m[1]}0${m[3]}`);
          frame = requestAnimationFrame(tick);
        }
      },
      { threshold: 0.4 },
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  return <span ref={ref}>{display}</span>;
}
