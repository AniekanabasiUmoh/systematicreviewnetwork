"use client";

import { useId, useState } from "react";

/* §3.4 — the Reach Map. The site's one memorable device; everything else stays
   disciplined.

   Africa-centered equirectangular projection, static inline SVG — no map
   library, no tiles, no network request. Dots are driven by props from
   `reach_countries`, so staff control them from the admin.

   Accessibility (§3.5 / Sprint 2.5): dots are keyboard-focusable buttons with
   tooltips, and a visually-hidden list carries the same information for screen
   readers and for anyone without JavaScript. The page reads correctly with
   zero JS. */

export type ReachCountry = {
  country_code: string;
  country_name: string;
  note?: string | null;
};

/* Longitude/latitude for each country we plot, converted to SVG space below.
   Equirectangular keeps the maths trivial: x is linear in longitude, y linear
   in latitude. Centred on ~20°E so Africa sits mid-frame. */
const COORDS: Record<string, [number, number]> = {
  NG: [8.7, 9.1],
  GH: [-1.0, 7.9],
  RW: [29.9, -1.9],
  CM: [12.4, 7.4],
  KE: [37.9, -0.02],
  UG: [32.3, 1.4],
  ZA: [22.9, -30.6],
  ET: [40.5, 9.1],
  TZ: [34.9, -6.4],
  SN: [-14.5, 14.5],
  EG: [30.8, 26.8],
  ZW: [29.2, -19.0],
  ZM: [27.8, -13.1],
  MW: [34.3, -13.3],
  SD: [30.2, 12.9],
  CI: [-5.5, 7.5],
  BF: [-1.6, 12.2],
  ML: [-4.0, 17.6],
  PK: [69.3, 30.4],
  IN: [78.9, 20.6],
  BD: [90.4, 23.7],
  BR: [-51.9, -14.2],
  GB: [-3.4, 55.4],
  US: [-98.6, 39.8],
  CA: [-106.3, 56.1],
  AU: [133.8, -25.3],
  PH: [121.8, 12.9],
  ID: [113.9, -0.8],
  NP: [84.1, 28.4],
  LK: [80.8, 7.9],
  IQ: [43.7, 33.2],
  IR: [53.7, 32.4],
  YE: [48.5, 15.6],
  AF: [67.7, 33.9],
};

const VIEW_W = 1000;
const VIEW_H = 520;
/* Window on the world: 130°W–160°E, 60°N–45°S. Crops the Arctic and the
   Pacific, which are empty for our purposes, and lets Africa sit large. */
const LON_MIN = -130;
const LON_MAX = 160;
const LAT_MAX = 60;
const LAT_MIN = -45;

function project(lon: number, lat: number): [number, number] {
  const x = ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * VIEW_W;
  const y = ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * VIEW_H;
  return [x, y];
}

/* A simplified landmass outline. Deliberately coarse: this is a quiet backdrop
   for the dots, not a cartographic reference. Paths are hand-simplified
   continent silhouettes in the projected space above. */
const LANDMASS =
  // Africa
  "M487 196 L500 178 L516 172 L534 176 L551 172 L566 180 L575 196 L578 216 " +
  "L572 238 L566 258 L560 276 L556 296 L548 316 L540 334 L528 350 L516 362 " +
  "L502 368 L490 362 L482 348 L478 330 L472 312 L466 292 L462 272 L464 250 " +
  "L470 228 L478 210 Z " +
  // Europe
  "M470 120 L492 112 L516 108 L540 110 L556 118 L562 132 L556 146 L540 154 " +
  "L520 158 L500 156 L482 148 L470 136 Z " +
  // Middle East / West Asia
  "M578 168 L600 158 L622 156 L640 162 L650 176 L646 192 L632 202 L612 204 " +
  "L594 198 L580 186 Z " +
  // South Asia
  "M650 178 L672 172 L692 176 L706 188 L712 206 L706 224 L694 238 L680 244 " +
  "L668 236 L660 220 L654 200 Z " +
  // East / Southeast Asia
  "M712 150 L740 140 L768 138 L792 146 L806 160 L804 178 L792 192 L774 200 " +
  "L752 202 L730 196 L716 182 L710 166 Z " +
  // Australia
  "M800 300 L828 292 L854 296 L868 310 L866 330 L852 344 L830 348 L810 340 " +
  "L798 324 Z " +
  // South America
  "M258 268 L280 258 L300 262 L312 276 L316 296 L312 320 L304 344 L294 366 " +
  "L282 382 L268 388 L256 380 L250 362 L250 340 L252 316 L254 292 Z " +
  // North America
  "M120 96 L160 84 L204 82 L244 90 L272 104 L284 124 L278 146 L262 164 " +
  "L240 176 L214 182 L188 178 L164 168 L142 152 L126 132 L116 112 Z " +
  // Central America
  "M244 186 L262 190 L274 202 L272 218 L260 228 L246 224 L238 210 Z";

