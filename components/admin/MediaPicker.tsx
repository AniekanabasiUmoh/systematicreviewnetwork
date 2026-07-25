"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
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
  useEffect(() => {
    if (!open) return;
    fetch("/api/admin/media")
      .then(async (r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setItems(data.media))
      .catch(() => setError("Media could not be loaded."));
  }, [open]);
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
        {error ? (
          <p className="text-tag-orange text-small mt-4">{error}</p>
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
