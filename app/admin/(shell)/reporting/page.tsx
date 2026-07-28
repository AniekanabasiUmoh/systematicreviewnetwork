import { requireStaff } from "@/lib/admin/auth";
import { listCohortReports, certificatesInPeriod } from "@/lib/admin/reporting";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

/* Sprint 6.8 — cohort reporting.
 *
 * §6.8: "These are the numbers that feed SRN's impact reporting and funder
 * applications, which is much of why the Academy exists."
 *
 * So every figure here is defensible, and the ones that are zero say zero
 * rather than being hidden. A funder application built on a report that
 * quietly omitted its empty cohorts would overstate reach. */

export const dynamic = "force-dynamic";

function lagosPeriod(monthsBack: number): { from: string; to: string; label: string } {
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsBack, 1),
  );
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsBack + 1, 1),
  );
  return {
    from: start.toISOString(),
    to: end.toISOString(),
    label: start.toLocaleDateString("en-GB", {
      timeZone: "UTC",
      month: "long",
      year: "numeric",
    }),
  };
}

export default async function ReportingPage() {
  await requireStaff();

  const reports = await listCohortReports();
  const periods = [lagosPeriod(0), lagosPeriod(1), lagosPeriod(2)];
  const certs = await Promise.all(
    periods.map((p) => certificatesInPeriod(p.from, p.to)),
  );

  const totalEnrolled = reports.reduce((n, r) => n + r.enrolled, 0);
  const totalCompleted = reports.reduce((n, r) => n + r.completed, 0);
  const overallRate =
    totalEnrolled === 0
      ? 0
      : Math.round((totalCompleted / totalEnrolled) * 1000) / 10;

  return (
    <>
      <AdminPageHeader
        title="Reporting"
        description="Enrolment, completion and certificates across the Academy. These are the figures for impact reports and funder applications."
      />

      <section className="border-hairline bg-paper mb-8 border p-5">
        <h2 className="text-ink text-small mb-3 font-semibold">
          Across every cohort
        </h2>
        <p className="text-slate text-small">
          {totalEnrolled} {totalEnrolled === 1 ? "learner has" : "learners have"}{" "}
          enrolled · {totalCompleted} finished ({overallRate}%)
        </p>
        <p className="text-slate text-small mt-2">
          Counts people holding a seat: paid or invoiced, not cancelled. An
          abandoned checkout is not an enrolment.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-display text-ink text-h3 mb-4">
          Certificates issued
        </h2>
        <ul className="space-y-2">
          {periods.map((period, i) => (
            <li
              key={period.label}
              className="border-hairline bg-paper flex flex-wrap items-baseline justify-between gap-3 border p-4"
            >
              <p className="text-ink text-small font-semibold">{period.label}</p>
              <p className="text-slate text-small">
                {certs[i].issued}{" "}
                {certs[i].issued === 1 ? "certificate" : "certificates"}
                {certs[i].revoked > 0
                  ? ` · ${certs[i].revoked} since withdrawn`
                  : ""}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-display text-ink text-h3 mb-4">By cohort</h2>
        {reports.length === 0 ? (
          <div className="border-hairline bg-paper border px-6 py-8">
            <p className="text-slate text-small">
              No cohorts yet. Figures appear here as soon as one has learners.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {reports.map((report) => (
              <li
                key={report.cohortId}
                className="border-hairline bg-paper border p-5"
              >
                <p className="text-ink text-small font-semibold">
                  {report.courseTitle} — {report.cohortLabel}
                </p>
                <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Figure label="Enrolled" value={String(report.enrolled)} />
                  <Figure
                    label="Finished"
                    value={`${report.completed} (${report.completionRate}%)`}
                  />
                  <Figure
                    label="Average score"
                    value={
                      report.averageScore > 0
                        ? `${report.averageScore}%`
                        : "Nothing marked yet"
                    }
                  />
                  <Figure
                    label="Certificates"
                    value={String(report.certificatesIssued)}
                  />
                </dl>
                {report.dropoutLessonTitle ? (
                  <p className="text-slate text-small mt-3">
                    Most learners stop at:{" "}
                    <span className="text-ink">{report.dropoutLessonTitle}</span>
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-slate text-small">{label}</dt>
      <dd className="text-ink mt-0.5 font-semibold">{value}</dd>
    </div>
  );
}
