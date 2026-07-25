"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

/* Sprint 5.11 — "copy all email addresses" for the currently filtered list of
 * registrants. A plain textarea fallback covers browsers/contexts where the
 * Clipboard API is unavailable (e.g. no secure context). */

export function CopyEmailsButton({ emails }: { emails: string[] }) {
  const [copied, setCopied] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const joined = emails.join(", ");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(joined);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setShowFallback(true);
    }
  }

  if (emails.length === 0) return null;

  return (
    <div>
      <Button type="button" variant="secondary" onClick={handleCopy}>
        {copied ? "Copied!" : `Copy ${emails.length} email address${emails.length === 1 ? "" : "es"}`}
      </Button>
      {showFallback ? (
        <textarea
          readOnly
          value={joined}
          onFocus={(e) => e.currentTarget.select()}
          className="border-hairline text-ink text-small mt-2 w-full border p-2"
          rows={3}
        />
      ) : null}
    </div>
  );
}
