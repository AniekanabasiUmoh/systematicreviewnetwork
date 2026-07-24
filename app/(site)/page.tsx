import { ButtonLink } from "@/components/ui/Button";

/* Sprint 1.2 placeholder. The real homepage is Sprint 2.1 — all 13 sections in
   Design.md §5 order. Kept deliberately bare so no scaffold boilerplate ships.

   No <main> here: the (site) layout already provides it. */

export default function Home() {
  return (
    <div className="mx-auto flex max-w-[var(--container-prose)] flex-col justify-center px-6 py-24">
      <p className="text-eyebrow-style text-evidence">
        Systematic Reviews Network
      </p>
      <h1 className="text-display-tight text-ink mt-3 text-[length:var(--text-hero-mobile)] leading-[1.1] md:text-[length:var(--text-hero)] md:leading-[1.05]">
        Better evidence. Smarter decisions.
      </h1>
      <p className="text-slate prose-measure mt-5">
        <strong className="text-ink">[PLACEHOLDER]</strong> The shell is
        complete. The homepage is built in Sprint 2.1.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink href="/styleguide/components" variant="secondary">
          View the component kit
        </ButtonLink>
        <ButtonLink href="/styleguide" variant="secondary">
          Palette and type
        </ButtonLink>
      </div>
    </div>
  );
}
