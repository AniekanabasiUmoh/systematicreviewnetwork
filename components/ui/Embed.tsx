import { ExternalLink, Video } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import type { EmbedProvider } from "@/lib/admin/embeds";

/* Sprint 5.8 — renders a normalised embed triple. Never receives or renders
 * raw HTML: the server stored only {provider, id, title, url}, and the frame
 * src is rebuilt here from the provider and id.
 *
 * Two deliberate choices:
 *   - YouTube goes through youtube-nocookie.com, so a reader who never plays
 *     the video is not tracked by simply loading the page.
 *   - Zoom links (live meetings and recordings alike) are never framed. A live
 *     join URL sitting in an iframe on a public page lets anyone who finds the
 *     page walk into the session; it renders as a link the reader chooses. */

const SANDBOX = "allow-scripts allow-same-origin allow-presentation";

function frameSrc(provider: EmbedProvider, id: string): string | null {
  if (provider === "youtube")
    return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`;
  if (provider === "vimeo")
    return `https://player.vimeo.com/video/${encodeURIComponent(id)}`;
  return null;
}

export function Embed({
  provider,
  id,
  title,
  url,
}: {
  provider: EmbedProvider;
  id: string;
  title: string;
  url: string;
}) {
  const src = frameSrc(provider, id);

  if (!src) {
    const isLive = provider === "zoom_live";
    return (
      <figure className="border-hairline bg-mist mt-7 border p-6">
        <figcaption className="text-ink flex items-center gap-2.5 font-semibold">
          <Icon icon={Video} size="sm" color="evidence" />
          {title}
        </figcaption>
        <p className="text-slate text-small mt-2">
          {isLive
            ? "This session runs on Zoom. The link opens the meeting directly."
            : "This recording is hosted on Zoom and opens in a new tab."}
        </p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="border-ink text-ink text-small mt-4 inline-flex items-center gap-2 border px-4 py-2 font-semibold"
        >
          {isLive ? "Join on Zoom" : "Watch on Zoom"}
          <Icon icon={ExternalLink} size="sm" color="current" />
        </a>
      </figure>
    );
  }

  return (
    <figure className="mt-7">
      <div className="border-hairline aspect-video w-full border">
        <iframe
          src={src}
          title={title}
          loading="lazy"
          sandbox={SANDBOX}
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="h-full w-full"
        />
      </div>
      <figcaption className="text-slate text-small mt-2.5">{title}</figcaption>
      {/* Without JS the frame may not load at all; the reader still gets the
          video rather than an empty box. */}
      <noscript>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-ink text-small font-semibold underline underline-offset-2"
        >
          Watch “{title}” in a new tab
        </a>
      </noscript>
    </figure>
  );
}
