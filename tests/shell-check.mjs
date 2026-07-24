/**
 * Sprint 1.2 "Done when" checks:
 *  - responsive 360 -> 1440px with no horizontal scroll
 *  - mobile sheet traps focus and closes on Escape
 *  - tab order sane, skip link first
 */
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3000";
const PAGES = ["/", "/styleguide", "/styleguide/components", "/does-not-exist"];
const WIDTHS = [360, 390, 768, 1024, 1280, 1440];

const browser = await chromium.launch();
let failures = 0;

console.log("=== horizontal scroll check ===");
for (const path of PAGES) {
  for (const width of WIDTHS) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
    const { scrollW, clientW } = await page.evaluate(() => ({
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
    }));
    const overflow = scrollW > clientW + 1;
    if (overflow) {
      failures++;
      // Identify the culprit so the report is actionable.
      const culprits = await page.evaluate((cw) => {
        const out = [];
        for (const el of document.querySelectorAll("*")) {
          const r = el.getBoundingClientRect();
          if (r.right > cw + 1 && r.width > 0) {
            out.push(
              `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)} right=${Math.round(r.right)}`,
            );
          }
          if (out.length >= 3) break;
        }
        return out;
      }, clientW);
      console.log(
        `  FAIL ${path} @${width}px  scrollW=${scrollW} clientW=${clientW}`,
      );
      culprits.forEach((c) => console.log(`       ${c}`));
    }
    await page.close();
  }
  console.log(`  ok   ${path} — no overflow at any width`);
}

console.log("\n=== mobile sheet: focus trap + escape ===");
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(BASE, { waitUntil: "networkidle" });

  await page.getByRole("button", { name: /open menu/i }).click();
  const dialog = page.getByRole("dialog");
  const visible = await dialog.isVisible();
  console.log(`  sheet opens: ${visible ? "yes" : "NO"}`);
  if (!visible) failures++;

  // Body scroll must be locked while the sheet is open.
  const locked = await page.evaluate(
    () => getComputedStyle(document.body).overflow === "hidden",
  );
  console.log(`  body scroll locked: ${locked ? "yes" : "NO"}`);
  if (!locked) failures++;

  // Tab well past the number of focusables; focus must never escape the sheet.
  let escaped = false;
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press("Tab");
    const inside = await page.evaluate(() => {
      const d = document.querySelector('[role="dialog"]');
      return d ? d.contains(document.activeElement) : false;
    });
    if (!inside) {
      escaped = true;
      break;
    }
  }
  console.log(`  focus stays trapped over 25 tabs: ${escaped ? "NO" : "yes"}`);
  if (escaped) failures++;

  await page.keyboard.press("Escape");
  const closed = (await page.getByRole("dialog").count()) === 0;
  console.log(`  escape closes it: ${closed ? "yes" : "NO"}`);
  if (!closed) failures++;

  const restored = await page.evaluate(
    () =>
      document.activeElement?.getAttribute("aria-controls") === "mobile-menu",
  );
  console.log(`  focus returns to trigger: ${restored ? "yes" : "NO"}`);
  if (!restored) failures++;

  const unlocked = await page.evaluate(
    () => getComputedStyle(document.body).overflow !== "hidden",
  );
  console.log(`  body scroll restored: ${unlocked ? "yes" : "NO"}`);
  if (!unlocked) failures++;

  await page.close();
}

console.log("\n=== skip link is the first tab stop ===");
{
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.keyboard.press("Tab");
  const text = await page.evaluate(() =>
    document.activeElement?.textContent?.trim(),
  );
  const ok = /skip to content/i.test(text ?? "");
  console.log(`  first tab stop: "${text}" ${ok ? "— correct" : "— WRONG"}`);
  if (!ok) failures++;
  await page.close();
}

console.log("\n=== one h1 per page (§3.5) ===");
for (const path of PAGES) {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  const n = await page.locator("h1").count();
  console.log(`  ${path} — ${n} h1 ${n === 1 ? "" : "<-- CHECK"}`);
  if (n !== 1) failures++;
  await page.close();
}

await browser.close();
console.log(
  failures === 0
    ? "\nALL SHELL CHECKS PASSED"
    : `\n${failures} CHECK(S) FAILED`,
);
process.exit(failures === 0 ? 0 : 1);