export function ReachMap({
  countries,
  className = "",
  variant = "full",
}: {
  countries: ReachCountry[];
  className?: string;
  /** `echo` is the small monochrome version behind the homepage impact strip. */
  variant?: "full" | "echo";
}) {
  const [active, setActive] = useState<ReachCountry | null>(null);
  const titleId = useId();

  const plotted = countries.filter((c) => COORDS[c.country_code.toUpperCase()]);
  const missing = countries.filter(
    (c) => !COORDS[c.country_code.toUpperCase()],
  );

  const isEcho = variant === "echo";

  return (
    <div className={`relative ${className}`.trim()}>
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="h-auto w-full"
        role="img"
        aria-labelledby={titleId}
      >
        {/* Single interpolated string, not mixed text + expression children:
            React renders an SVG <title> with mixed children as empty, which
            silently strips the map's accessible name. */}
        <title
          id={titleId}
        >{`Map showing the ${plotted.length} countries where SRN is active`}</title>

        <path
          d={LANDMASS}
          className={isEcho ? "fill-paper/[0.06]" : "fill-mist"}
          stroke={isEcho ? "none" : "var(--color-hairline)"}
          strokeWidth={1}
        />

        {plotted.map((c) => {
          const [lon, lat] = COORDS[c.country_code.toUpperCase()];
          const [x, y] = project(lon, lat);
          const isActive = active?.country_code === c.country_code;

          if (isEcho) {
            return (
              <circle
                key={c.country_code}
                cx={x}
                cy={y}
                r={4}
                className="fill-paper/25"
              />
            );
          }

          return (
            <g key={c.country_code}>
              {/* Halo on hover/focus, drawn under the dot. */}
              <circle
                cx={x}
                cy={y}
                r={isActive ? 14 : 0}
                className="fill-evidence/20 transition-all duration-200"
              />
              <circle
                cx={x}
                cy={y}
                r={isActive ? 7 : 5}
                className="fill-evidence transition-all duration-200"
              />
              {/* Focusable hit target, comfortably larger than the dot. */}
              <circle
                cx={x}
                cy={y}
                r={16}
                fill="transparent"
                tabIndex={0}
                role="button"
                aria-label={`${c.country_name}${c.note ? `: ${c.note}` : ""}`}
                className="cursor-pointer focus:outline-none"
                onMouseEnter={() => setActive(c)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(c)}
                onBlur={() => setActive(null)}
              />
            </g>
          );
        })}

        {/* Tooltip, rendered in SVG space so it tracks the dot exactly. */}
        {active && !isEcho
          ? (() => {
              const [lon, lat] = COORDS[active.country_code.toUpperCase()];
              const [x, y] = project(lon, lat);
              const w = Math.max(active.country_name.length * 9 + 24, 90);
              const flip = x + w / 2 > VIEW_W - 8;
              const tx = flip ? x - w / 2 - 20 : x - w / 2;
              return (
                <g
                  pointerEvents="none"
                  transform={`translate(${tx}, ${y - 44})`}
                >
                  <rect width={w} height={30} rx={6} className="fill-ink" />
                  <text
                    x={w / 2}
                    y={20}
                    textAnchor="middle"
                    className="fill-paper text-[14px] font-semibold"
                  >
                    {active.country_name}
                  </text>
                </g>
              );
            })()
          : null}
      </svg>

      {/* §3.4 / Sprint 2.5 — the same information without the map. Visible to
          screen readers always; the page is complete with zero JavaScript. */}
      <ul className="sr-only">
        {countries.map((c) => (
          <li key={c.country_code}>
            {c.country_name}
            {c.note ? `: ${c.note}` : ""}
          </li>
        ))}
      </ul>

      {/* Countries we have no coordinates for would silently vanish from the
          map, so surface them rather than dropping them. */}
      {missing.length > 0 && !isEcho ? (
        <p className="text-slate text-small mt-4">
          Also active in: {missing.map((c) => c.country_name).join(", ")}
        </p>
      ) : null}
    </div>
  );
}
