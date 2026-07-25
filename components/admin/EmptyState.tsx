import Link from "next/link";

export function EmptyState({
  title,
  body,
  href,
  action,
}: {
  title: string;
  body: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="border-hairline bg-paper border px-6 py-10 text-center">
      <h2 className="text-display text-ink text-h3">{title}</h2>
      <p className="text-slate text-small mx-auto mt-2 max-w-md">{body}</p>
      {href && action ? (
        <Link
          href={href}
          className="bg-evidence text-paper text-small mt-5 inline-flex px-4 py-2 font-semibold"
        >
          {action}
        </Link>
      ) : null}
    </div>
  );
}
