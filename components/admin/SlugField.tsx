"use client";

import { useEffect, useState } from "react";
import { slugify } from "@/lib/actions/admin-schemas";

export function SlugField({
  name,
  label,
  defaultValue,
  sourceId,
  error,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  sourceId?: string;
  error?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [edited, setEdited] = useState(Boolean(defaultValue));
  useEffect(() => {
    if (!sourceId || edited) return;
    const source = document.getElementById(sourceId) as HTMLInputElement | null;
    if (!source) return;
    const sync = () => setValue(slugify(source.value));
    source.addEventListener("input", sync);
    return () => source.removeEventListener("input", sync);
  }, [edited, sourceId]);
  return (
    <div>
      <label htmlFor={name} className="text-ink text-small block font-medium">
        {label}
      </label>
      <input
        id={name}
        name={name}
        value={value}
        onChange={(event) => {
          setEdited(true);
          setValue(slugify(event.target.value));
        }}
        className="border-hairline bg-paper text-ink mt-2 w-full border px-3.5 py-2.5"
      />
      {error ? (
        <p className="text-tag-orange text-small mt-2">{error}</p>
      ) : (
        <p className="text-slate mt-1 text-[0.8125rem]">
          Lowercase words separated by hyphens.
        </p>
      )}
    </div>
  );
}
