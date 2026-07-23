import type { Metadata } from "next";
import { ArrowRight, Download, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = {
  title: "Styleguide",
  robots: { index: false, follow: false },
};

/* Design.md Sprint 0.1 — /styleguide renders the palette with hex labels, the
   type scale, the spacing scale, and buttons in all variants and states.
   Internal tool: noindex, not linked from the public nav. */

const palette = [
  {
    name: "brand",
    hex: "#24276E",
    use: "Headings, nav, footer, photo overlays",
    className: "bg-brand",
    onDark: true,
  },
  {
    name: "ink",
    hex: "#191C45",
    use: "Body text, ink sections",
    className: "bg-ink",
    onDark: true,
  },
  {
    name: "evidence",
    hex: "#1F6F5C",
    use: "THE action color — CTAs, links, focus rings",
    className: "bg-evidence",
    onDark: true,
  },
  {
    name: "gold",
    hex: "#C9A227",
    use: "Impact numbers + max one CTA per page",
    className: "bg-gold",
    onDark: false,
  },
  {
    name: "paper",
    hex: "#FFFFFF",
    use: "Base background",
    className: "bg-paper",
    onDark: false,
  },
  {
    name: "mist",
    hex: "#F4F6F8",
    use: "Alternating section background",
    className: "bg-mist",
    onDark: false,
  },
  {
    name: "slate",
    hex: "#5A6B7B",
    use: "Secondary text, captions, metadata",
    className: "bg-slate",
    onDark: true,
  },
  {
    name: "evidence-tint",
    hex: "#E8F2EF",
    use: "Card hovers, tag backgrounds",
    className: "bg-evidence-tint",
    onDark: false,
  },
  {
    name: "hairline",
    hex: "#E3E8ED",
    use: "Card borders",
    className: "bg-hairline",
    onDark: false,
  },
];

const categoryTags = [
  { name: "Blue", text: "text-tag-blue", bg: "bg-tag-blue-tint" },
  { name: "Orange", text: "text-tag-orange", bg: "bg-tag-orange-tint" },
  { name: "Yellow", text: "text-tag-yellow", bg: "bg-tag-yellow-tint" },
  { name: "Green", text: "text-tag-green", bg: "bg-tag-green-tint" },
];

const spacingScale = [
  { name: "gap / card padding", value: "24px", width: "w-6" },
  { name: "section (mobile)", value: "56px", width: "w-14" },
  { name: "section (desktop)", value: "96px", width: "w-24" },
];

function Row({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-hairline border-t py-12">
      <h2 className="text-eyebrow-style text-evidence mb-6">{title}</h2>
      {children}
    </section>
  );
}

export default function StyleguidePage() {
  return (
    <main className="mx-auto max-w-[var(--container-content)] px-6 py-16">
      <header className="mb-4">
        <p className="text-eyebrow-style text-slate">Internal</p>
        <h1 className="font-display text-ink mt-2 text-[length:var(--text-hero-mobile)] leading-[1.1] font-[650] md:text-[length:var(--text-hero)] md:leading-[1.05]">
          SRN Styleguide
        </h1>
        <p className="text-slate prose-measure mt-4">
          Every visual decision, made once. Design.md §3–§4. Brand hexes are
          marked <strong className="text-ink">[PLACEHOLDER]</strong> until the
          logo vector arrives and Sprint 1.1 samples the exact values.
        </p>
      </header>

      <Row title="Palette — §3.1">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {palette.map((c) => (
            <div
              key={c.name}
              className="border-hairline overflow-hidden rounded-[var(--radius-card)] border"
            >
              <div
                className={`${c.className} flex h-24 items-end p-3 ${
                  c.onDark ? "text-paper" : "text-ink"
                }`}
              >
                <span className="text-small font-mono">{c.hex}</span>
              </div>
              <div className="p-4">
                <p className="text-ink font-semibold">--{c.name}</p>
                <p className="text-slate text-small mt-1">{c.use}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-slate text-small prose-measure mt-6">
          The four mark colors appear together only in the logo itself, plus one
          sanctioned echo below: category tag hues.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          {categoryTags.map((t) => (
            <span
              key={t.name}
              className={`${t.bg} ${t.text} text-small rounded-full px-3 py-1 font-medium`}
            >
              {t.name} category
            </span>
          ))}
        </div>
      </Row>

      <Row title="Typography — §3.2">
        <div className="space-y-8">
          <div>
            <p className="text-slate text-small mb-2">
              Fraunces 650 · hero · 56→36px
            </p>
            <p className="font-display text-ink text-[length:var(--text-hero-mobile)] leading-[1.1] font-[650] md:text-[length:var(--text-hero)] md:leading-[1.05]">
              Better evidence. Smarter decisions.
            </p>
          </div>
          <div>
            <p className="text-slate text-small mb-2">
              Fraunces 600 · h2 · 36→28px
            </p>
            <p className="font-display text-ink text-[length:var(--text-h2-mobile)] leading-[1.2] font-[600] md:text-[length:var(--text-h2)] md:leading-[1.15]">
              What we do
            </p>
          </div>
          <div>
            <p className="text-slate text-small mb-2">
              Inter 600 · h3 · 24→20px
            </p>
            <p className="text-ink text-[length:var(--text-h3-mobile)] leading-[1.3] font-semibold md:text-[length:var(--text-h3)] md:leading-[1.25]">
              Beginner Academy
            </p>
          </div>
          <div>
            <p className="text-slate text-small mb-2">
              Inter 400 · body · 17→16px · capped at 68ch
            </p>
            <p className="text-ink prose-measure">
              The Systematic Reviews Network builds capacity in evidence
              synthesis across Africa and beyond, training researchers to
              produce reviews that stand up to international scrutiny and inform
              real decisions.
            </p>
          </div>
          <div>
            <p className="text-slate text-small mb-2">
              Inter 600 · eyebrow · 13px · +0.08em · uppercase
            </p>
            <p className="text-eyebrow-style text-evidence">
              Systematic Reviews Network
            </p>
          </div>
          <div>
            <p className="text-slate text-small mb-2">
              Fraunces 650 · impact number · gold
            </p>
            <p className="font-display text-gold text-[3rem] leading-none font-[650]">
              19,500
            </p>
          </div>
        </div>
      </Row>

      <Row title="Spacing — §3.3">
        <div className="space-y-4">
          {spacingScale.map((s) => (
            <div key={s.name} className="flex items-center gap-4">
              <div className={`${s.width} bg-evidence h-8 rounded`} />
              <span className="text-ink text-small font-medium">{s.value}</span>
              <span className="text-slate text-small">{s.name}</span>
            </div>
          ))}
        </div>
        <p className="text-slate text-small mt-6">
          Max content width 1200px · prose column 720px · grid gap 24px.
        </p>
      </Row>

      <Row title="Buttons — §4">
        <div className="space-y-8">
          <div>
            <p className="text-slate text-small mb-3">
              Default · hover · focus-visible (tab to it) · disabled
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Button variant="primary">Explore programmes</Button>
              <Button variant="secondary">Partner with SRN</Button>
              <Button variant="gold">Request training</Button>
              <Button variant="primary" disabled>
                Registration closed
              </Button>
            </div>
          </div>
          <div>
            <p className="text-slate text-small mb-3">Large · with icons</p>
            <div className="flex flex-wrap items-center gap-4">
              <Button variant="primary" size="lg">
                Register for this event
                <Icon icon={ArrowRight} size="sm" />
              </Button>
              <Button variant="secondary" size="lg">
                <Icon icon={Download} size="sm" />
                Download the guide
              </Button>
            </div>
          </div>
        </div>
      </Row>

      <Row title="Icons — §1">
        <p className="text-slate text-small mb-4">
          Lucide only, 1.5px stroke, brand colors only, via the Icon wrapper.
        </p>
        <div className="flex flex-wrap items-center gap-6">
          <Icon icon={Search} size="sm" color="ink" />
          <Icon icon={Search} size="md" color="evidence" />
          <Icon icon={Search} size="lg" color="brand" />
          <Icon icon={Search} size="xl" color="slate" />
        </div>
      </Row>

      <Row title="Photo overlay — §3.3">
        <p className="text-slate text-small mb-4">
          Navy multiply overlay at 62% so white text stays legible on real
          photos, and mixed-quality sources unify. Placeholder block below — §7
          forbids stock stand-ins.
        </p>
        <div className="photo-overlay bg-slate relative flex h-56 items-center justify-center overflow-hidden rounded-[var(--radius-card)]">
          <span className="text-paper font-display relative z-10 text-[length:var(--text-h2-mobile)] font-[600]">
            White text on photo
          </span>
          <span className="text-paper/70 text-small absolute bottom-3 left-4 z-10">
            [PLACEHOLDER] 2400×800
          </span>
        </div>
      </Row>
    </main>
  );
}
