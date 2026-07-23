import { ButtonLink } from "@/components/ui/Button";

/* Sprint 0.1 placeholder. The real homepage is Sprint 2.1 — all 13 sections in
   Design.md §5 order. Kept deliberately bare so no scaffold boilerplate ships. */

export default function Home() {
  return (
    <main className="mx-auto flex max-w-[var(--container-prose)] flex-1 flex-col justify-center px-6 py-24">
      <p className="text-eyebrow-style text-evidence">
        Systematic Reviews Network
      </p>
      <h1 className="font-display text-ink mt-3 text-[length:var(--text-hero-mobile)] leading-[1.1] font-[650] md:text-[length:var(--text-hero)] md:leading-[1.05]">
        Better evidence. Smarter decisions.
      </h1>
      <p className="text-slate prose-measure mt-5">
        <strong className="text-ink">[PLACEHOLDER]</strong> This is the Sprint
        0.1 foundation. The homepage is built in Sprint 2.1.
      </p>
      <div className="mt-8">
        <ButtonLink href="/styleguide" variant="secondary">
          View the styleguide
        </ButtonLink>
      </div>
    </main>
  );
}
