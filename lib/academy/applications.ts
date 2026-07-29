import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";
import type { ApplicationsRow, ApplicationDocumentsRow } from "@/lib/database.types";

/* Sprint 7.1 — the applicant's own view.
 *
 * Applications have existed since Phase 4 and could only ever be seen by staff.
 * This module is the other half: a person who applied can see where their
 * application got to, and attach a CV or protocol without emailing anybody.
 *
 * MATCHING BY EMAIL, and why it is safe here. `applications.learner_id` is
 * nullable because the public form has no login, so most rows have no owner.
 * Rather than stranding those, a signed-in learner also sees applications whose
 * EMAIL matches their own — but only once their address is VERIFIED, which is
 * the whole point of 6.1's verification gate. An unverified address is a claim;
 * a verified one is proof. Without that gate, anyone could type someone else's
 * address at sign-up and read their application.
 */

export type Application = ApplicationsRow;
export type ApplicationDocument = ApplicationDocumentsRow;

/** The four states an applicant sees, in order. Mirrors the staff stepper. */
export const APPLICANT_STEPS = [
  { status: "received", label: "Received" },
  { status: "under_review", label: "Under review" },
  { status: "decided", label: "Decision" },
] as const;

/** Plain-language status for the applicant. Never jargon, never an apology. */
export function applicantStatusLabel(status: string): string {
  switch (status) {
    case "received":
      return "Received";
    case "under_review":
      return "Being reviewed";
    case "accepted":
      return "Offered a place";
    case "waitlisted":
      return "On the waiting list";
    case "rejected":
      return "Not this time";
    default:
      return "Received";
  }
}

/** What the applicant should do next, or null when it is on SRN. */
export function applicantNextStep(status: string): string | null {
  switch (status) {
    case "received":
      return "We have it. Nothing for you to do — we will email you when a reviewer has looked at it.";
    case "under_review":
      return "A reviewer is reading it now. Adding a CV or protocol below is still possible and still useful.";
    case "accepted":
      return "Check your email for the joining details. If they have not arrived, tell us.";
    case "waitlisted":
      return "You are on the list. If a place frees up we will offer it in the order people joined.";
    case "rejected":
      return "You can apply again for a future intake. We keep no record that counts against you.";
    default:
      return null;
  }
}

/** How far along the three-step bar this status sits. */
export function stepIndex(status: string): number {
  if (status === "received") return 0;
  if (status === "under_review") return 1;
  return 2;
}

export type MyApplication = Application & {
  documents: ApplicationDocument[];
};

/**
 * Every application belonging to this learner.
 *
 * Requires a VERIFIED email — see the note at the top of this file. An
 * unverified learner gets an empty list rather than an error, because the
 * account page already tells them to confirm their address and a second
 * warning in a different voice would be noise.
 */
export async function listMyApplications(learner: {
  id: string;
  email: string;
  verified_at: string | null;
}): Promise<MyApplication[]> {
  if (!learner.verified_at) return [];

  const { data, error } = await supabaseAdmin
    .from("applications")
    .select("*")
    .or(`learner_id.eq.${learner.id},email.ilike.${learner.email}`)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[applications] list failed:", error.message);
    return [];
  }

  const rows = (data ?? []) as Application[];
  if (rows.length === 0) return [];

  /* Claim any matched-by-email rows for this learner, so the link survives a
     later email change and the next read is a plain indexed lookup. */
  const unclaimed = rows.filter((row) => row.learner_id === null).map((r) => r.id);
  if (unclaimed.length > 0) {
    await supabaseAdmin
      .from("applications")
      .update({ learner_id: learner.id } as never)
      .in("id", unclaimed);
  }

  const { data: docs } = await supabaseAdmin
    .from("application_documents")
    .select("*")
    .in(
      "application_id",
      rows.map((r) => r.id),
    )
    .order("uploaded_at", { ascending: false });

  const byApplication = new Map<string, ApplicationDocument[]>();
  for (const doc of (docs ?? []) as ApplicationDocument[]) {
    const list = byApplication.get(doc.application_id) ?? [];
    list.push(doc);
    byApplication.set(doc.application_id, list);
  }

  return rows.map((row) => ({
    ...row,
    documents: byApplication.get(row.id) ?? [],
  }));
}

/**
 * One application, only if it belongs to this learner.
 *
 * The id in a URL is a claim; this is what checks it. Returns null rather than
 * throwing so the caller can 404 — telling someone "that application exists but
 * is not yours" confirms it exists.
 */
export async function getMyApplication(
  learner: { id: string; email: string; verified_at: string | null },
  applicationId: string,
): Promise<MyApplication | null> {
  const all = await listMyApplications(learner);
  return all.find((row) => row.id === applicationId) ?? null;
}

/** How long a signed document link lives. Long enough to open, short enough
    that a copied link stops working. Matches the 6.3 material TTL. */
export const DOCUMENT_URL_TTL_SECONDS = 300;

/**
 * A signed URL for one document, or null.
 *
 * Ownership is re-checked here rather than trusted from the page that rendered
 * the link, for the same reason 6.3 re-checks materials: the id is guessable
 * and the link gets shared.
 */
export async function getDocumentUrl(
  learner: { id: string; email: string; verified_at: string | null },
  documentId: string,
): Promise<string | null> {
  const { data: doc } = await supabaseAdmin
    .from("application_documents")
    .select("id, application_id, storage_path")
    .eq("id", documentId)
    .maybeSingle();
  if (!doc) return null;

  const owned = await getMyApplication(learner, doc.application_id);
  if (!owned) return null;

  const { data, error } = await supabaseAdmin.storage
    .from("application-documents")
    .createSignedUrl(doc.storage_path, DOCUMENT_URL_TTL_SECONDS);
  if (error || !data) return null;
  return data.signedUrl;
}
