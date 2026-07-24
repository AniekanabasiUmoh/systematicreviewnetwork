import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

/* §1.2 — public site chrome. The admin at /admin gets its own layout, so it
   never inherits the public header and footer. */

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* §3.5 — keyboard users should not have to tab the whole nav on every
          page. Visually hidden until focused. */}
      <a
        href="#main"
        className="bg-evidence text-paper focus:text-small sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[100] focus:rounded-lg focus:px-4 focus:py-2 focus:font-semibold"
      >
        Skip to content
      </a>
      <Header />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
    </>
  );
}
