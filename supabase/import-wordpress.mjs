/**
 * Inventories the old WordPress site via its public REST API.
 *
 *   node supabase/import-wordpress.mjs            write the inventory
 *   node supabase/import-wordpress.mjs --download fetch usable images locally
 *
 * Read-only against the live site. It writes a JSON inventory plus a
 * human-readable report; it does NOT write to Supabase. Migrating content is a
 * deliberate step for Sprint 6.1, once Fortune has confirmed what is current —
 * the old site contains outdated copy and typos that §10 says must not migrate.
 *
 * Stock photography is flagged and excluded: Design.md §7 forbids stock, and
 * the old site's media library carries a large number of theme-demo Unsplash
 * and Pexels files that must not be mistaken for real SRN photography.
 */
import {
  mkdirSync,
  writeFileSync,
  existsSync,
  createWriteStream,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

const here = dirname(fileURLToPath(import.meta.url));
const SITE = process.env.WP_SITE || "https://systematicreviewsnetwork.org";
const API = `${SITE}/wp-json/wp/v2`;
const OUT = join(here, "..", "wordpress-export");

const STOCK =
  /unsplash|pexels|rawpixel|shutterstock|istock|getty|pixabay|freepik/i;

/** Theme decoration and UI chrome, not content. */
const CHROME =
  /^(pattern|bg-|bullet|icon|arrow|divider|shape|blob|logo-|favicon|cropped-|placeholder)/i;

async function api(path) {
  const res = await fetch(`${API}${path}`, {
    headers: { "user-agent": "srn-site-build/1.0" },
  });
  if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}`);
  return res.json();
}

async function allMedia() {
  /* Page size is a request for *up to* 100; WordPress filters some
     attachments per page, so a short batch does NOT mean the last page.
     Drive the loop from X-WP-TotalPages instead, and de-duplicate by id. */
  const first = await fetch(`${API}/media?per_page=100&page=1&_fields=id`, {
    headers: { "user-agent": "srn-site-build/1.0" },
  });
  const totalPages = Number(first.headers.get("x-wp-totalpages")) || 1;

  const byId = new Map();
  for (let page = 1; page <= totalPages; page++) {
    try {
      const batch = await api(
        `/media?per_page=100&page=${page}` +
          `&_fields=id,slug,mime_type,source_url,alt_text,date,media_details`,
      );
      if (Array.isArray(batch)) for (const m of batch) byId.set(m.id, m);
    } catch {
      /* skip a bad page rather than truncating the whole inventory */
    }
  }
  return [...byId.values()];
}

const strip = (html = "") =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8217;/g, "'")
    .replace(/&#8211;/g, "–")
    .replace(/\s+/g, " ")
    .trim();

async function main() {
  mkdirSync(OUT, { recursive: true });

  console.log(`Reading ${SITE} ...\n`);

  const [posts, pages, media] = await Promise.all([
    api("/posts?per_page=100&_fields=id,slug,title,excerpt,content,date,link"),
    api("/pages?per_page=100&_fields=id,slug,title,content,date,link"),
    allMedia(),
  ]);

  const images = media.filter(
    (m) => m.mime_type?.startsWith("image/") && m.media_details?.width,
  );

  const stock = images.filter((m) => STOCK.test(m.slug));
  const chrome = images.filter(
    (m) => !STOCK.test(m.slug) && CHROME.test(m.slug),
  );
  const usable = images
    .filter((m) => !STOCK.test(m.slug) && !CHROME.test(m.slug))
    .map((m) => ({
      id: m.id,
      slug: m.slug,
      url: m.source_url,
      alt: m.alt_text || "",
      width: m.media_details.width,
      height: m.media_details.height,
      ratio: +(m.media_details.width / m.media_details.height).toFixed(2),
      date: m.date,
    }));

  /* Categorise by shape and size against the §7A specs. */
  const heroes = usable.filter((m) => m.ratio > 1.2 && m.width >= 2400);
  const events = usable.filter(
    (m) => m.ratio > 1.2 && m.width >= 1600 && m.width < 2400,
  );
  const portraits = usable.filter(
    (m) => m.ratio >= 0.7 && m.ratio <= 1.3 && m.width >= 800,
  );

  const inventory = {
    source: SITE,
    fetched_at: new Date().toISOString(),
    counts: {
      posts: posts.length,
      pages: pages.length,
      images_total: images.length,
      stock_excluded: stock.length,
      chrome_excluded: chrome.length,
      usable: usable.length,
    },
    hero_candidates: heroes,
    event_photo_candidates: events,
    portrait_candidates: portraits,
    all_usable: usable,
    stock_excluded: stock.map((m) => m.slug),
    posts: posts.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: strip(p.title?.rendered),
      date: p.date,
      link: p.link,
      excerpt: strip(p.excerpt?.rendered).slice(0, 300),
      word_count: strip(p.content?.rendered).split(/\s+/).length,
      text: strip(p.content?.rendered),
    })),
    pages: pages.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: strip(p.title?.rendered),
      link: p.link,
      word_count: strip(p.content?.rendered).split(/\s+/).length,
      text: strip(p.content?.rendered),
    })),
  };

  writeFileSync(
    join(OUT, "inventory.json"),
    JSON.stringify(inventory, null, 2),
  );

  const report = `# Old WordPress site — content inventory

Source: ${SITE}
Generated: ${new Date().toISOString().slice(0, 10)}

Read-only inventory of what can be reused. Nothing here is imported into
Supabase automatically — Design.md §10 requires copy to be rewritten rather
than migrated, so this is a source list, not a migration.

## Counts

| | |
|---|---|
| Posts | ${posts.length} |
| Pages | ${pages.length} |
| Images total | ${images.length} |
| — stock, excluded (§7) | ${stock.length} |
| — theme chrome, excluded | ${chrome.length} |
| **Usable images** | **${usable.length}** |

## Images by §7A role

- **Hero candidates** (landscape, ≥2400px): ${heroes.length}
- **Event photos** (landscape, 1600–2400px): ${events.length}
- **Portrait/headshot candidates** (≥800px, square-ish): ${portraits.length}

### Top hero candidates

${heroes
  .slice(0, 12)
  .map((m) => `- \`${m.slug}\` — ${m.width}×${m.height}`)
  .join("\n")}

## Pages

${pages.map((p) => `- \`${p.slug}\` — ${strip(p.title?.rendered)} (${strip(p.content?.rendered).split(/\s+/).length} words)`).join("\n")}

## Posts

${inventory.posts.map((p) => `- ${p.date.slice(0, 10)} — ${p.title} (${p.word_count} words)`).join("\n")}

## Excluded as stock (do not use)

${stock
  .slice(0, 20)
  .map((m) => `- \`${m.slug}\``)
  .join("\n")}
${stock.length > 20 ? `\n…and ${stock.length - 20} more.` : ""}

---

**Caution:** alt text on the old site is mostly empty, and §3.5 requires
descriptive alt text on every image. Anything reused needs alt text written
fresh. Photo permissions also still need confirming with Fortune.
`;

  writeFileSync(join(OUT, "REPORT.md"), report);

  console.log(`posts: ${posts.length}`);
  console.log(`pages: ${pages.length}`);
  console.log(`images: ${images.length} total`);
  console.log(`  stock excluded:  ${stock.length}`);
  console.log(`  chrome excluded: ${chrome.length}`);
  console.log(`  usable:          ${usable.length}`);
  console.log(`    hero candidates:     ${heroes.length}`);
  console.log(`    event photos:        ${events.length}`);
  console.log(`    portraits/headshots: ${portraits.length}`);
  console.log(`\nWrote wordpress-export/inventory.json and REPORT.md`);

  if (process.argv.includes("--download")) {
    const dir = join(OUT, "images");
    mkdirSync(dir, { recursive: true });
    const wanted = [...heroes, ...events, ...portraits];
    console.log(`\nDownloading ${wanted.length} images ...`);
    let done = 0;
    for (const m of wanted) {
      const ext = m.url.split(".").pop().split("?")[0].slice(0, 4);
      const file = join(dir, `${m.slug}.${ext}`);
      if (existsSync(file)) {
        done++;
        continue;
      }
      try {
        const res = await fetch(m.url);
        if (!res.ok) continue;
        await pipeline(Readable.fromWeb(res.body), createWriteStream(file));
        done++;
        if (done % 10 === 0)
          process.stdout.write(`  ${done}/${wanted.length}\r`);
      } catch {
        /* skip failures; the inventory still records the URL */
      }
    }
    console.log(
      `  downloaded ${done}/${wanted.length} to wordpress-export/images/`,
    );
  }
}

main().catch((e) => {
  console.error(`Failed: ${e.message}`);
  process.exit(1);
});
