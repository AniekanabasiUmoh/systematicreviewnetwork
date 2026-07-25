export function CapacityMeter({
  taken,
  capacity,
}: {
  taken: number;
  capacity: number | null;
}) {
  if (capacity === null)
    return <p className="text-slate text-small">{taken} registered · no capacity limit</p>;

  const pct = Math.min((taken / capacity) * 100, 100);
  return (
    <div>
      <p className="text-ink text-small font-medium">
        {taken} of {capacity} seats taken
      </p>
      <div
        aria-hidden
        className="bg-mist mt-1.5 h-1.5 w-full max-w-xs overflow-hidden"
      >
        <div className="bg-evidence h-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
