import { chromium } from "playwright";
const out = process.argv[2];
const SITES = [
  ["cochrane", "https://www.cochrane.org/"],
  ["jbi", "https://jbi.global/"],
  ["campbell", "https://www.campbellcollaboration.org/"],
  ["esi", "https://evidencesynthesisireland.ie/"],
  ["aen", "https://www.africaevidencenetwork.org/"],
  ["cebm", "https://www.cebm.ox.ac.uk/"],
  ["wellcome", "https://wellcome.org/"],
  ["3ie", "https://www.3ieimpact.org/"],
  ["equator", "https://www.equator-network.org/"],
  ["nihr", "https://www.nihr.ac.uk/"],
];
const b = await chromium.launch();
for (const [name, url] of SITES) {
  try {
    const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
    await p.goto(url, { waitUntil: "load", timeout: 45000 });
    await p.waitForTimeout(3500);
    // dismiss common cookie banners so they don't dominate the shot
    for (const sel of ['button:has-text("Accept")','button:has-text("Agree")','button:has-text("OK")','#onetrust-accept-btn-handler']) {
      try { await p.click(sel, { timeout: 800 }); await p.waitForTimeout(400); } catch {}
    }
    await p.screenshot({ path: `${out}/${name}.png` });        // above the fold
    console.log(`  ok   ${name}`);
    await p.close();
  } catch (e) { console.log(`  FAIL ${name}: ${String(e.message).slice(0,60)}`); }
}
await b.close();
console.log("done");
