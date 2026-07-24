import Link from "next/link";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { ButtonLink } from "@/components/ui/Button";

/* §1.2 — 404 in the §4 voice: say what happened, then offer the way out.
   No apology, no "Oops!", no cartoon. Lives at the app root rather than inside
   (site) because Next serves it for unmatched routes across the whole app. */

export default function NotFound() {
  return (
    <>
      <Header />
      <main
        id="main"
        className="mx-auto flex w-full max-w-[var(--container-prose)] flex-1 flex-col justify-center px-6 py-24"
      >
        <p className="text-eyebrow-style text-evidence">404</p>
        <h1 className="text-display-tight text-ink mt-3 text-[2.25rem] leading-[1.1] md:text-[3rem]">
          This page doesn&apos;t exist.
        </h1>
        <p className="text-slate prose-measure mt-4">
          The link may be out of date, or the address may have a typo. Try the
          homepage, or search the resource library.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/">Go to the homepage</ButtonLink>
          <ButtonLink href="/resources" variant="secondary">
            Browse resources
          </ButtonLink>
        </div>
        <p className="text-slate text-small mt-10">
          Think something is broken?{" "}
          <Link href="/contact" className="text-evidence font-medium underline">
            Tell us
          </Link>
          .
        </p>
      </main>
      <Footer />
    </>
  );
}
