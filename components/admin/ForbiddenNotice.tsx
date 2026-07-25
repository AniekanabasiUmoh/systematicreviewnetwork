export function ForbiddenNotice() {
  return (
    <div className="border-hairline bg-paper max-w-xl border p-7">
      <h1 className="text-display text-ink text-h3">
        You do not have access to this page
      </h1>
      <p className="text-slate text-small mt-3">
        Ask an administrator if you need access to staff accounts or site
        settings.
      </p>
    </div>
  );
}
