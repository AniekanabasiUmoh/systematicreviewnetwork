import { chromium } from "playwright";
const out = process.argv[2];
const SITES = [
  ["cochrane", "https://www.cochrane.org/"],
  ["jbi", "https://jbi.global/"],
  ["esi", "https://evidencesynthesisireland.ie/"],
];
const b = await chromium.launch();
for (const [name, url] of SITES) {
  try {
    const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
    await p.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await p.waitForTimeout(5000);
    for (const sel of ['#onetrust-accept-btn-handler','button:has-text("Accept")','button:has-text("Allow all")']) {
      try { await p.click(sel, { timeout: 1000 }); await p.waitForTimeout(500); } catch {}
    }
    await p.waitForTimeout(500);
    await p.screenshot({ path: `${out}/${name}.png` });
    const exists = (await import("node:fs")).existsSync(`${out}/${name}.png`);
    console.log(`  ${exists?"ok  ":"NOFILE"} ${name}`);
    await p.close();
  } catch (e) { console.log(`  FAIL ${name}: ${String(e.message).slice(0,50)}`); }
}
await b.close(); console.log("done");
