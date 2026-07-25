import Link from "next/link";
import { Mail } from "lucide-react";
import { Icon } from "@/components/ui/Icon";

/* Lucide v1 removed brand icons for licensing reasons, so the two social marks
   are inline SVG. Kept local rather than pulling in a second icon package for
   two glyphs. */

function LinkedInMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={16}
      height={16}
      fill="currentColor"
      aria-hidden
    >
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zm1.78 13.02H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z" />
    </svg>
  );
}

function XMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={15}
      height={15}
      fill="currentColor"
      aria-hidden
    >
      <path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.66l-5.21-6.82-5.97 6.82H1.66l7.73-8.84L1.24 2.25h6.83l4.71 6.23 5.46-6.23zm-1.16 17.52h1.83L7.08 4.13H5.11l11.97 15.64z" />
    </svg>
  );
}

/* §1.2 — Footer on --brand: contact block, nav links, socials, policies, and
   the newsletter mini-form. The form is deliberately disabled here: it is
   wired for real in Sprint 4.3, and a form that silently does nothing is worse
   than one that says so. */

const COLUMNS = [
  {
    heading: "Explore",
    links: [
      { href: "/about", label: "About SRN" },
      { href: "/programmes", label: "Programmes" },
      { href: "/resources", label: "Resources" },
      { href: "/impact", label: "Impact" },
    ],
  },
  {
    heading: "Get involved",
    links: [
      { href: "/news", label: "News & events" },
      { href: "/team", label: "Our team" },
      { href: "/partner", label: "Partner with SRN" },
      { href: "/contact", label: "Contact us" },
    ],
  },
];

const NOT_BUILT_YET = new Set(["/contact"]);

/* See Header: prefetching routes that do not exist yet fires a 404 each.
   Remove entries as Sprints 2.2-2.7 land. */
const prefetchFor = (href: string) =>
  NOT_BUILT_YET.has(href) ? false : undefined;

const POLICIES = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/faq", label: "FAQ" },
];

export function Footer() {
  return (
    <footer className="bg-brand text-paper mt-auto">
      <div className="mx-auto max-w-[var(--container-content)] px-6 py-16">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          {/* Identity + contact */}
          <div>
            <p className="text-display-tight text-paper text-[1.5rem]">SRN</p>
            <p className="text-paper/70 text-small mt-3 max-w-[32ch] leading-relaxed">
              Building capacity for systematic reviews and meta-analyses across
              low- and middle-income countries.
            </p>
            <a
              href="mailto:info@systematicreviewsnetwork.org"
              className="text-paper/80 hover:text-paper text-small mt-4 inline-flex items-center gap-2"
            >
              <Icon icon={Mail} size="sm" />
              info@systematicreviewsnetwork.org
            </a>
            <div className="mt-4 flex gap-3">
              <a
                href="#"
                aria-label="SRN on LinkedIn"
                className="border-paper/25 text-paper/80 hover:border-paper hover:text-paper inline-flex h-9 w-9 items-center justify-center border transition-colors"
              >
                <LinkedInMark />
              </a>
              <a
                href="#"
                aria-label="SRN on X"
                className="border-paper/25 text-paper/80 hover:border-paper hover:text-paper inline-flex h-9 w-9 items-center justify-center border transition-colors"
              >
                <XMark />
              </a>
            </div>
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.heading} aria-label={col.heading}>
              <h2 className="text-eyebrow-style text-paper/60">
                {col.heading}
              </h2>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      prefetch={prefetchFor(l.href)}
                      className="text-paper/80 hover:text-paper text-small transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          {/* Newsletter — wired in Sprint 4.3. */}
          <div>
            <h2 className="text-eyebrow-style text-paper/60">Newsletter</h2>
            <p className="text-paper/70 text-small mt-4 leading-relaxed">
              Occasional updates on training, resources, and opportunities.
            </p>
            <form className="mt-4" aria-describedby="newsletter-status">
              <label htmlFor="footer-email" className="sr-only">
                Email address
              </label>
              <div className="flex gap-2">
                <input
                  id="footer-email"
                  type="email"
                  disabled
                  placeholder="you@example.com"
                  className="border-paper/25 text-paper placeholder:text-paper/40 w-full min-w-0 flex-1 border bg-transparent px-3 py-2 text-[0.8125rem] disabled:cursor-not-allowed"
                />
                <button
                  type="submit"
                  disabled
                  className="bg-paper/15 text-paper/60 text-small px-4 py-2 font-semibold disabled:cursor-not-allowed"
                >
                  Subscribe
                </button>
              </div>
              <p
                id="newsletter-status"
                className="text-paper/60 mt-2 text-[0.75rem]"
              >
                We&apos;ll email you when new training opens.
              </p>
            </form>
          </div>
        </div>

        <div className="border-paper/15 mt-14 flex flex-col gap-4 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-paper/60 text-[0.8125rem]">
            © {new Date().getFullYear()} Systematic Reviews Network. All rights
            reserved.
          </p>
          <ul className="flex gap-5">
            {POLICIES.map((p) => (
              <li key={p.href}>
                <Link
                  href={p.href}
                  prefetch={prefetchFor(p.href)}
                  className="text-paper/60 hover:text-paper text-[0.8125rem] transition-colors"
                >
                  {p.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
