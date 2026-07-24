import Link from "next/link";
import type { ReactNode } from "react";

/* Renders TipTap/ProseMirror JSON (the `body_rich` shape used by the `pages`,
   `news`, `resources`, and `events` tables) as styled server-rendered HTML.

   Deliberately a small, closed allow-list of node and mark types rather than
   dangerouslySetInnerHTML: staff-authored content never becomes raw HTML, so a
   pasted <script> or onclick can't execute. Unknown node types render their
   children (or nothing), so new marks degrade to plain text instead of throwing.

   Styling uses the site's own type tokens — no `prose` plugin — so editable
   content matches hand-built pages exactly. */

type Mark = {
  type: string;
  attrs?: { href?: string; target?: string } | null;
};

type Node = {
  type: string;
  text?: string;
  content?: Node[];
  attrs?: { level?: number; start?: number } | null;
  marks?: Mark[] | null;
};

function isInternal(href: string) {
  return href.startsWith("/") || href.startsWith("#");
}

function Text({ node }: { node: Node }) {
  let el: ReactNode = node.text ?? "";
  for (const mark of node.marks ?? []) {
    if (mark.type === "bold") el = <strong>{el}</strong>;
    else if (mark.type === "italic") el = <em>{el}</em>;
    else if (mark.type === "code")
      el = (
        <code className="bg-mist text-ink px-1.5 py-0.5 text-[0.9em]">{el}</code>
      );
    else if (mark.type === "link" && mark.attrs?.href) {
      const href = mark.attrs.href;
      el = isInternal(href) ? (
        <Link
          href={href}
          className="text-ink underline decoration-1 underline-offset-2 hover:decoration-evidence"
        >
          {el}
        </Link>
      ) : (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-ink underline decoration-1 underline-offset-2 hover:decoration-evidence"
        >
          {el}
        </a>
      );
    }
  }
  return <>{el}</>;
}

function Children({ nodes }: { nodes?: Node[] }) {
  return (
    <>
      {(nodes ?? []).map((child, i) => (
        <RenderNode key={i} node={child} />
      ))}
    </>
  );
}

function RenderNode({ node }: { node: Node }) {
  switch (node.type) {
    case "text":
      return <Text node={node} />;

    case "paragraph":
      return (
        <p className="text-slate mt-5 leading-[1.7] first:mt-0">
          <Children nodes={node.content} />
        </p>
      );

    case "heading": {
      const level = node.attrs?.level ?? 2;
      const cls =
        level <= 2
          ? "text-display text-ink mt-12 text-[clamp(1.4rem,3vw,2rem)] leading-[1.15] first:mt-0"
          : "text-display text-ink mt-10 text-[1.25rem] leading-snug first:mt-0";
      const inner = <Children nodes={node.content} />;
      if (level <= 2) return <h2 className={cls}>{inner}</h2>;
      return <h3 className={cls}>{inner}</h3>;
    }

    case "bulletList":
      return (
        <ul className="text-slate mt-5 space-y-2.5 pl-1">
          <Children nodes={node.content} />
        </ul>
      );

    case "orderedList":
      return (
        <ol className="text-slate mt-5 list-decimal space-y-2.5 pl-6">
          <Children nodes={node.content} />
        </ol>
      );

    case "listItem":
      return (
        <li className="flex gap-3 leading-[1.6] [ol_&]:list-item [ol_&]:pl-1">
          <span
            aria-hidden
            className="bg-evidence mt-[0.7em] h-1.5 w-1.5 shrink-0 [ol_&]:hidden"
          />
          <span className="[&>p]:mt-0 [&>p:not(:first-child)]:mt-2">
            <Children nodes={node.content} />
          </span>
        </li>
      );

    case "blockquote":
      return (
        <blockquote className="border-evidence text-ink mt-6 border-l-2 pl-5 italic">
          <Children nodes={node.content} />
        </blockquote>
      );

    case "hardBreak":
      return <br />;

    case "doc":
    default:
      return <Children nodes={node.content} />;
  }
}

/** Detects whether a body_rich value carries any real, non-placeholder text. */
export function richTextIsEmpty(body: unknown): boolean {
  const json = JSON.stringify(body ?? "");
  const text = json.replace(/\[PLACEHOLDER\][^"]*/g, "");
  return !/[A-Za-z]/.test(text.replace(/"(type|content|attrs|marks|text|level|href|target|start)"/g, ""));
}

export function RichText({ body }: { body: unknown }) {
  if (!body || typeof body !== "object") return null;
  return <RenderNode node={body as Node} />;
}
