"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormField";
import { resolveEmbed } from "@/lib/actions/admin-embeds";

/* Sprint 5.8 — the editor never builds an embed's provider/id itself; it sends
 * the pasted URL to the server (resolveEmbed) and inserts exactly what comes
 * back. If the server refuses the link, that refusal is the only thing shown —
 * there is no client-side fallback path that could disagree with it. */

export function EmbedDialog({
  open,
  onClose,
  onInsert,
}: {
  open: boolean;
  onClose: () => void;
  onInsert: (attrs: {
    provider: string;
    id: string;
    title: string;
    url: string;
    inline: boolean;
  }) => void;
}) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!open) return null;

  async function handleInsert() {
    setPending(true);
    setError(null);
    const result = await resolveEmbed(url, title);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onInsert(result.attrs);
    setUrl("");
    setTitle("");
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Add a video"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="bg-paper border-hairline w-full max-w-md border p-6">
        <h2 className="text-ink text-h4 font-semibold">Add a video</h2>
        <p className="text-slate text-small mt-1">
          Paste a YouTube, Vimeo, or Zoom link. We check it and build the
          embed for you.
        </p>

        <label htmlFor="embed-url" className="text-ink text-small mt-4 block font-medium">
          Video link
        </label>
        <input
          id="embed-url"
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=…"
          className="border-hairline bg-paper text-ink mt-2 w-full border px-3.5 py-2.5"
        />

        <label htmlFor="embed-title" className="text-ink text-small mt-4 block font-medium">
          Title
        </label>
        <input
          id="embed-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What is this video?"
          className="border-hairline bg-paper text-ink mt-2 w-full border px-3.5 py-2.5"
        />

        {error ? (
          <div className="mt-4">
            <FormMessage tone="error">{error}</FormMessage>
          </div>
        ) : null}

        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={pending} onClick={handleInsert}>
            {pending ? "Checking…" : "Insert"}
          </Button>
        </div>
      </div>
    </div>
  );
}
