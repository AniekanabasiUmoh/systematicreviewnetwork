import { Node, mergeAttributes } from "@tiptap/core";

/* Sprint 5.8 — the editor-side representation of an embed.
 *
 * A leaf, atom node: it has no children and is selected as a single unit, so a
 * staffer cannot accidentally type inside it or split it in half. The editor
 * shows a simple labelled placeholder rather than a live iframe — a preview of
 * a real video inside an edit surface steals scroll, autoplays, and adds
 * third-party frames to the admin origin for no editorial benefit. */

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    srnEmbed: {
      setEmbed: (attrs: {
        provider: string;
        id: string;
        title: string;
        url: string;
        inline: boolean;
      }) => ReturnType;
    };
  }
}

const PROVIDER_LABELS: Record<string, string> = {
  youtube: "YouTube video",
  vimeo: "Vimeo video",
  zoom_recording: "Zoom recording",
  zoom_live: "Zoom meeting link",
};

export const EmbedNode = Node.create({
  name: "embed",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      provider: { default: null },
      id: { default: null },
      title: { default: null },
      url: { default: null },
      inline: { default: false },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-srn-embed]" }];
  },

  renderHTML({ HTMLAttributes }) {
    const provider = String(HTMLAttributes.provider ?? "");
    const title = String(HTMLAttributes.title ?? "Embedded video");
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-srn-embed": "",
        class:
          "border-hairline bg-mist my-3 border px-4 py-3 text-[0.8125rem] text-ink",
      }),
      `▶ ${PROVIDER_LABELS[provider] ?? "Embed"} — ${title}`,
    ];
  },

  addCommands() {
    return {
      setEmbed:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },
});
