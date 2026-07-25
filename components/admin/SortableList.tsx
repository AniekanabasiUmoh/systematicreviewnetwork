"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormField";
import { reorderResource } from "@/lib/actions/admin-content";
import { idle } from "@/lib/actions/types";
import type { AdminResourceKey } from "@/lib/admin/resources";

type Item = { id: string; label: string };

export function SortableList({
  resource,
  initialItems,
}: {
  resource: AdminResourceKey;
  initialItems: Item[];
}) {
  const [items, setItems] = useState(initialItems);
  const [dragged, setDragged] = useState<string | null>(null);
  const [state, action, pending] = useActionState(reorderResource, idle);
  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    setItems((current) => {
      const next = [...current];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };
  return (
    <form action={action} className="border-hairline bg-paper border">
      <input type="hidden" name="resource" value={resource} />
      <input
        type="hidden"
        name="order"
        value={JSON.stringify(items.map((item) => item.id))}
      />
      <ol>
        {items.map((item, index) => (
          <li
            key={item.id}
            draggable
            onDragStart={() => setDragged(item.id)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              const from = items.findIndex((current) => current.id === dragged);
              if (from >= 0) move(from, index);
              setDragged(null);
            }}
            className="border-hairline flex items-center gap-3 border-b px-4 py-3 last:border-b-0"
          >
            <span className="text-slate text-small w-7">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="text-ink text-small flex-1 font-medium">
              {item.label}
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="md"
                disabled={index === 0}
                onClick={() => move(index, index - 1)}
              >
                Move up
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="md"
                disabled={index === items.length - 1}
                onClick={() => move(index, index + 1)}
              >
                Move down
              </Button>
            </div>
          </li>
        ))}
      </ol>
      <div className="border-hairline flex flex-wrap items-center justify-between gap-3 border-t p-4">
        {state.status !== "idle" ? (
          <FormMessage tone={state.status === "success" ? "success" : "error"}>
            {state.status === "success"
              ? state.message
              : (state.formError ?? "Could not save order.")}
          </FormMessage>
        ) : (
          <p className="text-slate text-small">
            Use Move up and Move down, or drag rows, to change the public order.
          </p>
        )}
        <Button disabled={pending}>{pending ? "Saving…" : "Save order"}</Button>
      </div>
    </form>
  );
}
