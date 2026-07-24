import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
await p.goto("http://localhost:3000/", { waitUntil: "load", timeout: 60000 });
await p.waitForTimeout(3000);
await p.screenshot({ path: `${process.argv[2]}/_ours.png` });
await b.close(); console.log("ours captured");
