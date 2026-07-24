import type { Metadata } from "next";
import Link from "next/link";

import { Section, Container } from "@/components/ui/Section";
import { PageHeader } from "@/components/ui/PageHeader";
import { Eyebrow } from "@/components/ui/SectionHeader";
import { EventCard, NewsCard, CTABand } from "@/components/ui/Cards";
import {
  getAllEvents,
  getAllNews,
  getSeatCounts,
  getMedia,
} from "@/lib/queries";
import { registrationState } from "@/lib/events";
import type { EventType } from "@/lib/database.types";

/* Sprint 2.6 — News & Events hub. Two axes of filtering, both in the URL so
   every view is shareable and the whole page reads correctly with zero JS:
   `view` (upcoming | past) and `type` (event type). The upcoming/past split is
   computed from the request time against each event's end, matching the
   registration state machine, so "past" here and "This event has passed" on the
   detail page can never disagree. */

export const revalidate = 60;

export const metadata: Metadata = {
  title: "News & Events",
  description:
    "Upcoming courses, workshops, webinars and mentorship intakes from SRN, plus news from across the network.",
};

const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: "course", label: "Courses" },
  { value: "workshop", label: "Workshops" },
  { value: "webinar", label: "Webinars" },
  { value: "mentorship", label: "Mentorship" },
];

const isEventType = (v: string | undefined): v is EventType =>
  !!v && EVENT_TYPES.some((t) => t.value === v);

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; type?: string }>;
}) {
  const { view: viewParam, type: typeParam } = await searchParams;
  const view = viewParam === "past" ? "past" : "upcoming";
  const type = isEventType(typeParam) ? typeParam : undefined;

  const [allEvents, news, headerPhoto] = await Promise.all([
    getAllEvents(),
    getAllNews(),
    getMedia("workshop-participants.jpg"),
  ]);

  const now = new Date();
  const isPast = (e: (typeof allEvents)[number]) =>
    new Date(e.ends_at ?? e.starts_at).getTime() < now.getTime();

  /* Split first, then filter by type, so the type chips only ever show types
     that exist within the current upcoming/past view. */
  const inView = allEvents.filter((e) =>
    view === "past" ? isPast(e) : !isPast(e),
  );
  const events = type ? inView.filter((e) => e.type === type) : inView;

  /* Past events are ordered soonest-first from the query; a "past" list reads
     better most-recent-first. */
  if (view === "past") events.reverse();

  /* Seat counts only matter for capacity-limited, not-yet-past events. */
  const seatCounts = await getSeatCounts(
    events.filter((e) => e.capacity != null && !isPast(e)).map((e) => e.id),
  );

  const buildHref = (nextView: string, nextType?: EventType) => {
    const params = new URLSearchParams();
    if (nextView !== "upcoming") params.set("view", nextView);
    if (nextType) params.set("type", nextType);
    const qs = params.toString();
    return qs ? `/news?${qs}` : "/news";
  };

  return (
    <>
      <PageHeader
        eyebrow="News & Events"
        title="What's on, and what's happening."
        lede="Courses, workshops, webinars and mentorship intakes you can join — and news from across the network."
        imageUrl={headerPhoto?.url}
        imageAlt={headerPhoto?.alt ?? ""}
      />

      <Section surface="paper">
        <Container>
          {/* Upcoming / past toggle. */}
          <div
            className="border-hairline inline-flex border"
            role="group"
            aria-label="Show upcoming or past events"
          >
            <Toggle href={buildHref("upcoming", type)} active={view === "upcoming"}>
              Upcoming
            </Toggle>
            <Toggle href={buildHref("past", type)} active={view === "past"}>
              Past
            </Toggle>
          </div>

          {/* Type filter — plain links, shareable, no-JS safe. */}
          <nav aria-label="Filter events by type" className="mt-4">
            <ul className="flex flex-wrap gap-2">
              <li>
                <FilterChip href={buildHref(view)} active={!type}>
                  All types
                </FilterChip>
              </li>
              {EVENT_TYPES.map((t) => (
                <li key={t.value}>
                  <FilterChip
                    href={buildHref(view, t.value)}
                    active={type === t.value}
                  >
                    {t.label}
                  </FilterChip>
                </li>
              ))}
            </ul>
          </nav>

          {events.length > 0 ? (
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {events.map((e) => (
                <EventCard
                  key={e.id}
                  href={`/news/events/${e.slug}`}
                  title={e.title}
                  type={e.type}
                  starts_at={e.starts_at}
                  ends_at={e.ends_at}
                  locationType={e.location_type}
                  state={registrationState(e, seatCounts[e.id] ?? 0, now)}
                  price_kobo={e.price_kobo}
                  currency={e.currency}
                  capacity={e.capacity}
                  seatsTaken={seatCounts[e.id] ?? 0}
                />
              ))}
            </div>
          ) : (
            <div className="border-hairline mt-10 border border-dashed p-10 text-center">
              <p className="text-ink font-semibold">
                {view === "past"
                  ? "No past events to show"
                  : "No upcoming events right now"}
              </p>
              <p className="text-slate text-small mt-1">
                {type ? (
                  <>
                    Nothing in this category.{" "}
                    <Link href={buildHref(view)} className="text-ink underline">
                      See all {view} events
                    </Link>
                    .
                  </>
                ) : view === "past" ? (
                  "Once an event wraps up it will appear here."
                ) : (
                  "Join the newsletter and we'll tell you when the next one opens."
                )}
              </p>
            </div>
          )}
        </Container>
      </Section>

      {/* Latest news. */}
      {news.length > 0 ? (
        <Section surface="mist">
          <Container>
            <Eyebrow>From the network</Eyebrow>
            <h2 className="text-display text-ink mt-3 text-[clamp(1.6rem,3.4vw,2.4rem)] leading-[1.1]">
              News &amp; announcements
            </h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {news.map((n) => (
                <NewsCard
                  key={n.id}
                  href={`/news/${n.slug}`}
                  title={n.title}
                  excerpt={n.excerpt}
                  author={n.author}
                  published_at={n.published_at}
                  featured_image_url={n.featured_image_url}
                />
              ))}
            </div>
          </Container>
        </Section>
      ) : null}

      <Section surface="paper">
        <Container>
          <CTABand
            heading="Never miss an intake."
            body="Courses and mentorship places fill quickly. Join the newsletter and be first to hear when registration opens."
            buttonLabel="Explore programmes"
            buttonHref="/programmes"
          />
        </Container>
      </Section>
    </>
  );
}

function Toggle({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`text-small px-5 py-2.5 font-semibold transition-colors ${
        active ? "bg-ink text-paper" : "text-slate hover:text-ink"
      }`}
    >
      {children}
    </Link>
  );
}

function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`text-small inline-flex items-center px-4 py-2 font-semibold transition-colors ${
        active
          ? "bg-ink text-paper"
          : "border-hairline text-slate hover:border-ink hover:text-ink border"
      }`}
    >
      {children}
    </Link>
  );
}
