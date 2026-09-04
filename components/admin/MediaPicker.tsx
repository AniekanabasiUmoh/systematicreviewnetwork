"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

export type MediaItem = {
  id: string;
  url: string;
  file_name: string;
  alt_text: string;
  width: number | null;
  height: number | null;
};

export function MediaPicker({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (media: MediaItem) => void;
}) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/media", { signal });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.error ?? "Media could not be loaded.");
      }
      setItems(Array.isArray(body?.media) ? body.media : []);
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setError(
        cause instanceof Error ? cause.message : "Media could not be loaded.",
      );
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    /* Defer the request one microtask so opening the dialog itself stays a
       render-only transition; the network callback owns all state updates. */
    void Promise.resolve().then(() => load(controller.signal));
    return () => controller.abort();
  }, [load, open]);
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Choose an image"
      className="bg-ink/40 fixed inset-0 z-50 overflow-y-auto p-4"
    >
      <div className="border-hairline bg-paper mx-auto my-10 max-w-4xl border p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-display text-ink text-h3">Choose an image</h2>
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
        {loading ? (
          <p className="text-slate text-small mt-6">Loading images…</p>
        ) : error ? (
          <div role="alert" className="mt-6">
            <p className="text-tag-orange text-small">{error}</p>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void load()}
              className="mt-3"
            >
              Try again
            </Button>
          </div>
        ) : items.length === 0 ? (
          <p className="text-slate text-small mt-6">
            No images are available yet. Upload one in Media, then open this
            picker again.
          </p>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {items.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => {
                  onSelect(item);
                  onClose();
                }}
                className="border-hairline hover:border-ink overflow-hidden border text-left"
              >
                <Image
                  src={item.url}
                  alt=""
                  width={item.width ?? 800}
                  height={item.height ?? 600}
                  className="h-28 w-full object-cover"
                />
                <span className="text-ink text-small block p-3 font-medium">
                  {item.alt_text}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
