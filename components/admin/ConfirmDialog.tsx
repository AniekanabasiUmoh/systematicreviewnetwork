"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function ConfirmDialog({
  label,
  message,
  children,
}: {
  label: string;
  message: string;
  children: (confirm: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {children(() => setOpen(true))}
      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={label}
          className="bg-ink/40 fixed inset-0 z-50 grid place-items-center p-4"
        >
          <div className="border-hairline bg-paper w-full max-w-md border p-6 shadow-xl">
            <h2 className="text-display text-ink text-h3">{label}</h2>
            <p className="text-slate text-small mt-3">{message}</p>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setOpen(false);
                  const form = document.getElementById(
                    "admin-confirm-form",
                  ) as HTMLFormElement | null;
                  form?.requestSubmit();
                }}
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
