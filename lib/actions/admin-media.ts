"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { slugify } from "@/lib/actions/admin-schemas";
import { fieldErrorsFrom } from "@/lib/actions/schemas";
import { type ActionState } from "@/lib/actions/types";
import { requireStaffAction } from "@/lib/admin/auth";
import { recordAudit } from "@/lib/admin/audit";
import { supabaseAdmin } from "@/lib/supabase/server";
import { z } from "zod";

const MAX_BYTES = 8 * 1024 * 1024;

const mediaSchema = z.object({
  alt_text: z
    .string()
    .trim()
    .min(1, "Describe this image for people who cannot see it.")
    .max(500),
  width: z.coerce.number().int().positive().optional(),
  height: z.coerce.number().int().positive().optional(),
});

function imageType(bytes: Uint8Array) {
  const starts = (...values: number[]) =>
    values.every((value, index) => bytes[index] === value);
  if (starts(0xff, 0xd8, 0xff)) return { mime: "image/jpeg", ext: "jpg" };
  if (starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))
    return { mime: "image/png", ext: "png" };
  if (starts(0x47, 0x49, 0x46, 0x38)) return { mime: "image/gif", ext: "gif" };
  if (
    starts(0x52, 0x49, 0x46, 0x46) &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { mime: "image/webp", ext: "webp" };
  }
  return null;
}

function safeBaseName(name: string) {
  const plain = name.replace(/\.[^.]+$/, "");
  return slugify(plain).slice(0, 80) || "image";
}

export async function uploadMedia(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const auth = await requireStaffAction();
  if (!auth.ok) return auth.state;
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0)
    return {
      status: "error",
      fieldErrors: { file: "Choose an image to upload." },
    };
  if (file.size > MAX_BYTES)
    return {
      status: "error",
      fieldErrors: { file: "Choose an image smaller than 8 MB." },
    };

  const parsed = mediaSchema.safeParse({
    alt_text: form.get("alt_text"),
    width: form.get("width") || undefined,
    height: form.get("height") || undefined,
  });
  if (!parsed.success)
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = imageType(bytes);
  if (!type)
    return {
      status: "error",
      fieldErrors: {
        file: "Use a JPEG, PNG, GIF, or WebP image. SVG files are not accepted.",
      },
    };

  const now = new Date();
  const path = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${safeBaseName(file.name)}-${randomUUID().slice(0, 8)}.${type.ext}`;
  const { error: uploadError } = await supabaseAdmin.storage
    .from("media")
    .upload(path, bytes, { contentType: type.mime, upsert: false });
  if (uploadError)
    return { status: "error", formError: "We could not upload that image." };

  const { data: publicData } = supabaseAdmin.storage
    .from("media")
    .getPublicUrl(path);
  const { data, error: insertError } = await supabaseAdmin
    .from("media")
    .insert({
      storage_path: path,
      file_name: file.name.slice(0, 255),
      mime_type: type.mime,
      size_bytes: file.size,
      width: parsed.data.width,
      height: parsed.data.height,
      alt_text: parsed.data.alt_text,
    })
    .select("id")
    .single();
  if (insertError) {
    await supabaseAdmin.storage.from("media").remove([path]);
    return {
      status: "error",
      formError: "We could not record that image, so the upload was removed.",
    };
  }

  void recordAudit(
    auth.user,
    "create",
    "media",
    data.id,
    `Uploaded ${file.name}`,
  );
  revalidatePath("/admin/media");
  return {
    status: "success",
    message: `Image uploaded: ${publicData.publicUrl}`,
  };
}

async function usageCount(url: string) {
  const directChecks = [
    supabaseAdmin
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("banner_url", url),
    supabaseAdmin
      .from("news")
      .select("id", { count: "exact", head: true })
      .eq("featured_image_url", url),
    supabaseAdmin
      .from("resources")
      .select("id", { count: "exact", head: true })
      .eq("thumbnail_url", url),
    supabaseAdmin
      .from("team_members")
      .select("id", { count: "exact", head: true })
      .eq("photo_url", url),
    supabaseAdmin
      .from("testimonials")
      .select("id", { count: "exact", head: true })
      .eq("photo_url", url),
    supabaseAdmin
      .from("partners")
      .select("id", { count: "exact", head: true })
      .eq("logo_url", url),
    supabaseAdmin
      .from("homepage")
      .select("id", { count: "exact", head: true })
      .eq("hero_image_url", url),
  ];
  const richChecks = [
    supabaseAdmin
      .from("events")
      .select("id", { count: "exact", head: true })
      .filter("description_rich::text", "ilike", `%${url}%`),
    supabaseAdmin
      .from("news")
      .select("id", { count: "exact", head: true })
      .filter("body_rich::text", "ilike", `%${url}%`),
    supabaseAdmin
      .from("resources")
      .select("id", { count: "exact", head: true })
      .filter("body_rich::text", "ilike", `%${url}%`),
    supabaseAdmin
      .from("pages")
      .select("id", { count: "exact", head: true })
      .filter("body_rich::text", "ilike", `%${url}%`),
  ];
  const results = await Promise.all([...directChecks, ...richChecks]);
  return results.reduce((total, result) => total + (result.count ?? 0), 0);
}

export async function deleteMedia(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const auth = await requireStaffAction();
  if (!auth.ok) return auth.state;
  const id = String(form.get("id") ?? "");
  if (!id)
    return {
      status: "error",
      formError: "That image could not be identified.",
    };
  const { data: row } = await supabaseAdmin
    .from("media")
    .select("id, storage_path")
    .eq("id", id)
    .maybeSingle();
  if (!row)
    return { status: "error", formError: "That image no longer exists." };
  const { data: publicData } = supabaseAdmin.storage
    .from("media")
    .getPublicUrl(row.storage_path);
  const used = await usageCount(publicData.publicUrl);
  if (used)
    return {
      status: "error",
      formError: `This image is used on ${used} page${used === 1 ? "" : "s"}. Replace it there first.`,
    };
  const { error: storageError } = await supabaseAdmin.storage
    .from("media")
    .remove([row.storage_path]);
  if (storageError)
    return {
      status: "error",
      formError: "We could not remove the uploaded file.",
    };
  const { error: dbError } = await supabaseAdmin
    .from("media")
    .delete()
    .eq("id", id);
  if (dbError)
    return {
      status: "error",
      formError:
        "The file was removed but its library record could not be deleted. Please contact support.",
    };
  void recordAudit(auth.user, "delete", "media", id, row.storage_path);
  revalidatePath("/admin/media");
  return { status: "success", message: "Image deleted." };
}
