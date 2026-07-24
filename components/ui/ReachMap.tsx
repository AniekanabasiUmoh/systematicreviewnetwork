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

/* Simplified continent silhouettes, traced in lon/lat and projected through
   `project()` at render time rather than hardcoded in SVG space. Tracing in
   real coordinates means the outlines stay correct if the viewport window
   (LON_MIN/LAT_MAX etc.) is ever retuned — hardcoded path data would silently
   drift out of register with the dots.

   Deliberately coarse: a quiet backdrop for the dots, not a cartographic
   reference. */
const OUTLINES: [number, number][][] = [
  // Africa + Arabian peninsula
  [
    [-17, 21],
    [-16, 15],
    [-13, 9],
    [-8, 5],
    [0, 6],
    [6, 4],
    [9, 4],
    [9, 2],
    [12, -5],
    [14, -12],
    [12, -17],
    [15, -23],
    [18, -28],
    [20, -35],
    [26, -34],
    [32, -29],
    [35, -24],
    [40, -16],
    [41, -11],
    [40, -3],
    [42, 1],
    [48, 5],
    [51, 10],
    [44, 12],
    [43, 15],
    [38, 18],
    [37, 22],
    [34, 28],
    [32, 31],
    [25, 32],
    [18, 30],
    [11, 34],
    [3, 36],
    [-6, 35],
    [-10, 31],
    [-14, 27],
  ],
  // Europe
  [
    [-10, 36],
    [-9, 43],
    [-2, 43],
    [-1, 46],
    [-5, 48],
    [-4, 50],
    [1, 51],
    [4, 53],
    [7, 54],
    [9, 57],
    [11, 59],
    [18, 59],
    [21, 56],
    [24, 57],
    [28, 60],
    [30, 60],
    [32, 55],
    [30, 50],
    [29, 46],
    [28, 41],
    [23, 40],
    [19, 40],
    [15, 38],
    [12, 38],
    [15, 41],
    [13, 45],
    [8, 44],
    [3, 42],
    [-2, 39],
  ],
  // Asia
  [
    [33, 31],
    [35, 36],
    [42, 37],
    [45, 40],
    [50, 44],
    [55, 42],
    [61, 45],
    [67, 45],
    [73, 40],
    [77, 35],
    [80, 30],
    [88, 28],
    [92, 22],
    [95, 17],
    [98, 12],
    [100, 6],
    [104, 2],
    [109, 3],
    [107, 11],
    [109, 15],
    [107, 21],
    [110, 21],
    [117, 24],
    [122, 31],
    [122, 37],
    [126, 40],
    [130, 43],
    [135, 45],
    [140, 46],
    [143, 50],
    [140, 54],
    [135, 55],
    [130, 50],
    [127, 45],
    [122, 44],
    [120, 48],
    [117, 50],
    [110, 50],
    [105, 52],
    [98, 52],
    [90, 50],
    [85, 48],
    [80, 51],
    [70, 55],
    [60, 56],
    [55, 51],
    [50, 47],
    [47, 43],
    [44, 40],
    [40, 37],
    [36, 33],
  ],
  // India (drawn separately so the subcontinent reads)
  [
    [68, 24],
    [70, 20],
    [73, 16],
    [77, 8],
    [80, 10],
    [82, 17],
    [87, 21],
    [89, 22],
    [88, 26],
    [82, 26],
    [76, 28],
    [72, 27],
  ],
  // Australia
  [
    [114, -22],
    [113, -26],
    [115, -34],
    [119, -34],
    [125, -32],
    [131, -31],
    [137, -35],
    [140, -38],
    [146, -39],
    [150, -37],
    [153, -30],
    [153, -25],
    [148, -20],
    [143, -14],
    [136, -12],
    [130, -12],
    [125, -14],
    [122, -18],
  ],
  // South America
  [
    [-81, 0],
    [-79, -5],
    [-75, -14],
    [-70, -18],
    [-70, -23],
    [-72, -30],
    [-73, -37],
    [-73, -44],
    [-70, -50],
    [-66, -54],
    [-63, -47],
    [-62, -40],
    [-58, -34],
    [-53, -33],
    [-48, -26],
    [-40, -21],
    [-38, -13],
    [-42, -5],
    [-48, -1],
    [-51, 0],
    [-55, 4],
    [-60, 8],
    [-66, 11],
    [-72, 11],
    [-77, 8],
    [-79, 4],
  ],
  // North America
  [
    [-125, 49],
    [-130, 55],
    [-135, 58],
    [-140, 60],
    [-150, 61],
    [-158, 57],
    [-165, 55],
    [-160, 62],
    [-152, 65],
    [-145, 68],
    [-135, 69],
    [-125, 70],
    [-115, 69],
    [-105, 68],
    [-95, 68],
    [-85, 67],
    [-78, 62],
    [-70, 60],
    [-64, 58],
    [-58, 54],
    [-56, 50],
    [-62, 46],
    [-67, 45],
    [-70, 41],
    [-75, 36],
    [-81, 31],
    [-82, 26],
    [-88, 30],
    [-94, 29],
    [-97, 26],
    [-98, 20],
    [-95, 16],
    [-88, 16],
    [-84, 11],
    [-79, 9],
    [-83, 15],
    [-88, 21],
    [-95, 22],
    [-105, 23],
    [-110, 24],
    [-114, 30],
    [-117, 33],
    [-121, 35],
    [-124, 42],
  ],
];

/** Builds the backdrop path by projecting every outline point. */
const LANDMASS = OUTLINES.map(
  (ring) =>
    ring
      .map(([lon, lat], i) => {
        const [x, y] = project(lon, lat);
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ") + " Z",
).join(" ");

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
