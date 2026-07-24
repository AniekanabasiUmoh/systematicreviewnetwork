/* The thread — SRN's one signature device, derived from the knot mark and
   drawn as a single fine woven line. Used as a section divider. In ink at low
   opacity (via currentColor + the hairline colour), so it reads as texture,
   never decoration. No gold, no green. */

export function Thread({ className = "" }: { className?: string }) {
  const w = 1136;
  const mid = 20;
  const amp = 12;
  const period = 90;
  let d = `M0 ${mid}`;
  for (let x = 0; x <= w; x += period / 2) {
    const dir = (x / (period / 2)) % 2 < 1 ? -1 : 1;
    d += ` Q ${x + period / 4} ${mid + dir * amp} ${x + period / 2} ${mid}`;
  }
  return (
    <svg
      className={`text-hairline block h-10 w-full ${className}`.trim()}
      viewBox={`0 0 ${w} 40`}
      fill="none"
      preserveAspectRatio="none"
      aria-hidden
    >
      <path d={d} stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
