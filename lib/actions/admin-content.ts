"use server";

import { revalidatePath } from "next/cache";
import { fieldErrorsFrom } from "@/lib/actions/schemas";
import { idle, type ActionState } from "@/lib/actions/types";
import { requireAdminAction, requireStaffAction } from "@/lib/admin/auth";
import { recordAudit } from "@/lib/admin/audit";
import { getResource } from "@/lib/admin/resources";
import { getRow, slugTaken } from "@/lib/admin/queries";
import { sanitizeRichText } from "@/lib/admin/richtext";
import { supabaseAdmin } from "@/lib/supabase/server";

function formValue(form: FormData, name: string) {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

function publicPath(resource: string, slug: string) {
  if (resource === "events") return `/news/events/${slug}`;
  if (resource === "news") return `/news/${slug}`;
  if (resource === "resources") return `/resources/${slug}`;
  if (resource === "pages") return `/${slug}`;
  return null;
}

function revalidate(
  resource: { revalidate: ReadonlyArray<string> },
  oldSlug?: string,
  newSlug?: string,
) {
  for (const path of resource.revalidate) revalidatePath(path);
  for (const slug of [oldSlug, newSlug]) {
    if (!slug) continue;
    const path = publicPath((resource as { key?: string }).key ?? "", slug);
    if (path) revalidatePath(path);
  }
}

/** Saves the descriptor-approved fields only; FormData is never mass-assigned. */
export async function saveResource(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const resource = getResource(formValue(form, "resource"));
  if (!resource)
    return {
      status: "error",
      formError: "That content type is not available.",
    };

  const auth = resource.adminOnly
    ? await requireAdminAction()
    : await requireStaffAction();
  if (!auth.ok) return auth.state;

  const raw = Object.fromEntries(
    resource.fields.map((field) => [field.name, formValue(form, field.name)]),
  );
  const parsed = resource.schema.safeParse(raw);
  if (!parsed.success)
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };

  const id = formValue(form, "id") || undefined;
  if (resource.slugColumn) {
    const value = parsed.data as Record<string, unknown>;
    const candidate = value[resource.slugColumn];
    if (
      typeof candidate === "string" &&
      (await slugTaken(resource, candidate, id))
    ) {
      return {
        status: "error",
        fieldErrors: {
          [resource.slugColumn]: "That URL slug is already in use.",
        },
      };
    }
  }

  const payload: Record<string, unknown> = {
    ...(parsed.data as Record<string, unknown>),
  };
  for (const field of resource.fields) {
    if (field.kind !== "richtext" || !payload[field.name]) continue;
    const safe = sanitizeRichText(payload[field.name]);
    if (!safe)
      return {
        status: "error",
        fieldErrors: {
          [field.name]: "This editor content contains unsupported items.",
        },
      };
    payload[field.name] = safe;
  }
  if (resource.singleton) payload.id = true;

  const previous = id ? await getRow(resource, id) : null;
  const table = supabaseAdmin.from(resource.table);
  let result;
  if (resource.singleton) {
    result = await table
      .upsert(payload as never, { onConflict: "id" })
      .select("id")
      .single();
  } else if (id) {
    result = await table
      .update(payload as never)
      .eq("id", id)
      .select("id")
      .single();
  } else {
    result = await table
      .insert(payload as never)
      .select("id")
      .single();
  }
  if (result.error)
    return {
      status: "error",
      formError:
        "We could not save this item. Please check the values and try again.",
    };

  const oldSlug = resource.slugColumn
    ? String(previous?.[resource.slugColumn] ?? "")
    : undefined;
  const newSlug = resource.slugColumn
    ? String(payload[resource.slugColumn] ?? "")
    : undefined;
  revalidate(resource, oldSlug, newSlug);
  void recordAudit(
    auth.user,
    id ? "update" : "create",
    resource.key,
    String(result.data.id),
    String(payload.title ?? payload.name ?? resource.labelSingular),
  );
  return { status: "success", message: `${resource.labelSingular} saved.` };
}

export async function deleteResource(
  _prev: ActionState = idle,
  form: FormData,
): Promise<ActionState> {
  const resource = getResource(formValue(form, "resource"));
  const id = formValue(form, "id");
  if (!resource || !id || resource.singleton)
    return { status: "error", formError: "That item cannot be deleted." };
  const auth = resource.adminOnly
    ? await requireAdminAction()
    : await requireStaffAction();
  if (!auth.ok) return auth.state;

  const previous = await getRow(resource, id);
  const { error } = await supabaseAdmin
    .from(resource.table)
    .delete()
    .eq("id", id);
  if (error)
    return { status: "error", formError: "We could not delete this item." };
  revalidate(
    resource,
    resource.slugColumn
      ? String(previous?.[resource.slugColumn] ?? "")
      : undefined,
  );
  void recordAudit(
    auth.user,
    "delete",
    resource.key,
    id,
    String(previous?.title ?? previous?.name ?? resource.labelSingular),
  );
  return { status: "success", message: `${resource.labelSingular} deleted.` };
}

export async function setPublishStatus(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const resource = getResource(formValue(form, "resource"));
  const id = formValue(form, "id");
  const status = formValue(form, "status");
  if (
    !resource?.publishable ||
    !id ||
    (status !== "draft" && status !== "published")
  ) {
    return {
      status: "error",
      formError: "That publishing request is not valid.",
    };
  }
  const auth = await requireStaffAction();
  if (!auth.ok) return auth.state;
  const previous = await getRow(resource, id);
  const { error } = await supabaseAdmin
    .from(resource.table)
    .update({ status } as never)
    .eq("id", id);
  if (error)
    return {
      status: "error",
      formError: "We could not change the publishing status.",
    };
  const slug = resource.slugColumn
    ? String(previous?.[resource.slugColumn] ?? "")
    : undefined;
  revalidate(resource, slug, slug);
  void recordAudit(
    auth.user,
    status === "published" ? "publish" : "unpublish",
    resource.key,
    id,
    String(previous?.title ?? resource.labelSingular),
  );
  return {
    status: "success",
    message: status === "published" ? "Published." : "Moved back to draft.",
  };
}

export async function reorderResource(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const resource = getResource(formValue(form, "resource"));
  const orderRaw = formValue(form, "order");
  if (!resource?.sortColumn)
    return { status: "error", formError: "This list cannot be reordered." };
  const auth = await requireStaffAction();
  if (!auth.ok) return auth.state;
  let ids: unknown;
  try {
    ids = JSON.parse(orderRaw);
  } catch {
    return { status: "error", formError: "The new order was not valid." };
  }
  if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string"))
    return { status: "error", formError: "The new order was not valid." };
  const updates = ids.map((id, index) =>
    supabaseAdmin
      .from(resource.table)
      .update({ [resource.sortColumn!]: index } as never)
      .eq("id", id),
  );
  const results = await Promise.all(updates);
  if (results.some((result) => result.error))
    return { status: "error", formError: "We could not save the new order." };
  revalidate(resource);
  void recordAudit(
    auth.user,
    "reorder",
    resource.key,
    null,
    `${ids.length} items reordered`,
  );
  return { status: "success", message: "Order saved." };
}
