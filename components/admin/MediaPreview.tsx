"use client";

import Image from "next/image";
import { useState } from "react";

/** A broken uploaded object should affect one card, not the whole media page. */
export function MediaPreview({
  src,
  alt,
  width,
  height,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        role="img"
        aria-label={`Image unavailable: ${alt || "uploaded image"}`}
        className="bg-mist text-slate flex h-40 items-center justify-center px-4 text-center text-[0.75rem]"
      >
        Image unavailable
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className="h-40 w-full object-cover"
      onError={() => setFailed(true)}
    />
  );
}
