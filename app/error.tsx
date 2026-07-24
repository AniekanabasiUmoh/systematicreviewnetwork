"use client";

import { useEffect } from "react";

/* §1.2 — 500. Must be a client component and must not depend on anything that
   could itself be broken, so it deliberately avoids the site chrome and any
   data fetching. Plain, honest, and offers a real next step. */

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surfaces in Vercel logs; the digest ties this render to the server error.
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[var(--container-prose)] flex-col justify-center px-6 py-24">
      <p className="text-eyebrow-style text-evidence">Something went wrong</p>
      <h1 className="text-display-tight text-ink mt-3 text-[2.25rem] leading-[1.1] md:text-[3rem]">
        This page didn&apos;t load.
      </h1>
      <p className="text-slate prose-measure mt-4">
        The problem is on our side, not yours. Try again — and if it keeps
        happening, let us know and we&apos;ll look into it.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="bg-evidence text-paper hover:bg-evidence/90 inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-[0.9375rem] font-semibold transition-colors"
        >
          Try again
        </button>
        {/* Deliberately a plain anchor, not next/link: this boundary catches a
            render that already failed, so a hard navigation gives the router a
            clean slate rather than reusing possibly-broken client state. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/"
          className="border-ink/25 text-ink hover:border-ink hover:bg-ink/5 inline-flex items-center justify-center rounded-lg border px-5 py-2.5 text-[0.9375rem] font-semibold transition-colors"
        >
          Go to the homepage
        </a>
      </div>
      {error.digest ? (
        <p className="text-slate text-small mt-10">
          Reference code:{" "}
          <code className="text-ink font-mono">{error.digest}</code> — quote
          this if you contact us.
        </p>
      ) : null}
    </div>
  );
}
