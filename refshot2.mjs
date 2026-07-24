import { chromium } from "playwright";
const out = process.argv[2];
const SITES = [
  ["aen", "https://africaevidencenetwork.org/"],
  ["cebm", "https://www.cebm.ox.ac.uk/"],
  ["wellcome", "https://wellcome.org/"],
  ["nihr", "https://www.nihr.ac.uk/"],
  ["guttmacher", "https://www.guttmacher.org/"],
  ["odi", "https://odi.org/en/"],
];
const b = await chromium.launch();
for (const [name, url] of SITES) {
  try {
    const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
    await p.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await p.waitForTimeout(4000);
    for (const sel of ['button:has-text("Accept")','button:has-text("Agree")','#onetrust-accept-btn-handler']) {
      try { await p.click(sel, { timeout: 800 }); await p.waitForTimeout(400); } catch {}
    }
    await p.screenshot({ path: `${out}/${name}.png` });
    console.log(`  ok   ${name}`); await p.close();
  } catch (e) { console.log(`  FAIL ${name}: ${String(e.message).slice(0,50)}`); }
}
await b.close(); console.log("done");
