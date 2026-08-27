/**
 * Rebuilds the three Module 6 diagrams as crisp SVG → PNG, replacing the
 * blurry upscales of the source document's tiny (255-296px) screenshots.
 * Same content and layout as the originals, rendered natively instead of
 * upscaled, in the site's own palette (app/globals.css --color-ink,
 * --color-evidence, --color-evidence-tint) rather than the source's blue.
 *
 *   node supabase/build-academy-diagrams.mjs
 *
 * Writes PNGs to supabase/academy-diagrams/, overwriting the extracted
 * originals — re-run supabase/upload-academy-diagrams.mjs afterwards to push
 * these to Storage under the same keys (upsert, so it replaces in place).
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(here, "academy-diagrams");
mkdirSync(OUT_DIR, { recursive: true });

const INK = "#16182b";
const EVIDENCE = "#1f6f5c";
const TINT = "#e8f2ef";
const PAPER = "#ffffff";

const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

/** Wraps a label into up to `maxLines` tspans of roughly `charsPerLine`. */
function wrapLabel(text, charsPerLine, x, y, lineHeight) {
  const words = text.split(" ");
  const lines = [];
  let current = "";
  for (const w of words) {
    const next = current ? `${current} ${w}` : w;
    if (next.length > charsPerLine && current) {
      lines.push(current);
      current = w;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  return lines
    .map((line, i) => `<tspan x="${x}" y="${startY + i * lineHeight}">${line}</tspan>`)
    .join("");
}

/* ---- Diagram 1: seven-step flow (database search → analysis) ------------ */

function buildFlowSteps() {
  const steps = [
    "Database Search",
    "Abstract screening",
    "Article retrieval",
    "Article screening",
    "Data Extraction",
    "Synthesis",
    "Analysis",
  ];
  const W = 1400;
  const H = 500;
  const boxW = 150;
  const boxH = 320;
  const gap = 40;
  const totalW = steps.length * boxW + (steps.length - 1) * gap;
  const startX = (W - totalW) / 2;
  const topY = 90;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
  svg += `<rect width="${W}" height="${H}" fill="${PAPER}"/>`;

  steps.forEach((label, i) => {
    const x = startX + i * (boxW + gap);
    const cy = topY + boxH / 2;

    svg += `<rect x="${x}" y="${topY}" width="${boxW}" height="${boxH}" rx="${boxW / 2}" fill="${TINT}" stroke="${EVIDENCE}" stroke-width="2"/>`;

    svg += `<text x="${x + boxW / 2}" y="${topY + 34}" text-anchor="middle" font-family="${FONT}" font-size="20" font-weight="700" fill="${INK}">${i + 1}</text>`;

    svg += `<text text-anchor="middle" font-family="${FONT}" font-size="19" font-weight="600" fill="${INK}">${wrapLabel(
      label,
      12,
      x + boxW / 2,
      cy,
      24,
    )}</text>`;

    if (i < steps.length - 1) {
      const arrowY = cy;
      const x1 = x + boxW + 6;
      const x2 = x + boxW + gap - 6;
      svg += `<line x1="${x1}" y1="${arrowY}" x2="${x2 - 10}" y2="${arrowY}" stroke="${INK}" stroke-width="3"/>`;
      svg += `<polygon points="${x2 - 10},${arrowY - 8} ${x2},${arrowY} ${x2 - 10},${arrowY + 8}" fill="${INK}"/>`;
    }
  });

  svg += `</svg>`;
  return svg;
}

/* ---- Diagram 2: full review-process flowchart ---------------------------- */

function buildProcessFlowchart() {
  const W = 1400;
  const H = 570;

  const nodes = {
    question: { x: 620, y: 60, w: 320, h: 90, label: "Develop the research question and protocol" },
    search: { x: 1020, y: 60, w: 300, h: 90, label: "Run the literature search" },
    tiScreen: { x: 1020, y: 260, w: 300, h: 90, label: "Screen titles and abstracts" },
    retrieve: { x: 620, y: 260, w: 300, h: 90, label: "Retrieve full texts" },
    ftScreen: { x: 220, y: 260, w: 300, h: 90, label: "Screen full texts" },
    extract: { x: 220, y: 460, w: 300, h: 90, label: "Extract data" },
    write: { x: 620, y: 460, w: 300, h: 90, label: "Write and report the results" },
  };

  const order = ["question", "search", "tiScreen", "retrieve", "ftScreen", "extract", "write"];

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
  svg += `<rect width="${W}" height="${H}" fill="${PAPER}"/>`;

  const arrow = (x1, y1, x2, y2) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    const ux = dx / len;
    const uy = dy / len;
    const ex = x2 - ux * 12;
    const ey = y2 - uy * 12;
    return `<line x1="${x1}" y1="${y1}" x2="${ex}" y2="${ey}" stroke="${INK}" stroke-width="3"/>
      <polygon points="${ex + uy * 8},${ey - ux * 8} ${x2},${y2} ${ex - uy * 8},${ey + ux * 8}" fill="${INK}"/>`;
  };

  const center = (n) => ({ cx: n.x + n.w / 2, cy: n.y + n.h / 2 });

  const c = Object.fromEntries(order.map((k) => [k, center(nodes[k])]));

  svg += arrow(c.question.cx + nodes.question.w / 2, c.question.cy, nodes.search.x, c.search.cy);
  svg += arrow(c.search.cx, nodes.search.y + nodes.search.h, c.tiScreen.cx, nodes.tiScreen.y);
  svg += arrow(nodes.tiScreen.x, c.tiScreen.cy, nodes.retrieve.x + nodes.retrieve.w, c.retrieve.cy);
  svg += arrow(nodes.retrieve.x, c.retrieve.cy, nodes.ftScreen.x + nodes.ftScreen.w, c.ftScreen.cy);
  svg += arrow(c.ftScreen.cx, nodes.ftScreen.y + nodes.ftScreen.h, c.extract.cx, nodes.extract.y);
  svg += arrow(nodes.extract.x + nodes.extract.w, c.extract.cy, nodes.write.x, c.write.cy);

  for (const key of order) {
    const n = nodes[key];
    const isFirst = key === "question";
    svg += `<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="10" fill="${isFirst ? EVIDENCE : TINT}" stroke="${EVIDENCE}" stroke-width="2"/>`;
    svg += `<text text-anchor="middle" font-family="${FONT}" font-size="20" font-weight="600" fill="${isFirst ? PAPER : INK}">${wrapLabel(
      n.label,
      26,
      n.x + n.w / 2,
      n.y + n.h / 2,
      26,
    )}</text>`;
  }

  svg += `</svg>`;
  return svg;
}

/* ---- Diagram 3: six-icon overview (course intro) -------------------------- */

function buildSixStepOverview() {
  const steps = [
    "Define the review question",
    "Identify inclusion and exclusion criteria",
    "Identify and assess relevant research",
    "Apply inclusion and exclusion criteria",
    "Extract data",
    "Assess quality",
    "Analyse data",
    "Interpret and write up findings",
  ];
  const W = 1600;
  const H = 620;
  const cols = 4;
  const cellW = W / cols;
  const rowH = 290;
  const circleR = 56;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
  svg += `<rect width="${W}" height="${H}" fill="${PAPER}"/>`;

  steps.forEach((label, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = cellW * col + cellW / 2;
    const cy = row * rowH + 110;
    const labelY = cy + circleR + 34;

    svg += `<circle cx="${cx}" cy="${cy}" r="${circleR}" fill="${TINT}" stroke="${EVIDENCE}" stroke-width="2.5"/>`;
    svg += `<text x="${cx}" y="${cy + 8}" text-anchor="middle" font-family="${FONT}" font-size="26" font-weight="700" fill="${EVIDENCE}">${i + 1}</text>`;
    svg += `<text text-anchor="middle" font-family="${FONT}" font-size="18" font-weight="600" fill="${INK}">${wrapLabel(
      label,
      20,
      cx,
      labelY,
      23,
    )}</text>`;

    if (col < cols - 1) {
      const x1 = cx + circleR + 14;
      const x2 = cellW * (col + 1) + cellW / 2 - circleR - 14;
      svg += `<line x1="${x1}" y1="${cy}" x2="${x2 - 10}" y2="${cy}" stroke="${INK}" stroke-width="2.5"/>`;
      svg += `<polygon points="${x2 - 10},${cy - 7} ${x2},${cy} ${x2 - 10},${cy + 7}" fill="${INK}"/>`;
    }
  });

  svg += `</svg>`;
  return svg;
}

async function svgToPng(svg, outPath, width) {
  const buf = await sharp(Buffer.from(svg)).resize({ width }).png({ quality: 95 }).toBuffer();
  writeFileSync(outPath, buf);
  const meta = await sharp(buf).metadata();
  console.log(`wrote ${outPath} (${meta.width}x${meta.height})`);
}

await svgToPng(buildFlowSteps(), join(OUT_DIR, "image1.png"), 1400);
await svgToPng(buildProcessFlowchart(), join(OUT_DIR, "image2.png"), 1200);
await svgToPng(buildSixStepOverview(), join(OUT_DIR, "image3.png"), 1600);

console.log("\nDone. Run `node --env-file=.env supabase/upload-academy-diagrams.mjs` to push these to Storage.");
