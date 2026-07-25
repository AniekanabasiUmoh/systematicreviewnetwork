"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormField";
import { uploadMedia } from "@/lib/actions/admin-media";
import { idle } from "@/lib/actions/types";

export function MediaUploadForm() {
  const [state, action, pending] = useActionState(uploadMedia, idle);
  const [dimensions, setDimensions] = useState({ width: "", height: "" });
  return (
    <form action={action} className="border-hairline bg-paper border p-6">
      <h2 className="text-display text-ink text-h3">Upload an image</h2>
      <p className="text-slate text-small mt-2">
        JPEG, PNG, GIF, or WebP only. Images must be 8 MB or smaller and need
        useful alternative text.
      </p>
      {state.status === "error" && state.formError ? (
        <div className="mt-4">
          <FormMessage tone="error">{state.formError}</FormMessage>
        </div>
      ) : null}
      {state.status === "success" ? (
        <div className="mt-4">
          <FormMessage tone="success">{state.message}</FormMessage>
        </div>
      ) : null}
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div>
          <label
            className="text-ink text-small block font-medium"
            htmlFor="file"
          >
            Image file
          </label>
          <input
            id="file"
            name="file"
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            required
            className="text-small mt-2 block w-full"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (!file) return;
              const image = new window.Image();
              image.onload = () => {
                setDimensions({
                  width: String(image.naturalWidth),
                  height: String(image.naturalHeight),
                });
                URL.revokeObjectURL(image.src);
              };
              image.src = URL.createObjectURL(file);
            }}
          />
          {state.status === "error" && state.fieldErrors?.file ? (
            <p className="text-tag-orange text-small mt-2">
              {state.fieldErrors.file}
            </p>
          ) : null}
        </div>
        <div>
          <label
            className="text-ink text-small block font-medium"
            htmlFor="alt_text"
          >
            Alternative text
          </label>
          <textarea
            id="alt_text"
            name="alt_text"
            required
            className="border-hairline bg-paper text-ink text-small mt-2 min-h-24 w-full border px-3 py-2.5"
            placeholder="Describe what is happening in the image."
          />
          {state.status === "error" && state.fieldErrors?.alt_text ? (
            <p className="text-tag-orange text-small mt-2">
              {state.fieldErrors.alt_text}
            </p>
          ) : null}
        </div>
      </div>
      <input type="hidden" name="width" value={dimensions.width} />
      <input type="hidden" name="height" value={dimensions.height} />
      <div className="mt-6">
        <Button disabled={pending}>
          {pending ? "Uploading…" : "Upload image"}
        </Button>
      </div>
    </form>
  );
}
