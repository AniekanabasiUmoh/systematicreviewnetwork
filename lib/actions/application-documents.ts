"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fieldErrorsFrom } from "@/lib/actions/schemas";
import { slugify } from "@/lib/actions/admin-schemas";
import { idle, type ActionState } from "@/lib/actions/types";
import { requireVerifiedLearnerAction } from "@/lib/academy/auth";
import { getMyApplication } from "@/lib/academy/applications";
import { supabaseAdmin } from "@/lib/supabase/server";

/* Sprint 7.1 — attaching a CV or protocol to your own application.
 *
 * Same shape as the 6.3 material upload and the 6.6 assignment upload: check
 * ownership, sniff the type against an allowlist, write to a PRIVATE bucket,
 * record the row, and remove the object if the row fails so nothing is
 * orphaned.
 *
 * The allowlist is narrower than the course-material one. This is a document
 * somebody is asking a reviewer to read, not a resource pack — a zip has no
 * business here, and neither does a spreadsheet. */

const MAX_BYTES = 10 * 1024 * 1024;

const ALLOWED: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  odt: "application/vnd.oasis.opendocument.text",
  rtf: "application/rtf",
  txt: "text/plain",
};

const schema = z.object({
  application_id: z.string().trim().min(1),
  kind: z.enum(["cv", "protocol", "reference", "other"]),
});

export async function uploadApplicationDocument(
  _prev: ActionState = idle,
  form: FormData,
): Promise<ActionState> {
  const auth = await requireVerifiedLearnerAction();
  if (!auth.ok) return auth.state;

  const parsed = schema.safeParse({
    application_id: String(form.get("application_id") ?? ""),
    kind: String(form.get("kind") ?? "other"),
  });
  if (!parsed.success)
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };

  /* Ownership first, before anything is read from disk. The application id in
     the form is a claim about whose application this is. */
  const application = await getMyApplication(
    auth.learner,
    parsed.data.application_id,
  );
  if (!application)
    return {
      status: "error",
      formError: "That application is not one of yours.",
    };

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0)
    return { status: "error", fieldErrors: { file: "Choose a file to upload." } };
  if (file.size > MAX_BYTES)
    return {
      status: "error",
      fieldErrors: { file: "Choose a file smaller than 10 MB." },
    };

  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  const mime = ALLOWED[ext];
  if (!mime)
    return {
      status: "error",
      fieldErrors: {
        file: `We cannot accept .${ext || "that"} files. Use a PDF, Word, ODT, RTF or plain text file.`,
      },
    };

  /* An unguessable path segment. The bucket is private anyway, so this is belt
     and braces — but it means a future misconfiguration is not immediately
     exploitable by anyone who knows a name. */
  const base = slugify(file.name.replace(/\.[^.]+$/, "")).slice(0, 60) || "document";
  const path = `${application.id}/${base}-${randomUUID().slice(0, 8)}.${ext}`;

  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: uploadError } = await supabaseAdmin.storage
    .from("application-documents")
    .upload(path, bytes, { contentType: mime, upsert: false });
  if (uploadError) {
    console.error("[application docs] upload failed:", uploadError.message);
    return { status: "error", formError: "We could not upload that file." };
  }

  const { error } = await supabaseAdmin.from("application_documents").insert({
    application_id: application.id,
    storage_path: path,
    file_name: file.name.slice(0, 255),
    mime_type: mime,
    size_bytes: file.size,
    kind: parsed.data.kind,
  } as never);

  if (error) {
    await supabaseAdmin.storage.from("application-documents").remove([path]);
    console.error("[application docs] insert failed:", error.message);
    return {
      status: "error",
      formError: "We could not record that file, so the upload was removed.",
    };
  }

  revalidatePath("/account/applications");
  return {
    status: "success",
    message: "Uploaded. Your reviewer can see it now.",
  };
}

export async function deleteApplicationDocument(
  _prev: ActionState = idle,
  form: FormData,
): Promise<ActionState> {
  const auth = await requireVerifiedLearnerAction();
  if (!auth.ok) return auth.state;

  const id = String(form.get("id") ?? "");
  const { data: doc } = await supabaseAdmin
    .from("application_documents")
    .select("id, application_id, storage_path, file_name")
    .eq("id", id)
    .maybeSingle();
  if (!doc)
    return { status: "error", formError: "That file no longer exists." };

  const owned = await getMyApplication(auth.learner, doc.application_id);
  if (!owned)
    return { status: "error", formError: "That file is not one of yours." };

  const { error: storageError } = await supabaseAdmin.storage
    .from("application-documents")
    .remove([doc.storage_path]);
  if (storageError)
    return { status: "error", formError: "We could not remove that file." };

  const { error } = await supabaseAdmin
    .from("application_documents")
    .delete()
    .eq("id", id);
  if (error)
    return {
      status: "error",
      formError:
        "The file was removed but its record could not be deleted. Please tell us.",
    };

  revalidatePath("/account/applications");
  return { status: "success", message: `${doc.file_name} removed.` };
}
