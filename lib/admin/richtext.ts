import type { Json } from "@/lib/database.types";
import { validateStoredEmbed } from "@/lib/admin/embeds";

type UnknownRecord = Record<string, unknown>;

const ALLOWED_NODES = new Set([
  "doc",
  "paragraph",
  "heading",
  "bulletList",
  "orderedList",
  "listItem",
  "blockquote",
  "hardBreak",
  "text",
  "image",
  "embed",
]);
const ALLOWED_MARKS = new Set(["bold", "italic", "link"]);

function record(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function permittedImage(src: unknown) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return (
    typeof src === "string" &&
    Boolean(base) &&
    src.startsWith(`${base}/storage/v1/object/public/media/`)
  );
}

function permittedHref(href: unknown) {
  return typeof href === "string" && /^(https?:|mailto:)/i.test(href);
}

function sanitizeMarks(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  return value.flatMap((mark) => {
    const item = record(mark);
    if (!item || typeof item.type !== "string" || !ALLOWED_MARKS.has(item.type))
      return [];
    if (item.type !== "link") return [{ type: item.type }];
    const attrs = record(item.attrs);
    return permittedHref(attrs?.href)
      ? [{ type: "link", attrs: { href: attrs!.href } }]
      : [];
  });
}

function sanitizeNode(value: unknown): Json | null {
  const node = record(value);
  if (!node || typeof node.type !== "string" || !ALLOWED_NODES.has(node.type))
    return null;

  if (node.type === "text") {
    if (typeof node.text !== "string") return null;
    const marks = sanitizeMarks(node.marks);
    return marks?.length
      ? { type: "text", text: node.text, marks }
      : { type: "text", text: node.text };
  }

  if (node.type === "heading") {
    const level = record(node.attrs)?.level;
    if (level !== 2 && level !== 3) return null;
  }

  if (node.type === "image" && !permittedImage(record(node.attrs)?.src))
    return null;

  /* Embeds are re-validated from their stored URL on every sanitize pass. The
     sanitizer is the only thing standing between stored jsonb and rendered
     HTML, so it must not assume the paste-time check ran — the row could have
     been written before a host was removed from the allowlist, or by a path
     that bypassed the editor entirely.

     Embeds are leaf nodes: they never have children, so we return here rather
     than walking node.content. */
  if (node.type === "embed") {
    const attrs = record(node.attrs);
    if (!attrs) return null;
    const parsed = validateStoredEmbed(attrs);
    if (!parsed.ok) return null;
    return {
      type: "embed",
      attrs: {
        provider: parsed.provider,
        id: parsed.id,
        title: parsed.title,
        url: parsed.url,
        inline: parsed.inline,
      },
    };
  }

  const content = Array.isArray(node.content)
    ? node.content
        .map(sanitizeNode)
        .filter((child): child is Json => child !== null)
    : undefined;
  const output: Record<string, Json> = { type: node.type };
  if (content) output.content = content;
  if (node.type === "heading")
    output.attrs = { level: record(node.attrs)!.level as number };
  if (
    node.type === "orderedList" &&
    typeof record(node.attrs)?.start === "number"
  ) {
    output.attrs = { start: record(node.attrs)!.start as number };
  }
  if (node.type === "image") {
    const attrs = record(node.attrs)!;
    output.attrs = {
      src: attrs.src as string,
      ...(typeof attrs.alt === "string" && attrs.alt.trim()
        ? { alt: attrs.alt.trim().slice(0, 500) }
        : {}),
    };
  }
  return output;
}

/** Restrict stored TipTap JSON to the renderer's safe, supported subset. */
export function sanitizeRichText(input: unknown): Json | null {
  return sanitizeNode(input);
}
