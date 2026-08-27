const fs = require("fs");
const { chromium } = require("playwright");

const markdown = fs
  .readFileSync("FORTUNE_TEST_CHECKLIST.md", "utf8")
  .replace(/\r\n/g, "\n");

const escape = (value) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");

const inline = (value) =>
  escape(value)
    .replace(/\[([^\]]+)\]\(([^\s)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");

const output = [];
let listOpen = false;

for (const raw of markdown.split("\n")) {
  const line = raw.trim();

  if (!line) {
    if (listOpen) {
      output.push("</ul>");
      listOpen = false;
    }
    continue;
  }

  if (line.startsWith("# ")) {
    if (listOpen) {
      output.push("</ul>");
      listOpen = false;
    }
    output.push(`<h1>${inline(line.slice(2))}</h1>`);
    continue;
  }

  if (line.startsWith("## ")) {
    if (listOpen) {
      output.push("</ul>");
      listOpen = false;
    }
    output.push(`<h2>${inline(line.slice(3))}</h2>`);
    continue;
  }

  if (line.startsWith("- [ ] ")) {
    if (!listOpen) {
      output.push('<ul class="checklist">');
      listOpen = true;
    }
    output.push(`<li><span class="box"></span>${inline(line.slice(6))}</li>`);
    continue;
  }

  if (line.startsWith("- ")) {
    if (!listOpen) {
      output.push("<ul>");
      listOpen = true;
    }
    output.push(`<li>${inline(line.slice(2))}</li>`);
    continue;
  }

  if (listOpen) {
    output.push("</ul>");
    listOpen = false;
  }
  output.push(`<p>${inline(line)}</p>`);
}

if (listOpen) output.push("</ul>");

const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>SRN feature test checklist for Fortune</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  body { font-family: Arial, Helvetica, sans-serif; color: #17202a; font-size: 10.2pt; line-height: 1.42; }
  h1 { font-size: 24pt; line-height: 1.12; margin: 0 0 12pt; color: #0d3540; }
  h2 { font-size: 15pt; color: #0d3540; border-bottom: 1px solid #bcc7c9; padding-bottom: 4pt; margin: 24pt 0 9pt; page-break-after: avoid; }
  p { margin: 0 0 9pt; }
  ul { margin: 0 0 10pt 18pt; padding: 0; }
  .checklist { list-style: none; margin-left: 0; }
  .checklist li { break-inside: avoid; margin: 0 0 7pt; padding-left: 18pt; position: relative; }
  .box { position: absolute; left: 0; top: 3pt; width: 9pt; height: 9pt; border: 1.2pt solid #49626a; border-radius: 1pt; }
  li { margin-bottom: 5pt; }
  strong { color: #102f38; }
  a { color: #075a73; text-decoration: underline; }
  code { font-family: "Courier New", monospace; font-size: 9pt; background: #edf2f2; padding: 1pt 3pt; }
</style></head><body>${output.join("\n")}</body></html>`;

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "load" });
  await page.pdf({
    path: "FORTUNE_TEST_CHECKLIST.pdf",
    format: "A4",
    printBackground: true,
    margin: { top: "18mm", right: "16mm", bottom: "18mm", left: "16mm" },
  });
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
