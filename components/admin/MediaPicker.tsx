"use client";

import Image from "next/image";
import { useCallback, useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { uploadMedia } from "@/lib/actions/admin-media";
import { idle, type ActionState } from "@/lib/actions/types";

export type MediaItem = {
  id: string;
  url: string;
  file_name: string;
  alt_text: string;
  width: number | null;
  height: number | null;
};

function uploadedMedia(value: unknown): MediaItem | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  if (
    typeof item.id !== "string" ||
    typeof item.url !== "string" ||
    typeof item.file_name !== "string" ||
    typeof item.alt_text !== "string"
  )
    return null;
  return {
    id: item.id,
    url: item.url,
    file_name: item.file_name,
    alt_text: item.alt_text,
    width: typeof item.width === "number" ? item.width : null,
    height: typeof item.height === "number" ? item.height : null,
  };
}

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
  const [failedImages, setFailedImages] = useState<Set<string>>(
    () => new Set(),
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadAlt, setUploadAlt] = useState("");
  const [uploadWidth, setUploadWidth] = useState("");
  const [uploadHeight, setUploadHeight] = useState("");
  const [uploadState, setUploadState] = useState<ActionState>(idle);
  const [uploading, startUpload] = useTransition();

  const closePicker = useCallback(() => {
    setUploadOpen(false);
    setUploadFile(null);
    setUploadAlt("");
    setUploadWidth("");
    setUploadHeight("");
    setUploadState(idle);
    onClose();
  }, [onClose]);

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
      setFailedImages(new Set());
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setError(
        cause instanceof Error ? cause.message : "Media could not be loaded.",
      );
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  const submitUpload = () => {
    if (!uploadFile) {
      setUploadState({
        status: "error",
        fieldErrors: { file: "Choose an image to upload." },
      });
      return;
    }
    const form = new FormData();
    form.set("file", uploadFile);
    form.set("alt_text", uploadAlt);
    if (uploadWidth) form.set("width", uploadWidth);
    if (uploadHeight) form.set("height", uploadHeight);
    startUpload(() => {
      void uploadMedia(idle, form).then((next) => {
        setUploadState(next);
        if (next.status !== "success") return;
        const item = uploadedMedia(next.data?.media);
        if (!item) {
          setUploadState({
            status: "error",
            formError:
              "The image uploaded, but could not be selected. Refresh the picker and try again.",
          });
          return;
        }
        onSelect(item);
        closePicker();
      });
    });
  };

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
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setUploadOpen((open) => !open);
                setUploadState(idle);
              }}
            >
              {uploadOpen ? "Choose existing" : "Upload new"}
            </Button>
            <Button type="button" variant="secondary" onClick={closePicker}>
              Close
            </Button>
          </div>
        </div>
        {uploadOpen ? (
          <section
            className="border-hairline bg-mist mt-6 border p-4"
            aria-label="Upload a new image"
          >
            <h3 className="text-ink text-small font-semibold">
              Upload a new image
            </h3>
            <p className="text-slate mt-1 text-[0.8125rem]">
              Upload it here and it will be selected automatically for this
              event. JPEG, PNG, GIF, or WebP up to 8 MB.
            </p>
            {uploadState.status === "error" ? (
              <div role="alert" className="text-tag-orange text-small mt-3">
                {uploadState.fieldErrors?.file ??
                  uploadState.fieldErrors?.alt_text ??
                  uploadState.formError ??
                  "The image could not be uploaded."}
              </div>
            ) : null}
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label
                  className="text-ink text-small block font-medium"
                  htmlFor="media-picker-file"
                >
                  Image file
                </label>
                <input
                  id="media-picker-file"
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="text-small mt-2 block w-full"
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0] ?? null;
                    setUploadFile(file);
                    if (!file) return;
                    const image = new window.Image();
                    const objectUrl = URL.createObjectURL(file);
                    image.onload = () => {
                      setUploadWidth(String(image.naturalWidth));
                      setUploadHeight(String(image.naturalHeight));
                      URL.revokeObjectURL(objectUrl);
                    };
                    image.src = objectUrl;
                  }}
                />
              </div>
              <div>
                <label
                  className="text-ink text-small block font-medium"
                  htmlFor="media-picker-alt"
                >
                  Alternative text
                </label>
                <textarea
                  id="media-picker-alt"
                  value={uploadAlt}
                  onChange={(event) => setUploadAlt(event.target.value)}
                  placeholder="Describe what is happening in the image."
                  className="border-hairline bg-paper text-ink text-small mt-2 min-h-20 w-full border px-3 py-2.5"
                />
              </div>
            </div>
            <Button
              type="button"
              disabled={uploading}
              onClick={submitUpload}
              className="mt-4"
            >
              {uploading ? "Uploading…" : "Upload and use image"}
            </Button>
          </section>
        ) : null}
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
            No images are available yet. Use <strong>Upload new</strong> above
            to add one here, or upload one in Media for reuse across the site.
          </p>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {items.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => {
                  onSelect(item);
                  closePicker();
                }}
                className="border-hairline hover:border-ink overflow-hidden border text-left"
              >
                {failedImages.has(item.id) ? (
                  <span
                    role="img"
                    aria-label={`Preview unavailable: ${item.alt_text}`}
                    className="bg-mist text-slate flex h-28 items-center justify-center px-3 text-center text-[0.75rem]"
                  >
                    Preview unavailable
                  </span>
                ) : (
                  <Image
                    src={item.url}
                    alt=""
                    width={item.width ?? 800}
                    height={item.height ?? 600}
                    unoptimized
                    onError={() =>
                      setFailedImages((current) => {
                        const next = new Set(current);
                        next.add(item.id);
                        return next;
                      })
                    }
                    className="h-28 w-full object-cover"
                  />
                )}
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
