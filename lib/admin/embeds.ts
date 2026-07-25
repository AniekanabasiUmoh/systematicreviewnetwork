/* Sprint 5.8 — safe media embeds.
 *
 * Staff paste an ordinary URL; the SERVER parses it, allowlists the host, and
 * stores only a normalised {provider, id, title} triple. Raw HTML from a paste
 * is never stored and never rendered — an <iframe> a staffer copied off a
 * support page could point anywhere, and a compromised or careless paste would
 * become a script running on SRN's own origin.
 *
 * No `server-only` import: this is pure string parsing and is unit-tested
 * directly (tests/admin-content.test.ts).
 */

export type EmbedProvider = "youtube" | "vimeo" | "zoom_recording" | "zoom_live";

export type ParsedEmbed =
  | {
      ok: true;
      provider: EmbedProvider;
      id: string;
      title: string;
      /** Zoom join links are never framed — they render as an external link. */
      inline: boolean;
      url: string;
    }
  | { ok: false; error: string };

/* Exact hostnames only. A substring check (`host.includes("youtube.com")`)
   would accept evil.com/youtube.com/x and frame an attacker's page. */
const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "m.youtube.com",
  "youtube-nocookie.com",
]);
const YOUTUBE_SHORT_HOSTS = new Set(["youtu.be"]);
const VIMEO_HOSTS = new Set(["vimeo.com", "player.vimeo.com"]);

const YOUTUBE_ID = /^[\w-]{11}$/;
const VIMEO_ID = /^\d+$/;

/* A meeting password in the URL must never be published, whatever the
   provider: the embed becomes public the moment the page does. */
const PASSWORD_PARAMS = ["pwd", "password", "passcode", "pw", "tk"];

function stripWww(hostname: string) {
  return hostname.replace(/^www\./, "").toLowerCase();
}

function hasPasswordParam(url: URL): boolean {
  for (const key of url.searchParams.keys()) {
    if (PASSWORD_PARAMS.includes(key.toLowerCase())) return true;
  }
  // Also check the fragment — Zoom historically put pwd there.
  const hash = url.hash.replace(/^#/, "");
  if (hash) {
    const hashParams = new URLSearchParams(hash);
    for (const key of hashParams.keys()) {
      if (PASSWORD_PARAMS.includes(key.toLowerCase())) return true;
    }
  }
  return false;
}

export function parseEmbedUrl(input: string, title: string): ParsedEmbed {
  const raw = (input ?? "").trim();
  const trimmedTitle = (title ?? "").trim();

  if (!trimmedTitle) {
    return {
      ok: false,
      error:
        "Give this video a title. Screen-reader users hear the title in place of the video.",
    };
  }
  if (trimmedTitle.length > 200) {
    return { ok: false, error: "That title is too long." };
  }

  if (!raw) return { ok: false, error: "Paste a video link." };

  /* Catch a pasted <iframe> before parsing, so the error names the real
     problem instead of "that is not a valid link". */
  if (raw.includes("<")) {
    return {
      ok: false,
      error:
        "Paste the plain link to the video, not the embed code. We build the embed for you.",
    };
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, error: "That does not look like a link." };
  }

  if (url.protocol !== "https:") {
    return { ok: false, error: "Only https links can be embedded." };
  }

  if (hasPasswordParam(url)) {
    return {
      ok: false,
      error:
        "That link contains a meeting password. Share a recording link without the password, or link to the registration page instead.",
    };
  }

  const host = stripWww(url.hostname);

  if (YOUTUBE_HOSTS.has(host)) {
    const id =
      url.searchParams.get("v") ??
      (url.pathname.startsWith("/embed/") ? url.pathname.slice(7) : null);
    if (!id || !YOUTUBE_ID.test(id))
      return { ok: false, error: "We could not find a video ID in that YouTube link." };
    return { ok: true, provider: "youtube", id, title: trimmedTitle, inline: true, url: raw };
  }

  if (YOUTUBE_SHORT_HOSTS.has(host)) {
    const id = url.pathname.slice(1);
    if (!YOUTUBE_ID.test(id))
      return { ok: false, error: "We could not find a video ID in that YouTube link." };
    return { ok: true, provider: "youtube", id, title: trimmedTitle, inline: true, url: raw };
  }

  if (VIMEO_HOSTS.has(host)) {
    const segments = url.pathname.split("/").filter(Boolean);
    const id = segments.find((segment) => VIMEO_ID.test(segment));
    if (!id)
      return { ok: false, error: "We could not find a video ID in that Vimeo link." };
    return { ok: true, provider: "vimeo", id, title: trimmedTitle, inline: true, url: raw };
  }

  if (host === "zoom.us" || host.endsWith(".zoom.us")) {
    if (/\/rec\/(share|play)\//.test(url.pathname)) {
      return {
        ok: true,
        provider: "zoom_recording",
        id: raw,
        title: trimmedTitle,
        inline: false,
        url: raw,
      };
    }
    if (/\/(j|my|s)\//.test(url.pathname)) {
      /* A live join link on a public page lets anyone who finds the page walk
         into the session. Never framed, always an explicit external link the
         reader chooses to follow. */
      return {
        ok: true,
        provider: "zoom_live",
        id: raw,
        title: trimmedTitle,
        inline: false,
        url: raw,
      };
    }
    return {
      ok: false,
      error: "That Zoom link is not a recording or a meeting link we recognise.",
    };
  }

  return {
    ok: false,
    error:
      "We can only embed YouTube, Vimeo, and Zoom links. For anything else, add a normal link instead.",
  };
}

/** Re-validates a stored embed node's attrs. Used by the sanitizer. */
export function validateStoredEmbed(attrs: {
  provider?: unknown;
  id?: unknown;
  title?: unknown;
  url?: unknown;
}): ParsedEmbed {
  if (typeof attrs.url !== "string" || typeof attrs.title !== "string") {
    return { ok: false, error: "Incomplete embed." };
  }
  return parseEmbedUrl(attrs.url, attrs.title);
}
