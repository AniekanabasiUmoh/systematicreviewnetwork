import Link from "next/link";
import { Mail } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { NewsletterForm } from "@/components/site/NewsletterForm";

/* §1.2 — Footer on --brand: contact block, nav links, policies, and the
   newsletter mini-form. Social marks were removed in Sprint 5.5 (no verified
   SRN LinkedIn/X URL exists yet); reinstate once real handles are supplied. */

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

const NOT_BUILT_YET = new Set<string>([]);

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

          {/* Newsletter — live (§3.1 / §4.3 / §5.5). */}
          <div>
            <h2 className="text-eyebrow-style text-paper/60">Newsletter</h2>
            <p className="text-paper/70 text-small mt-4 leading-relaxed">
              Occasional updates on training, resources, and opportunities.
            </p>
            <NewsletterForm />
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
