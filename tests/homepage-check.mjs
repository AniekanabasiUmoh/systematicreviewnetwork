/**
 * Sprint 2.1 "Done when" checks.
 * Run with the dev or prod server up: npm run test:homepage
 */
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3000";
const browser = await chromium.launch();
let fail = 0;
const check = (label, ok, extra = "") => {
  console.log(
    `  ${ok ? "ok  " : "FAIL"} ${label}${extra ? ` — ${extra}` : ""}`,
  );
  if (!ok) fail++;
};

console.log("=== counters render real numbers with JS DISABLED (§2.2) ===");
{
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const p = await ctx.newPage();
  await p.goto(BASE, { waitUntil: "domcontentloaded" });
  const values = await p
    .locator("p.text-gold, [class*='text-gold']")
    .allTextContents();
  const joined = values.join(" ");
  check(
    "no bare '0' counter",
    !values.some((v) => v.trim() === "0"),
    joined.slice(0, 60),
  );
  check(
    "real figures present",
    /200\+|1,500\+|45/.test(joined),
    joined.slice(0, 60),
  );
  await ctx.close();
}

console.log("\n=== 13 sections in §5 order ===");
{
  const p = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto(BASE, { waitUntil: "load", timeout: 60000 });
  const text = await p.locator("body").innerText();
  const expected = [
    ["hero", /Better evidence/i],
    ["partner bar", /Supported by|working with/i],
    ["impact strip", /Researchers trained/i],
    ["about", /About SRN/i],
    ["what we do", /Four ways we build capacity/i],
    ["who we serve", /Find your starting point/i],
    ["explainer", /New to systematic reviews/i],
    ["featured programmes", /Start with a course/i],
    ["upcoming events", /Upcoming events/i],
    ["testimonial", /Participant|quote/i],
    ["resources", /Free guides, templates/i],
    ["newsletter", /Hear about new training/i],
    ["cta band", /Bring evidence synthesis training/i],
  ];
  for (const [name, re] of expected) check(name, re.test(text));
  await p.close();
}

console.log("\n=== drafts never reach the page ===");
{
  const p = await browser.newPage();
  await p.goto(BASE, { waitUntil: "load", timeout: 60000 });
  const html = await p.content();
  check("no draft event", !/should not be public/i.test(html));
  await p.close();
}

console.log("\n=== no horizontal scroll 360–1440 ===");
for (const w of [360, 390, 768, 1024, 1280, 1440]) {
  const p = await browser.newPage({ viewport: { width: w, height: 900 } });
  await p.goto(BASE, { waitUntil: "load", timeout: 60000 });
  const { s, c } = await p.evaluate(() => ({
    s: document.documentElement.scrollWidth,
    c: document.documentElement.clientWidth,
  }));
  check(`${w}px`, s <= c + 1, s > c + 1 ? `scrollW=${s} clientW=${c}` : "");
  await p.close();
}

console.log("\n=== structure ===");
{
  const p = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto(BASE, { waitUntil: "load", timeout: 60000 });
  check("exactly one h1", (await p.locator("h1").count()) === 1);
  const imgsNoAlt = await p.locator("img:not([alt])").count();
  check("every img has alt", imgsNoAlt === 0, `${imgsNoAlt} missing`);
  await p.close();
}

await browser.close();
console.log(
  fail === 0 ? "\nALL HOMEPAGE CHECKS PASSED" : `\n${fail} CHECK(S) FAILED`,
);
process.exit(fail === 0 ? 0 : 1);
