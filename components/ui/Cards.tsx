import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Download, ExternalLink, Link2 } from "lucide-react";
import { Icon } from "./Icon";
import { Figure } from "./Media";
import { Tag, StatusBadge, eventTypeHue, resourceCategoryHue } from "./Tag";
import {
  dateBlock,
  formatEventDate,
  formatPrice,
  isFree,
  registrationLabel,
  type RegistrationState,
} from "@/lib/events";

/* §4 — the card kit. §3.3: white, 1px hairline border, 12px radius, subtle
   shadow on hover only, 24px padding. No glassmorphism, no gradient borders.
   Cards lift 2px on hover; reduced motion disables it globally. */

const card =
  "border-hairline bg-paper rounded-[var(--radius-card)] border p-6 " +
  "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-12px_rgba(25,28,69,0.25)]";

/* ── EventCard ─────────────────────────────────────────────────────────── */

export function EventCard({
  href,
  title,
  type,
  starts_at,
  ends_at,
  locationType,
  state,
  price_kobo,
  currency = "NGN",
  capacity,
  seatsTaken,
}: {
  href: string;
  title: string;
  type: string;
  starts_at: string;
  ends_at?: string | null;
  locationType: "online" | "in_person";
  state: RegistrationState;
  price_kobo?: number | null;
  currency?: "NGN" | "USD";
  capacity?: number | null;
  seatsTaken?: number;
}) {
  const { day, month } = dateBlock(starts_at);
  const free = isFree(price_kobo ?? null);

  return (
    <article className={`${card} flex gap-5`}>
      {/* Date block */}
      <div
        className="bg-mist text-ink flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-lg"
        aria-hidden
      >
        <span className="text-display-tight text-[1.375rem] leading-none">
          {day}
        </span>
        <span className="text-slate mt-1 text-[0.6875rem] font-semibold tracking-[0.06em]">
          {month}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Tag hue={eventTypeHue[type] ?? "neutral"}>
            {type.replace("_", " ")}
          </Tag>
          <StatusBadge status={state} label={registrationLabel[state]} />
        </div>

        <h3 className="text-ink mt-3 text-[1.0625rem] leading-snug font-semibold">
          <Link
            href={href}
            className="hover:text-evidence after:absolute after:inset-0 focus-visible:outline-none"
          >
            {title}
          </Link>
        </h3>

        <p className="text-slate text-small mt-2">
          <time dateTime={starts_at}>
            {formatEventDate(starts_at, ends_at)}
          </time>
          {" · "}
          {locationType === "online" ? "Online" : "In person"}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
          <span
            className={`text-small font-semibold ${free ? "text-evidence" : "text-ink"}`}
          >
            {formatPrice(price_kobo ?? null, currency)}
          </span>
          {capacity != null && seatsTaken != null && state !== "past" ? (
            <span className="text-slate text-small">
              {Math.max(capacity - seatsTaken, 0)} of {capacity} places left
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}

/* ── ProgrammeCard ─────────────────────────────────────────────────────── */

export function ProgrammeCard({
  href,
  icon,
  title,
  blurb,
  audience,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  blurb: string;
  audience?: string;
}) {
  return (
    <article className={`${card} relative flex flex-col`}>
      <span className="bg-evidence-tint flex h-11 w-11 items-center justify-center rounded-lg">
        <Icon icon={icon} size="lg" color="evidence" />
      </span>
      <h3 className="text-ink mt-4 text-[1.25rem] leading-snug font-semibold">
        {/* prefetch disabled: programme subpages land in Sprint 2.3, and
            prefetching a route that does not exist yet fires a 404. */}
        <Link
          href={href}
          prefetch={false}
          className="hover:text-evidence after:absolute after:inset-0"
        >
          {title}
        </Link>
      </h3>
      <p className="text-slate text-small mt-2 flex-1 leading-relaxed">
        {blurb}
      </p>
      {audience ? (
        <p className="text-evidence mt-4 text-[0.8125rem] font-semibold">
          {audience}
        </p>
      ) : null}
    </article>
  );
}

/* ── PersonCard ────────────────────────────────────────────────────────── */

export function PersonCard({
  name,
  role,
  affiliation,
  photoUrl,
  linkedinUrl,
  orcidUrl,
}: {
  name: string;
  role?: string | null;
  affiliation?: string | null;
  photoUrl?: string | null;
  linkedinUrl?: string | null;
  orcidUrl?: string | null;
}) {
  return (
    <article className="group">
      {/* §2.2 — greyscale, returning to colour on hover, so headshots taken in
          wildly different conditions still read as one set. */}
      <Figure
        src={photoUrl}
        alt={photoUrl ? `${name}` : ""}
        width={800}
        height={800}
        label="headshot"
        className="w-full"
        imgClassName="grayscale transition-all duration-300 group-hover:grayscale-0"
        sizes="(max-width: 640px) 50vw, 25vw"
      />
      <h3 className="text-ink mt-4 text-[1.0625rem] font-semibold">{name}</h3>
      {role ? (
        <p className="text-evidence text-small mt-1 font-medium">{role}</p>
      ) : null}
      {affiliation ? (
        <p className="text-slate text-small mt-1">{affiliation}</p>
      ) : null}
      {(linkedinUrl || orcidUrl) && (
        <div className="mt-3 flex gap-3">
          {linkedinUrl ? (
            <a
              href={linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate hover:text-evidence text-[0.8125rem] font-medium"
            >
              LinkedIn
            </a>
          ) : null}
          {orcidUrl ? (
            <a
              href={orcidUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate hover:text-evidence text-[0.8125rem] font-medium"
            >
              ORCID
            </a>
          ) : null}
        </div>
      )}
    </article>
  );
}

/* ── ResourceCard ──────────────────────────────────────────────────────── */

export function ResourceCard({
  title,
  description,
  category,
  href,
  kind = "article",
}: {
  title: string;
  description?: string | null;
  category: string;
  href: string;
  kind?: "article" | "download" | "external";
}) {
  const external = kind === "external";
  const meta = {
    article: { icon: Link2, label: "Read the guide" },
    download: { icon: Download, label: "Download" },
    external: { icon: ExternalLink, label: "View resource" },
  }[kind];

  return (
    <article className={`${card} relative flex flex-col`}>
      <Tag hue={resourceCategoryHue[category] ?? "neutral"}>{category}</Tag>
      <h3 className="text-ink mt-3 text-[1.0625rem] leading-snug font-semibold">
        <a
          href={href}
          {...(external
            ? { target: "_blank", rel: "noopener noreferrer" }
            : {})}
          className="hover:text-evidence after:absolute after:inset-0"
        >
          {title}
        </a>
      </h3>
      {description ? (
        <p className="text-slate text-small mt-2 flex-1 leading-relaxed">
          {description}
        </p>
      ) : null}
      <span className="text-evidence mt-4 inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold">
        {meta.label}
        <Icon icon={meta.icon} size="sm" />
      </span>
    </article>
  );
}

/* ── TestimonialBlock ──────────────────────────────────────────────────── */

export function TestimonialBlock({
  quote,
  name,
  role,
  photoUrl,
  tone = "ink",
}: {
  quote: string;
  name: string;
  role?: string | null;
  photoUrl?: string | null;
  tone?: "ink" | "paper";
}) {
  const light = tone === "paper";
  return (
    <figure className="flex flex-col items-start gap-6 md:flex-row md:gap-8">
      <div className="w-24 shrink-0 md:w-32">
        <Figure
          src={photoUrl}
          alt={photoUrl ? name : ""}
          width={400}
          height={400}
          label="portrait"
          className="w-full"
          sizes="128px"
        />
      </div>
      <div>
        <blockquote
          className={`text-display text-[1.25rem] leading-[1.45] md:text-[1.5rem] ${
            light ? "text-paper" : "text-brand"
          }`}
        >
          &ldquo;{quote}&rdquo;
        </blockquote>
        <figcaption
          className={`mt-4 ${light ? "text-paper/70" : "text-slate"}`}
        >
          <span
            className={`font-semibold ${light ? "text-paper" : "text-ink"}`}
          >
            {name}
          </span>
          {role ? <span className="text-small"> · {role}</span> : null}
        </figcaption>
      </div>
    </figure>
  );
}

/* ── CTABand ───────────────────────────────────────────────────────────── */

export function CTABand({
  heading,
  body,
  buttonLabel,
  buttonHref,
}: {
  heading: string;
  body?: string;
  buttonLabel: string;
  buttonHref: string;
}) {
  return (
    <div className="bg-ink rounded-[var(--radius-card)] px-8 py-12 text-center md:px-16 md:py-16">
      <h2 className="text-display text-paper mx-auto max-w-[24ch] text-[1.75rem] leading-[1.2] md:text-[2.25rem] md:leading-[1.15]">
        {heading}
      </h2>
      {body ? (
        <p className="text-paper/80 mx-auto mt-4 max-w-[52ch]">{body}</p>
      ) : null}
      {/* The one gold button per page (§3.1). */}
      <Link
        href={buttonHref}
        prefetch={false}
        className="bg-gold-bright text-ink hover:bg-gold-bright/90 mt-8 inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 font-semibold transition-colors"
      >
        {buttonLabel}
        <Icon icon={ArrowRight} size="sm" />
      </Link>
    </div>
  );
}
