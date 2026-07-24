import Image from "next/image";
import {
  getHomepage,
  getImpactStats,
  getUpcomingEvents,
  getMedia,
  getMediaByUrl,
} from "@/lib/queries";
import { formatEventDate, formatPrice } from "@/lib/events";
import { StatCounterProto } from "./StatCounterProto";
import { ProtoNav } from "./ProtoNav";

/* Design prototype — the ESI-informed direction, rendered against real SRN
   data. Scoped to /prototype; deletes cleanly. Not indexed.

   Direction: simple and elegant. Plain white, near-monochrome ink, green only
   as a button fill (never text). Sharp corners everywhere except the one pill.
   The hero is full-bleed with a thin→black two-weight headline (ESI's move).
   Layout breaks the card grid: a photo-backed impact band, a split statement,
   a full-bleed feature, and a typographic programme index.

   Section order leads a NEW visitor: hero → what SRN does → where to start →
   proof (impact) → mentorship outcome → what's on → origin story → partner.
   The ACSRM history matters to members but isn't the first thing a newcomer
   needs, so it sits late (a coodex note). */

export const revalidate = 60;

const NAV = ["About", "Programmes", "Resources", "Impact", "Team", "News"];

export default async function PrototypePage() {
  const [homepage, stats, events, feature, split] = await Promise.all([
    getHomepage(),
    getImpactStats(),
    getUpcomingEvents(3),
    getMedia("award-of-honour.jpg"),
    getMedia("workshop-full-room.jpg"),
  ]);

  const heroUrl = homepage?.hero_image_url ?? null;
  // Image and alt must describe the SAME picture: resolve alt from the URL
  // actually rendered, not a hardcoded fallback record (coodex find).
  const heroMedia = heroUrl
    ? await getMediaByUrl(heroUrl)
    : await getMedia("hero-cohort-steps.jpg");
  const heroSrc = heroUrl ?? heroMedia?.url ?? null;

  // Four strongest stats — a clean 4-up reads as complete, where six leaves a
  // half-empty second row that looks unfinished (coodex).
  const topStats = stats.slice(0, 4);

  return (
    <>
      <a className="p-skip" href="#main">
        Skip to content
      </a>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <header className="p-hero" id="top">
        {heroSrc ? (
          <Image
            src={heroSrc}
            alt={heroMedia?.alt ?? ""}
            fill
            priority
            sizes="100vw"
            style={{ objectFit: "cover" }}
          />
        ) : null}
        <div className="p-hero-scrim" />

        <ProtoNav links={NAV} />

        <div className="p-container p-hero-inner">
          <p className="p-eyebrow" style={{ color: "rgba(255,255,255,0.75)" }}>
            Systematic Reviews Network
          </p>
          {/* The two-weight move: thin over black, same size. */}
          <h1>
            <span className="p-hero-thin">Better evidence.</span>
            <span className="p-hero-black">Smarter decisions.</span>
          </h1>
          <p className="p-lede">
            We build capacity for systematic reviews and meta-analyses across
            low- and middle-income countries — training researchers to produce
            evidence that stands up to scrutiny.
          </p>
          <div style={{ display: "flex", gap: 12, marginTop: 32, flexWrap: "wrap" }}>
            <a className="p-btn p-btn-primary" href="#">
              Explore programmes
            </a>
            <a
              className="p-btn p-btn-on-photo"
              href="#"
              style={{ background: "transparent", color: "#fff", borderColor: "rgba(255,255,255,0.5)" }}
            >
              What is a systematic review?
            </a>
          </div>
        </div>
      </header>

      <main id="main">
        {/* ── What we do — the newcomer's first question ─────────────────── */}
        <section className="p-section p-band-paper" aria-labelledby="what-we-do">
          <div className="p-container">
            <div className="p-split">
              <div>
                <p className="p-eyebrow">What we do</p>
                <h2
                  id="what-we-do"
                  className="p-h2"
                  style={{ marginTop: 16, fontSize: "clamp(1.6rem,3.4vw,2.6rem)" }}
                >
                  Training, mentorship, and the tools to do a review well.
                </h2>
                <p className="p-lede" style={{ marginTop: 20 }}>
                  From a first course to a completed meta-analysis, SRN supports
                  researchers at every stage — with hands-on training, one-to-one
                  mentorship, and open resources anyone can use.
                </p>
                <div style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap" }}>
                  <a className="p-btn p-btn-ghost" href="#">
                    All programmes
                  </a>
                </div>
              </div>
              <div className="p-split-media">
                {split?.url ? (
                  <Image src={split.url} alt={split.alt ?? ""} fill sizes="(max-width:900px) 100vw, 50vw" style={{ objectFit: "cover" }} />
                ) : null}
              </div>
            </div>
          </div>
        </section>

        {/* ── The thread — signature divider, drawn in ink ───────────────── */}
        <div className="p-container" aria-hidden>
          <Thread />
        </div>

        {/* ── Programme index — "find your starting point" ───────────────── */}
        <section className="p-section p-band-alt" aria-labelledby="programmes">
          <div className="p-container">
            <p className="p-eyebrow">Programmes</p>
            <h2
              id="programmes"
              className="p-h2"
              style={{ marginTop: 12, marginBottom: 32, fontSize: "clamp(1.6rem,3.4vw,2.4rem)" }}
            >
              Find the right starting point.
            </h2>
            <ul className="p-index" role="list">
              {[
                ["Beginner Academy", "For students new to reviews", "Online · 4 weeks"],
                ["Practical Course", "For active review teams", "In person · 3 days"],
                ["Mentorship Programme", "Paired guidance, live review", "Online · 6 months"],
                ["Webinar Series", "Open to everyone", "Online · Free"],
                ["Institutional Training", "For departments & faculties", "Bespoke"],
              ].map(([title, who, meta], i) => (
                <li key={title}>
                  <a className="p-index-row" href="#">
                    <span className="p-index-num">{String(i + 1).padStart(2, "0")}</span>
                    <span>
                      <span className="p-index-title" style={{ display: "block" }}>
                        {title}
                      </span>
                      <span className="p-index-meta">{who}</span>
                    </span>
                    <span className="p-index-meta p-index-meta-end">{meta}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Impact band — photo-backed, real counters ──────────────────── */}
        <section className="p-impact" aria-labelledby="impact">
          {feature?.url ? (
            <Image
              src={feature.url}
              alt=""
              fill
              sizes="100vw"
              style={{ objectFit: "cover", opacity: 0.18 }}
            />
          ) : null}
          <div className="p-container" style={{ position: "relative", padding: "0 32px" }}>
            <h2 id="impact" className="p-sr-only">
              Our impact
            </h2>
            <div className="p-impact-grid">
              {topStats.map((s) => (
                <div className="p-stat" key={s.id}>
                  <div className="p-stat-num">
                    <StatCounterProto value={s.value} />
                  </div>
                  <div className="p-stat-label">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Full-bleed feature — mentorship (ESI Fellowship pattern) ────── */}
        <section className="p-feature" aria-labelledby="mentorship">
          {feature?.url ? (
            <Image src={feature.url} alt="" fill sizes="100vw" style={{ objectFit: "cover" }} />
          ) : null}
          <div className="p-feature-scrim" />
          <div className="p-container" style={{ position: "relative" }}>
            <div className="p-feature-inner">
              <p className="p-eyebrow" style={{ color: "rgba(255,255,255,0.75)" }}>
                Mentorship
              </p>
              <h2 id="mentorship" className="p-h2" style={{ color: "#fff", marginTop: 14 }}>
                Guidance from someone who has done it before.
              </h2>
              <p className="p-lede" style={{ marginTop: 18 }}>
                The Mentorship Programme pairs researchers with experienced
                reviewers through the whole of a live review — so you stop
                second-guessing every methodological choice.
              </p>
              <a className="p-btn p-btn-on-photo" href="#" style={{ marginTop: 28 }}>
                Learn more
              </a>
            </div>
          </div>
        </section>

        {/* ── Upcoming events — quiet list ───────────────────────────────── */}
        <section className="p-section p-band-paper" aria-labelledby="whats-on">
          <div className="p-container">
            <p className="p-eyebrow">What&apos;s on</p>
            <h2
              id="whats-on"
              className="p-h2"
              style={{ marginTop: 12, marginBottom: 28, fontSize: "clamp(1.6rem,3.4vw,2.4rem)" }}
            >
              Upcoming events
            </h2>
            <ul className="p-index" role="list">
              {events.map((e, i) => (
                <li key={e.id}>
                  <a className="p-index-row" href="#">
                    <span className="p-index-num">{String(i + 1).padStart(2, "0")}</span>
                    <span>
                      <span className="p-index-title" style={{ display: "block", fontSize: "clamp(1.15rem,2.2vw,1.5rem)" }}>
                        {e.title}
                      </span>
                      <span className="p-index-meta">
                        {formatEventDate(e.starts_at, e.ends_at)} ·{" "}
                        {e.location_type === "online" ? "Online" : "In person"}
                      </span>
                    </span>
                    <span className="p-index-meta p-index-meta-end">
                      {formatPrice(e.price_kobo, e.currency)}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── About / origin story — late, for the curious ───────────────── */}
        <section className="p-section p-band-alt" aria-labelledby="about">
          <div className="p-container">
            <p className="p-eyebrow">About SRN</p>
            <h2
              id="about"
              className="p-h2"
              style={{ maxWidth: "24ch", marginTop: 20, fontSize: "clamp(1.8rem,4vw,3rem)" }}
            >
              Formerly ACSRM. Launched in 2022. Working across Africa and beyond.
            </h2>
            <p className="p-lede" style={{ marginTop: 24 }}>
              {homepage?.about_paragraph}
            </p>
            <p style={{ marginTop: 20 }}>
              <a className="p-link" href="#">
                Read the full story →
              </a>
            </p>
          </div>
        </section>
      </main>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="p-band-ink" style={{ paddingTop: "clamp(56px,7vw,88px)", paddingBottom: 40 }}>
        <div className="p-container">
          <div className="p-footer-top">
            <div style={{ maxWidth: "34ch" }}>
              <span className="p-wordmark">SRN</span>
              <p className="p-lede" style={{ color: "rgba(246,243,236,0.7)", marginTop: 12 }}>
                Building capacity for systematic reviews across low- and
                middle-income countries.
              </p>
              <a className="p-btn p-btn-on-photo" href="#" style={{ marginTop: 24 }}>
                Partner with SRN
              </a>
            </div>

            <nav className="p-footer-cols" aria-label="Footer">
              <div>
                <p className="p-footer-h">Explore</p>
                <ul>
                  <li><a href="#">Programmes</a></li>
                  <li><a href="#">Resources</a></li>
                  <li><a href="#">Impact</a></li>
                  <li><a href="#">News &amp; events</a></li>
                </ul>
              </div>
              <div>
                <p className="p-footer-h">Organisation</p>
                <ul>
                  <li><a href="#">About</a></li>
                  <li><a href="#">Team</a></li>
                  <li><a href="#">Partner with us</a></li>
                  <li><a href="#">Contact</a></li>
                </ul>
              </div>
              <div>
                <p className="p-footer-h">Contact</p>
                <ul>
                  <li><a href="mailto:info@systematicreviewsnetwork.org">info@systematicreviewsnetwork.org</a></li>
                  <li><a href="#">LinkedIn</a></li>
                  <li><a href="#">X / Twitter</a></li>
                </ul>
              </div>
            </nav>
          </div>

          <div className="p-footer-legal">
            <span>© {new Date().getFullYear()} Systematic Reviews Network. Formerly ACSRM.</span>
            <span className="p-footer-legal-links">
              <a href="#">Privacy</a>
              <a href="#">Accessibility</a>
            </span>
          </div>
        </div>
      </footer>
    </>
  );
}

/* The thread: a single fine woven sine line, in ink at low opacity. SRN's one
   signature device, drawn — not gold, not green. */
function Thread() {
  const w = 1136;
  const mid = 20;
  const amp = 12;
  const period = 90;
  let d = `M0 ${mid}`;
  for (let x = 0; x <= w; x += period / 2) {
    const dir = (x / (period / 2)) % 2 < 1 ? -1 : 1;
    d += ` Q ${x + period / 4} ${mid + dir * amp} ${x + period / 2} ${mid}`;
  }
  return (
    <svg className="p-thread" viewBox={`0 0 ${w} 40`} fill="none" preserveAspectRatio="none">
      <path d={d} stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
