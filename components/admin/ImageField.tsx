"use client";

import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { MediaPicker, type MediaItem } from "./MediaPicker";

export function ImageField({
  name,
  label,
  hint,
  defaultValue,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultValue?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [open, setOpen] = useState(false);
  return (
    <div className="md:col-span-2">
      <p className="text-ink text-small font-medium">{label}</p>
      {hint ? <p className="text-slate mt-1 text-[0.8125rem]">{hint}</p> : null}
      <input type="hidden" name={name} value={value} />
      <div className="mt-2 flex flex-wrap items-center gap-3">
        {value ? (
          <Image
            src={value}
            alt=""
            width={160}
            height={96}
            className="border-hairline h-20 w-32 border object-cover"
          />
        ) : null}
        <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
          {value ? "Replace image" : "Choose image"}
        </Button>
        {value ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => setValue("")}
          >
            Remove
          </Button>
        ) : null}
      </div>
      <MediaPicker
        open={open}
        onClose={() => setOpen(false)}
        onSelect={(item: MediaItem) => setValue(item.url)}
      />
    </div>
  );
}
