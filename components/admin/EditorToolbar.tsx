"use client";

import type { Editor } from "@tiptap/react";
import { Button } from "@/components/ui/Button";

export function EditorToolbar({
  editor,
  onImage,
  onEmbed,
}: {
  editor: Editor;
  onImage: () => void;
  onEmbed: () => void;
}) {
  const action = (run: () => void) => () => run();
  const link = () => {
    const href = window.prompt("Enter an https:// or mailto: link");
    if (href)
      editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
  };
  return (
    <div className="border-hairline bg-mist flex flex-wrap gap-2 border border-b-0 p-2">
      <Button
        type="button"
        variant="secondary"
        size="md"
        onClick={action(() =>
          editor.chain().focus().toggleHeading({ level: 2 }).run(),
        )}
      >
        H2
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="md"
        onClick={action(() =>
          editor.chain().focus().toggleHeading({ level: 3 }).run(),
        )}
      >
        H3
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="md"
        onClick={action(() => editor.chain().focus().toggleBold().run())}
      >
        Bold
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="md"
        onClick={action(() => editor.chain().focus().toggleItalic().run())}
      >
        Italic
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="md"
        onClick={action(() => editor.chain().focus().toggleBulletList().run())}
      >
        Bullets
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="md"
        onClick={action(() => editor.chain().focus().toggleOrderedList().run())}
      >
        Numbers
      </Button>
      <Button type="button" variant="secondary" size="md" onClick={link}>
        Link
      </Button>
      <Button type="button" variant="secondary" size="md" onClick={onImage}>
        Image
      </Button>
      <Button type="button" variant="secondary" size="md" onClick={onEmbed}>
        Video
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="md"
        onClick={action(() => editor.chain().focus().toggleBlockquote().run())}
      >
        Quote
      </Button>
    </div>
  );
}
