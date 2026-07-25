import * as React from "react";
import { EmailLayout, P, Button, DetailList } from "./Layout";

/* The concrete emails. Each is a pure function of its data so it can be
 * previewed and tested without sending. Copy follows the §10 tone: confident,
 * plain, no filler. */

// ── Sprint 4.1 — event registration confirmation ──────────────────────────
export function RegistrationConfirmation(props: {
  fullName: string;
  eventTitle: string;
  whenLabel: string;
  whereLabel: string;
  paid: boolean;
  priceLabel?: string;
  eventUrl: string;
}) {
  const rows = [
    { label: "Event", value: props.eventTitle },
    { label: "When", value: props.whenLabel },
    { label: "Where", value: props.whereLabel },
  ];
  if (props.paid && props.priceLabel) {
    rows.push({ label: "Paid", value: props.priceLabel });
  }
  return (
    <EmailLayout
      preview={`You're registered for ${props.eventTitle}`}
      heading="You're registered."
    >
      <P>Hi {props.fullName},</P>
      <P>
        Your place is confirmed. Here are the details — we&apos;ve attached a
        calendar file so you can add it in one tap.
      </P>
      <DetailList rows={rows} />
      <Button href={props.eventUrl}>View event details</Button>
      <P>
        If you can no longer attend, just reply to this email and let us know so
        we can offer your place to someone else.
      </P>
      <P>See you there.</P>
    </EmailLayout>
  );
}

// ── Sprint 4.1 — payment still needed (paid event, checkout not completed) ──
export function RegistrationPaymentPending(props: {
  fullName: string;
  eventTitle: string;
  priceLabel: string;
  payUrl: string;
}) {
  return (
    <EmailLayout
      preview={`Complete your payment for ${props.eventTitle}`}
      heading="One step left — complete your payment."
    >
      <P>Hi {props.fullName},</P>
      <P>
        We&apos;ve reserved your details for <strong>{props.eventTitle}</strong>,
        but your place isn&apos;t held until payment of {props.priceLabel} is
        complete. You can finish now:
      </P>
      <Button href={props.payUrl}>Complete payment</Button>
      <P>
        This link stays valid for 30 minutes. After that, just start the
        registration again — nothing is lost.
      </P>
    </EmailLayout>
  );
}

// ── Sprint 4.2 — application received ──────────────────────────────────────
export function ApplicationConfirmation(props: {
  fullName: string;
  programme: string;
}) {
  return (
    <EmailLayout
      preview={`We've received your application to ${props.programme}`}
      heading="We've received your application."
    >
      <P>Hi {props.fullName},</P>
      <P>
        Thank you for applying to <strong>{props.programme}</strong>. Your
        application is in and our team will review it.
      </P>
      <P>
        <strong>What happens next:</strong> we read every application carefully.
        You&apos;ll hear from us with a decision — accepted, waitlisted, or not
        this time — once the review for this intake is complete. If we need
        anything else from you in the meantime, we&apos;ll be in touch.
      </P>
      <P>
        If your plans change or you have a question, simply reply to this email.
      </P>
    </EmailLayout>
  );
}

// ── Sprint 4.3 — internal notification for contact / partnership ───────────
export function InternalEnquiryNotification(props: {
  kind: "general" | "partnership";
  name: string;
  email: string;
  subject?: string | null;
  message: string;
}) {
  return (
    <EmailLayout
      preview={`New ${props.kind} enquiry from ${props.name}`}
      heading={
        props.kind === "partnership"
          ? "New partnership enquiry"
          : "New contact message"
      }
    >
      <DetailList
        rows={[
          { label: "From", value: props.name },
          { label: "Email", value: props.email },
          ...(props.subject ? [{ label: "Subject", value: props.subject }] : []),
        ]}
      />
      <P>{props.message}</P>
      <P>Reply directly to this email to respond to {props.name}.</P>
    </EmailLayout>
  );
}

// ── Sprint 5.10 — internal notification for registrations/applications/donations
export function InternalSubmissionNotification(props: {
  kind: "registration" | "application" | "donation";
  heading: string;
  rows: { label: string; value: string }[];
  adminUrl: string;
}) {
  const kindLabel =
    props.kind === "registration"
      ? "registration"
      : props.kind === "application"
        ? "application"
        : "donation";
  return (
    <EmailLayout preview={`New ${kindLabel}`} heading={props.heading}>
      <DetailList rows={props.rows} />
      <Button href={props.adminUrl}>View in admin</Button>
    </EmailLayout>
  );
}

// ── §13.5 — donation receipt ───────────────────────────────────────────────
export function DonationReceipt(props: {
  donorName: string;
  amountLabel: string;
  reference: string;
}) {
  return (
    <EmailLayout
      preview="Thank you for your donation"
      heading="Thank you for your gift."
    >
      <P>Hi {props.donorName},</P>
      <P>
        Your donation of <strong>{props.amountLabel}</strong> has been received.
        It goes directly to running courses, sponsoring places, and reaching
        researchers in new places — thank you.
      </P>
      <DetailList
        rows={[
          { label: "Amount", value: props.amountLabel },
          { label: "Reference", value: props.reference },
        ]}
      />
      <P>Keep this email as your receipt.</P>
    </EmailLayout>
  );
}
