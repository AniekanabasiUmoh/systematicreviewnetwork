export function StatCard({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href?: string;
}) {
  const inner = (
    <>
      <p className="text-slate text-small">{label}</p>
      <p className="text-display text-ink mt-2 text-[2rem] leading-none">
        {value.toLocaleString()}
      </p>
    </>
  );
  return href ? (
    <a
      href={href}
      className="border-hairline bg-paper hover:bg-mist block border p-5 transition-colors"
    >
      {inner}
    </a>
  ) : (
    <div className="border-hairline bg-paper border p-5">{inner}</div>
  );
}
