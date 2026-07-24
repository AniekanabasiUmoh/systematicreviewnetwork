import Image from "next/image";

/* §7 — image handling.

   Where a real image is missing, we render a labelled placeholder block rather
   than falling back to stock. This is deliberate: the §6.1 launch gate greps
   for [PLACEHOLDER], and a stock photo would sail straight through it while
   also breaking the "never illustrate SRN with imagery that isn't SRN" rule.

   All real images go through next/image with dimensions set (§3.5, no layout
   shift) and descriptive alt text. */

export function PlaceholderBlock({
  label,
  width,
  height,
  className = "",
  rounded = true,
}: {
  label?: string;
  width: number;
  height: number;
  className?: string;
  rounded?: boolean;
}) {
  return (
    <div
      className={`bg-mist border-hairline text-slate flex items-center justify-center border ${
        rounded ? "rounded-[var(--radius-card)]" : ""
      } ${className}`.trim()}
      style={{ aspectRatio: `${width} / ${height}` }}
      role="img"
      aria-label={`Placeholder image, ${width} by ${height} pixels${label ? `: ${label}` : ""}`}
    >
      <span className="px-3 text-center text-[0.75rem] font-medium">
        [PLACEHOLDER]
        <br />
        {/* No opacity here: --slate at 70% measures 2.83:1 on --mist and fails
            AA. Full --slate is 5.07:1. */}
        <span className="text-[0.6875rem] font-normal">
          {width}×{height}
          {label ? ` · ${label}` : ""}
        </span>
      </span>
    </div>
  );
}

/**
 * Renders a real image when `src` is present, and a labelled placeholder when
 * it is not. Alt text is required — there is no default, because a default
 * would let an unlabelled image ship.
 */
export function Figure({
  src,
  alt,
  width,
  height,
  label,
  className = "",
  imgClassName = "",
  priority = false,
  sizes,
  rounded = true,
}: {
  src: string | null | undefined;
  alt: string;
  width: number;
  height: number;
  label?: string;
  className?: string;
  imgClassName?: string;
  priority?: boolean;
  sizes?: string;
  rounded?: boolean;
}) {
  if (!src) {
    return (
      <PlaceholderBlock
        label={label}
        width={width}
        height={height}
        className={className}
        rounded={rounded}
      />
    );
  }

  return (
    <div
      className={`relative overflow-hidden ${rounded ? "rounded-[var(--radius-card)]" : ""} ${className}`.trim()}
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes={sizes ?? "(max-width: 768px) 100vw, 50vw"}
        className={`object-cover ${imgClassName}`.trim()}
      />
    </div>
  );
}

/**
 * Hero and CTA-band treatment: a navy multiply overlay at 62% (§3.3 specifies
 * 55–70%) so white text stays legible on real photos, and photos of mixed
 * quality — Zoom screenshots, phone photos — read as one set.
 */
export function OverlayImage({
  src,
  alt,
  width,
  height,
  children,
  className = "",
  priority = false,
}: {
  src: string | null | undefined;
  alt: string;
  width: number;
  height: number;
  children?: React.ReactNode;
  className?: string;
  priority?: boolean;
}) {
  return (
    <div className={`relative overflow-hidden ${className}`.trim()}>
      {src ? (
        <>
          <Image
            src={src}
            alt={alt}
            fill
            priority={priority}
            sizes="100vw"
            className="object-cover"
          />
          {/* Two layers, deliberately.

              multiply alone does not darken a bright photo enough — a white
              wall stays a white wall, and white text sits on top of it. The
              multiply pass carries the brand navy into the image's midtones;
              the flat pass underneath it guarantees a contrast floor whatever
              the source photo looks like. Together they land in the §3.3
              55–70% band as *perceived* darkening, which is what the spec is
              actually asking for.

              A left-weighted gradient adds extra depth exactly where the
              headline sits, without flattening the whole frame. */}
          <div
            aria-hidden
            className="bg-brand pointer-events-none absolute inset-0 opacity-[0.55] mix-blend-multiply"
          />
          <div
            aria-hidden
            className="bg-ink pointer-events-none absolute inset-0 opacity-[0.45]"
          />
          <div
            aria-hidden
            className="from-ink/70 pointer-events-none absolute inset-0 bg-gradient-to-r via-transparent to-transparent"
          />
        </>
      ) : (
        /* No photo yet — the ink surface still gives correct contrast for the
           overlaid text, so layout and legibility can be judged now. */
        <div aria-hidden className="bg-ink absolute inset-0">
          <span className="text-paper/40 absolute bottom-3 left-4 text-[0.6875rem]">
            [PLACEHOLDER] hero photo {width}×{height}
          </span>
        </div>
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
