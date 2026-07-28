import Image from "next/image";
import { Container } from "./Section";
import { Eyebrow } from "./SectionHeader";

/* Interior-page header. Two modes:
   - plain ink band (default) — a calm dark header for text-led pages;
   - photo-backed (pass `imageUrl`) — a shorter cousin of the homepage hero,
     with the same layered ink scrim so a headline reads over any photo.
   The heading is always the page's single <h1>. */

export function PageHeader({
  eyebrow,
  title,
  lede,
  imageUrl,
  imageAlt = "",
  compact = false,
}: {
  eyebrow?: string;
  title: string;
  lede?: string;
  imageUrl?: string | null;
  imageAlt?: string;
  /* Sprint 6.9 — for pages a learner RETURNS to rather than arrives at.
     The full header is right for a marketing page seen once; on the course
     player it pushed the actual course below the fold every single visit. */
  compact?: boolean;
}) {
  return (
    <header className="relative overflow-hidden bg-ink">
      {imageUrl ? (
        <>
          <Image
            src={imageUrl}
            alt={imageAlt}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, rgba(22,24,43,0.92) 0%, rgba(22,24,43,0.6) 60%, rgba(22,24,43,0.4) 100%)",
            }}
          />
        </>
      ) : null}
      <Container
        className={`relative ${compact ? "py-10 md:py-14" : "py-20 md:py-28"}`}
      >
        <div className="max-w-[52ch]">
          {eyebrow ? <Eyebrow tone="paper">{eyebrow}</Eyebrow> : null}
          <h1
            className={`text-display-tight text-paper mt-4 leading-[1.02] ${
              compact
                ? "text-[clamp(1.75rem,3.5vw,2.5rem)]"
                : "text-[clamp(2.2rem,5vw,3.5rem)]"
            }`}
          >
            {title}
          </h1>
          {lede ? (
            <p className="text-paper/85 mt-5 max-w-[46ch] text-[1.15rem] leading-relaxed">
              {lede}
            </p>
          ) : null}
        </div>
      </Container>
    </header>
  );
}
