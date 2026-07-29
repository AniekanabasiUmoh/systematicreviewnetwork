import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  Calendar,
  MapPin,
  Users,
  Tag as TagIcon,
  Wallet,
  PlayCircle,
} from "lucide-react";

import { Section, Container, Prose } from "@/components/ui/Section";
import { PageHeader } from "@/components/ui/PageHeader";
import { RichText, richTextIsEmpty } from "@/components/ui/RichText";
import { Tag, StatusBadge, eventTypeHue } from "@/components/ui/Tag";
import { CTABand } from "@/components/ui/Cards";
import { Icon } from "@/components/ui/Icon";
import { RegistrationForm } from "@/components/site/RegistrationForm";
import { EventQuestions } from "@/components/site/EventQuestions";
import { getEventQuestions } from "@/lib/events/questions-server";
import type { EventQuestion } from "@/lib/events/questions";
import { getAllEvents, getEventBySlug, getSeatCounts } from "@/lib/queries";
import {
  registrationState,
  registrationLabel,
  formatEventDate,
  formatPrice,
  isFree,
  type RegistrationState,
} from "@/lib/events";

/* Sprint 2.6 — event detail. The page hinges on the §2.6 registration state
   machine: open, not_yet_open, closed, full, past. The state is computed once
   (server-side, against request time and confirmed seat counts) and drives the
   action panel. The registration form itself lands in Phase 4; every other
   state renders fully now — a past event shows its recording link when one
   exists, and nothing else pretends to be actionable. */

export const revalidate = 60;

export async function generateStaticParams() {
  const events = await getAllEvents();
  return events.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) return { title: "Event" };
  return {
    title: event.title,
    description: `${formatEventDate(event.starts_at, event.ends_at)} · ${
      event.location_type === "online" ? "Online" : "In person"
    }`,
  };
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const questions = await getEventQuestions(event.id);
  const now = new Date();
  const seatCounts = await getSeatCounts([event.id]);
  const seatsTaken = seatCounts[event.id] ?? 0;
  const state = registrationState(event, seatsTaken, now);

  const dateLabel = formatEventDate(event.starts_at, event.ends_at);
  const priceLabel = formatPrice(event.price_kobo, event.currency);
  const seatsLeft =
    event.capacity != null ? Math.max(event.capacity - seatsTaken, 0) : null;

  return (
    <>
      <PageHeader
        eyebrow="Event"
        title={event.title}
        imageUrl={event.banner_url}
        imageAlt={event.banner_url ? event.title : ""}
      />

      <Section surface="paper">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[1fr_20rem] lg:gap-16">
            {/* ── Main column ─────────────────────────────────────────── */}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Tag hue={eventTypeHue[event.type] ?? "neutral"}>
                  {event.type.replace("_", " ")}
                </Tag>
                <StatusBadge status={state} label={registrationLabel[state]} />
              </div>

              {richTextIsEmpty(event.description_rich) ? (
                <p className="text-slate mt-6 leading-relaxed">
                  Full details for this event are on the way. Check back soon,
                  or{" "}
                  <Link href="/contact" className="text-ink underline">
                    get in touch
                  </Link>{" "}
                  if you have a question.
                </p>
              ) : (
                <Prose className="mt-6">
                  <RichText body={event.description_rich} />
                </Prose>
              )}
            </div>

            {/* ── Detail / action rail ────────────────────────────────── */}
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="border-hairline border">
                <dl className="divide-hairline divide-y">
                  <DetailRow icon={Calendar} label="When" value={dateLabel} />
                  <DetailRow
                    icon={MapPin}
                    label={event.location_type === "online" ? "Online" : "Where"}
                    value={
                      event.location_or_link ??
                      (event.location_type === "online"
                        ? "Delivered online"
                        : "In person")
                    }
                    plain
                  />
                  <DetailRow icon={Wallet} label="Cost" value={priceLabel} />
                  {event.capacity != null ? (
                    <DetailRow
                      icon={Users}
                      label="Places"
                      value={
                        state === "past"
                          ? `${event.capacity} places`
                          : `${seatsLeft} of ${event.capacity} left`
                      }
                    />
                  ) : null}
                  <DetailRow
                    icon={TagIcon}
                    label="Format"
                    value={event.type.replace("_", " ")}
                  />
                </dl>

                <div className="border-hairline border-t p-5">
                  <RegistrationPanel state={state} event={event} questions={questions} />
                </div>
              </div>
            </aside>
          </div>
        </Container>
      </Section>

      <Section surface="mist">
        <Container>
          <p className="mb-10">
            <Link
              href="/news"
              className="text-ink hover:text-evidence inline-flex items-center gap-1.5 font-semibold"
            >
              <Icon icon={ArrowRight} size="sm" className="rotate-180" />
              All news &amp; events
            </Link>
          </p>
          <CTABand
            heading="Build the skill, not just attend the session."
            body="Our courses and mentorship are designed so you leave able to run a review on your own — again and again."
            buttonLabel="Explore programmes"
            buttonHref="/programmes"
          />
        </Container>
      </Section>
    </>
  );
}

