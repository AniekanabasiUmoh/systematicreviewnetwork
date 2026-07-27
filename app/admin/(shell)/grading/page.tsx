import { requireStaff } from "@/lib/admin/auth";
import { listGradingQueue, listRecentlyMarked } from "@/lib/admin/grading";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { QueueItem, MarkedItem } from "@/components/admin/GradingQueue";

/* Sprint 6.6 — the grading queue.
 *
 * Oldest first: the person who has waited longest is marked next. Quizzes never
 * appear here — they are marked as they are submitted, so a queue containing
 * them would be a list of work nobody has to do. */

export const dynamic = "force-dynamic";

export default async function GradingPage() {
  await requireStaff();
  const [queue, recent] = await Promise.all([
    listGradingQueue(),
    listRecentlyMarked(),
  ]);

  return (
    <>
      <AdminPageHeader
        title="Marking"
        description="Assignments waiting for a marker, oldest first. Quizzes mark themselves and never appear here."
      />

      {queue.length === 0 ? (
        <div className="border-hairline bg-paper border px-6 py-8">
          <p className="text-slate text-small">
            Nothing is waiting to be marked. Assignments appear here as soon as
            a learner submits one.
          </p>
        </div>
      ) : (
        <>
          <p className="text-slate text-small mb-5">
            {queue.length}{" "}
            {queue.length === 1 ? "submission is" : "submissions are"} waiting.
          </p>
          <ul className="space-y-5">
            {queue.map((row) => (
              <QueueItem key={row.id} row={row} />
            ))}
          </ul>
        </>
      )}

      {recent.length > 0 ? (
        <section className="mt-12">
          <h2 className="text-display text-ink text-h3">Recently returned</h2>
          <p className="text-slate text-small mt-2 mb-5 max-w-2xl">
            The last {recent.length} marked, newest first.
          </p>
          <ul className="space-y-3">
            {recent.map((row) => (
              <MarkedItem key={row.id} row={row} />
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
