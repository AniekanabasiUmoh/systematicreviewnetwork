import { ButtonLink } from "@/components/ui/Button";

export function AdminPageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-display text-ink text-h2">{title}</h1>
        {description ? (
          <p className="text-slate text-small mt-2 max-w-2xl">{description}</p>
        ) : null}
      </div>
      {action ? (
        <ButtonLink href={action.href}>{action.label}</ButtonLink>
      ) : null}
    </div>
  );
}