function DetailRow({
  icon,
  label,
  value,
  plain = false,
}: {
  icon: typeof Calendar;
  label: string;
  value: string;
  /** `plain` leaves the value as-is; otherwise short single-word values
      (event type, format) are capitalised. Sentence values pass `plain`. */
  plain?: boolean;
}) {
  return (
    <div className="flex gap-3 p-5">
      <Icon icon={icon} size="sm" className="text-slate mt-0.5 shrink-0" />
      <div className="min-w-0">
        <dt className="text-slate text-[0.75rem] font-semibold tracking-[0.04em] uppercase">
          {label}
        </dt>
        <dd
          className={`text-ink mt-1 text-small leading-snug ${plain ? "" : "capitalize"}`}
        >
          {value}
        </dd>
      </div>
    </div>
  );
}

/* The one place the state machine becomes UI. Each branch states plainly what
   the visitor can do right now — never an apology, never a dead button (§4). */
function RegistrationPanel({
  state,
  event,
  questions,
}: {
  state: RegistrationState;
  event: Awaited<ReturnType<typeof getEventBySlug>>;
  questions: EventQuestion[];
}) {
  if (!event) return null;

  if (state === "open") {
    const free = isFree(event.price_kobo);
    return (
      <div>
        <p className="text-ink font-semibold">
          {free ? "Register — it's free" : "Register for this event"}
        </p>
        <p className="text-slate text-small mt-2 mb-4 leading-relaxed">
          {free
            ? "This event is free to attend. Fill in your details and we'll send your confirmation."
            : `A place costs ${formatPrice(event.price_kobo, event.currency)}. You'll be taken to secure payment; your place is held once payment completes.`}
        </p>
        <RegistrationForm
          eventId={event.id}
          paid={!free}
          questions={<EventQuestions questions={questions} />}
        />
      </div>
    );
  }

  if (state === "not_yet_open") {
    const opens = event.registration_opens
      ? formatEventDate(event.registration_opens)
      : null;
    return (
      <div>
        <p className="text-ink font-semibold">Registration opens soon</p>
        <p className="text-slate text-small mt-2 leading-relaxed">
          {opens
            ? `Places open on ${opens}. `
            : "Registration for this event isn't open yet. "}
          Join the newsletter and we&apos;ll tell you the moment it does.
        </p>
      </div>
    );
  }

  if (state === "full") {
    return (
      <div>
        <p className="text-ink font-semibold">This event is fully booked</p>
        <p className="text-slate text-small mt-2 leading-relaxed">
          Every place has been taken. Contact us to join the waiting list — if a
          place frees up, we&apos;ll offer it in order.
        </p>
        <Link
          href="/contact"
          className="border-ink text-ink hover:bg-ink hover:text-paper mt-4 inline-flex w-full items-center justify-center gap-2 border px-5 py-3 font-semibold transition-colors"
        >
          Join the waiting list
        </Link>
      </div>
    );
  }

  if (state === "closed") {
    return (
      <div>
        <p className="text-ink font-semibold">Registration is closed</p>
        <p className="text-slate text-small mt-2 leading-relaxed">
          Registration for this event has closed. Explore our programmes to find
          the next course or intake you can join.
        </p>
        <Link
          href="/programmes"
          className="border-ink text-ink hover:bg-ink hover:text-paper mt-4 inline-flex w-full items-center justify-center gap-2 border px-5 py-3 font-semibold transition-colors"
        >
          See what&apos;s next
        </Link>
      </div>
    );
  }

  /* past */
  return (
    <div>
      <p className="text-ink font-semibold">This event has passed</p>
      {event.recording_url ? (
        <>
          <p className="text-slate text-small mt-2 leading-relaxed">
            You can still watch the recording.
          </p>
          <a
            href={event.recording_url}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-evidence text-paper hover:bg-evidence-ink mt-4 inline-flex w-full items-center justify-center gap-2 px-5 py-3 font-semibold transition-colors"
          >
            <Icon icon={PlayCircle} size="sm" />
            Watch the recording
          </a>
        </>
      ) : (
        <p className="text-slate text-small mt-2 leading-relaxed">
          It ran on {formatEventDate(event.starts_at, event.ends_at)}. Browse
          upcoming events to find the next one.
        </p>
      )}
    </div>
  );
}
