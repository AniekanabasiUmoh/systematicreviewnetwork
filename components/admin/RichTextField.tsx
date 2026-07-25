"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { useState } from "react";
import { EditorToolbar } from "./EditorToolbar";
import { MediaPicker, type MediaItem } from "./MediaPicker";

export function RichTextField({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue?: unknown;
}) {
  const [json, setJson] = useState(() =>
    JSON.stringify(defaultValue ?? { type: "doc", content: [] }),
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        codeBlock: false,
        horizontalRule: false,
        strike: false,
      }),
      Link.configure({
        openOnClick: false,
        protocols: ["http", "https", "mailto"],
      }),
      Image.configure({ allowBase64: false }),
    ],
    content: defaultValue ?? { type: "doc", content: [] },
    onUpdate: ({ editor }) => setJson(JSON.stringify(editor.getJSON())),
    editorProps: {
      attributes: {
        class:
          "bg-paper text-ink min-h-48 border-hairline border p-4 outline-none",
      },
    },
  });
  return (
    <div className="md:col-span-2">
      <label className="text-ink text-small block font-medium">{label}</label>
      <input type="hidden" name={name} value={json} />
      {editor ? (
        <>
          <div className="mt-2">
            <EditorToolbar
              editor={editor}
              onImage={() => setPickerOpen(true)}
            />
            <EditorContent editor={editor} />
          </div>
          <MediaPicker
            open={pickerOpen}
            onClose={() => setPickerOpen(false)}
            onSelect={(item: MediaItem) =>
              editor
                .chain()
                .focus()
                .setImage({ src: item.url, alt: item.alt_text })
                .run()
            }
          />
        </>
      ) : (
        <p className="text-slate text-small mt-2">Loading editor…</p>
      )}
    </div>
  );
}
