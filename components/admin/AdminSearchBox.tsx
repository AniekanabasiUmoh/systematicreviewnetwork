import { Search } from "lucide-react";
import { Icon } from "@/components/ui/Icon";

/* Sprint 5.10 — one search box, present on every admin page. Server-rendered
 * GET form; no client state, no JS dependency to work at all. */

export function AdminSearchBox() {
  return (
    <form
      action="/admin/search"
      className="border-hairline bg-paper flex max-w-sm items-center gap-2 border px-3 py-2"
    >
      <Icon icon={Search} size="sm" color="slate" />
      <label htmlFor="admin-search-q" className="sr-only">
        Search admin content
      </label>
      <input
        id="admin-search-q"
        type="search"
        name="q"
        placeholder="Search everything…"
        className="text-ink placeholder:text-slate/60 text-small min-w-0 flex-1 bg-transparent outline-none"
      />
    </form>
  );
}
