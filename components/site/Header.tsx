"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Icon } from "@/components/ui/Icon";

/* §1.2 — Header. Logo left, nav right, "Partner with SRN" as the single
   highlighted item. Sticky, white, hairline bottom border once scrolled.
   Mobile: full-screen sheet, focus-trapped, closes on route change. */

const NAV = [
  { href: "/about", label: "About" },
  { href: "/programmes", label: "Programmes" },
  { href: "/resources", label: "Resources" },
  { href: "/impact", label: "Impact" },
  { href: "/team", label: "Team" },
  { href: "/news", label: "News & Events" },
  { href: "/contact", label: "Contact" },
];

const HIGHLIGHT = { href: "/partner", label: "Partner with SRN" };

/* Routes still to be built (Sprints 2.2–2.7). Next prefetches every visible
   <Link> on load, so linking to a route that does not exist yet fires a 404 per
   item and fills the console. Prefetch is disabled for these until the pages
   land; delete this set as each sprint completes. */
const NOT_BUILT_YET = new Set([
  "/programmes",
  "/resources",
  "/impact",
  "/news",
  "/contact",
  "/partner",
]);

const prefetchFor = (href: string) =>
  NOT_BUILT_YET.has(href) ? false : undefined;

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const sheetRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  /* The sheet is derived from "which route was it opened on?" rather than a
     plain boolean synced by an effect. Navigating changes `pathname`, which
     closes the sheet during render — no effect, no flash of the old state. */
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const open = openedAt === pathname;
  const setOpen = (next: boolean) => setOpenedAt(next ? pathname : null);

  /* Hairline border appears only once the page has moved, so the header sits
     flush with the hero at rest. */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Focus trap + scroll lock while the sheet is open. Escape closes it and
     returns focus to the trigger, which is what a keyboard user expects. */
  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    const focusables = () =>
      Array.from(
        sheetRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );

    focusables()[0]?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        /* setOpenedAt directly rather than the setOpen wrapper: the wrapper is
           recreated every render, so it cannot be a stable effect dependency. */
        setOpenedAt(null);
        triggerRef.current?.focus();
        return;
      }
      if (e.key !== "Tab") return;

      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header
      className={`bg-paper sticky top-0 z-50 transition-shadow ${
        scrolled ? "border-hairline border-b" : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[var(--container-content)] items-center justify-between gap-6 px-6 md:h-20">
        {/* Wordmark. Replaced with the logo vector once Fortune sends it (§12.1). */}
        <Link
          href="/"
          className="text-display-tight text-brand shrink-0 text-[1.375rem] tracking-[-0.02em]"
        >
          {/* The accessible name must contain the visible text ("SRN"), so the
              expansion is visually-hidden text rather than an aria-label that
              replaces it — otherwise voice-control users saying "click SRN"
              cannot match the element. */}
          SRN
          <span className="sr-only"> — Systematic Reviews Network, home</span>
        </Link>

        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-7">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  prefetch={prefetchFor(item.href)}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={`text-small font-medium transition-colors ${
                    isActive(item.href)
                      ? "text-evidence"
                      : "text-ink hover:text-evidence"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href={HIGHLIGHT.href}
            prefetch={prefetchFor(HIGHLIGHT.href)}
            className="bg-evidence text-paper hover:bg-evidence-ink text-small hidden px-4 py-2 font-semibold transition-colors lg:inline-flex"
          >
            {HIGHLIGHT.label}
          </Link>

          <button
            ref={triggerRef}
            type="button"
            onClick={() => setOpen(true)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            className="text-ink hover:text-evidence -mr-2 inline-flex h-11 w-11 items-center justify-center rounded-lg lg:hidden"
          >
            <Icon icon={Menu} size="lg" label="Open menu" />
          </button>
        </div>
      </div>

      {/* Full-screen sheet. Rendered only when open so nothing is focusable
          behind the scenes on desktop. */}
      {open ? (
        <div
          id="mobile-menu"
          ref={sheetRef}
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
          className="bg-paper fixed inset-0 z-50 flex flex-col lg:hidden"
        >
          <div className="flex h-16 items-center justify-between px-6">
            <span className="text-display-tight text-brand text-[1.375rem]">
              SRN
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-ink hover:text-evidence -mr-2 inline-flex h-11 w-11 items-center justify-center rounded-lg"
            >
              <Icon icon={X} size="lg" label="Close menu" />
            </button>
          </div>

          <nav
            aria-label="Main"
            className="flex-1 overflow-y-auto px-6 pt-4 pb-8"
          >
            <ul className="space-y-1">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    className={`block rounded-lg py-3 text-[1.125rem] font-medium ${
                      isActive(item.href) ? "text-evidence" : "text-ink"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href={HIGHLIGHT.href}
              prefetch={prefetchFor(HIGHLIGHT.href)}
              className="bg-evidence text-paper mt-6 flex items-center justify-center px-5 py-3 font-semibold"
            >
              {HIGHLIGHT.label}
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
