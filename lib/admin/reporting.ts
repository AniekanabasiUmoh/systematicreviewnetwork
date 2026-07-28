import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";

/* Sprint 6.8 — cohort reporting.
 *
 * §6.8: "These are the numbers that feed SRN's impact reporting and funder
 * applications, which is much of why the Academy exists." So the figures have
 * to be defensible, not merely plausible.
 *
 * The seat rule lives in ONE place — cohort_report() in the database — and
 * matches getCohortSeatCounts and holdsSeat exactly: paid or invoiced, not
 * cancelled. A report that counted abandoned checkouts as enrolments would
 * overstate reach in a funding application, which is the one place being wrong
 * actually costs something. */

export type CohortReport = {
  cohortId: string;
  cohortLabel: string;
  courseTitle: string;
  enrolled: number;
  completed: number;
  completionRate: number;
  averageScore: number;
  certificatesIssued: number;
  dropoutLessonTitle: string | null;
};

type ReportRow = {
  enrolled: number;
  completed: number;
  completion_rate: string | number;
  average_score: string | number;
  certificates_issued: number;
  dropout_lesson_id: string | null;
};

/** Numeric columns come back as strings over the wire; coerce once, here. */
function num(value: string | number | null): number {
  const n = typeof value === "string" ? Number(value) : (value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export async function getCohortReport(
  cohortId: string,
): Promise<CohortReport | null> {
  const { data: cohort } = await supabaseAdmin
    .from("cohorts")
    .select("id, label, courses (title)")
    .eq("id", cohortId)
    .maybeSingle();
  if (!cohort) return null;

  const { data, error } = await supabaseAdmin.rpc("cohort_report" as never, {
    p_cohort_id: cohortId,
  } as never);
  if (error) {
    console.error("[reporting] cohort_report failed:", error.message);
    return null;
  }

  const row = (Array.isArray(data) ? data[0] : data) as ReportRow | undefined;
  if (!row) return null;

  /* The dropout point is stored as a lesson id; a report is only useful if it
     names the lesson people stop at. */
  let dropoutLessonTitle: string | null = null;
  if (row.dropout_lesson_id) {
    const { data: lesson } = await supabaseAdmin
      .from("lessons")
      .select("title")
      .eq("id", row.dropout_lesson_id)
      .maybeSingle();
    dropoutLessonTitle = (lesson as { title: string } | null)?.title ?? null;
  }

  const parent = cohort as unknown as {
    id: string;
    label: string;
    courses: { title: string } | null;
  };

  return {
    cohortId: parent.id,
    cohortLabel: parent.label,
    courseTitle: parent.courses?.title ?? "",
    enrolled: row.enrolled,
    completed: row.completed,
    completionRate: num(row.completion_rate),
    averageScore: num(row.average_score),
    certificatesIssued: row.certificates_issued,
    dropoutLessonTitle,
  };
}

/** Every cohort with a report, newest first. Fortune's overview. */
export async function listCohortReports(): Promise<CohortReport[]> {
  const { data } = await supabaseAdmin
    .from("cohorts")
    .select("id")
    .is("archived_at", null)
    .order("starts_on", { ascending: false, nullsFirst: false });

  const ids = (data ?? []).map((row) => row.id);
  const reports = await Promise.all(ids.map((id) => getCohortReport(id)));
  return reports.filter((row): row is CohortReport => row !== null);
}

/**
 * Certificates issued in a period (§6.8).
 *
 * Counts by ISSUE date, not completion date: a funder asking "how many
 * credentials did you award last quarter" means the ones that went out, and
 * those are the dates that reconcile against the register.
 */
export async function certificatesInPeriod(
  from: string,
  to: string,
): Promise<{ issued: number; revoked: number }> {
  const [issued, revoked] = await Promise.all([
    supabaseAdmin
      .from("certificates")
      .select("id", { count: "exact", head: true })
      .gte("issued_at", from)
      .lt("issued_at", to),
    supabaseAdmin
      .from("certificates")
      .select("id", { count: "exact", head: true })
      .gte("issued_at", from)
      .lt("issued_at", to)
      .not("revoked_at", "is", null),
  ]);

  return { issued: issued.count ?? 0, revoked: revoked.count ?? 0 };
}

/** The cohorts one instructor teaches, with their figures. */
export async function instructorCohortReports(
  cohortIds: ReadonlyArray<string>,
): Promise<CohortReport[]> {
  if (cohortIds.length === 0) return [];
  const reports = await Promise.all(cohortIds.map((id) => getCohortReport(id)));
  return reports.filter((row): row is CohortReport => row !== null);
}
