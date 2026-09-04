"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * A partner logo is optional editorial media, not a reason for the whole
 * credibility bar to show a broken-image icon. If a remote asset disappears,
 * retain the partner's name in a quiet, accessible fallback instead.
 */
export function PartnerLogo({
  name,
  src,
  width = 200,
  height = 80,
  className = "",
  imgClassName = "",
  sizes = "140px",
}: {
  name: string;
  src?: string | null;
  width?: number;
  height?: number;
  className?: string;
  imgClassName?: string;
  sizes?: string;
}) {
  const [failed, setFailed] = useState(false);
  const usable = Boolean(src && !failed);

  if (!usable) {
    return (
      <div
        role="img"
        aria-label={`${name} logo`}
        className={`border-hairline bg-paper text-ink flex items-center justify-center border px-4 text-center text-[0.75rem] font-semibold tracking-[0.04em] uppercase ${className}`.trim()}
        style={{ aspectRatio: `${width} / ${height}` }}
      >
        {name}
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden ${className}`.trim()}
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      <Image
        src={src!}
        alt={name}
        fill
        sizes={sizes}
        onError={() => setFailed(true)}
        className={`object-contain ${imgClassName}`.trim()}
      />
    </div>
  );
}
