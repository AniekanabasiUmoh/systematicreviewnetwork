"use client";

import { useState } from "react";

/* Nav for the hero. On desktop the links sit inline; below 800px they collapse
   into a menu button that opens a full drawer — so mobile visitors keep every
   destination, instead of being left with a single button (the coodex find). */

export function ProtoNav({ links }: { links: string[] }) {
  const [open, setOpen] = useState(false);

  return (
    <nav className="p-nav" aria-label="Main">
      <a className="p-wordmark" href="#top">
        SRN
      </a>

      <div className="p-nav-links">
        {links.map((n) => (
          <a key={n} href="#">
            {n}
          </a>
        ))}
      </div>

      <a className="p-btn p-btn-on-photo p-nav-cta" href="#">
        Partner with SRN
      </a>

      <button
        type="button"
        className="p-nav-toggle"
        aria-expanded={open}
        aria-controls="p-nav-drawer"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="p-sr-only">{open ? "Close menu" : "Open menu"}</span>
        <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden>
          {open ? (
            <>
              <path d="M6 6l14 14M20 6L6 20" stroke="currentColor" strokeWidth="1.8" />
            </>
          ) : (
            <>
              <path d="M4 8h18M4 13h18M4 18h18" stroke="currentColor" strokeWidth="1.8" />
            </>
          )}
        </svg>
      </button>

      <div
        id="p-nav-drawer"
        className={`p-nav-drawer${open ? " is-open" : ""}`}
        hidden={!open}
      >
        <ul>
          {links.map((n) => (
            <li key={n}>
              <a href="#" onClick={() => setOpen(false)}>
                {n}
              </a>
            </li>
          ))}
          <li>
            <a href="#" className="p-drawer-cta" onClick={() => setOpen(false)}>
              Partner with SRN
            </a>
          </li>
        </ul>
      </div>
    </nav>
  );
}
