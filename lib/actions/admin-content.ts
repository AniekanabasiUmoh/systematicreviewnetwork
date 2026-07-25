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

  /* §5.7 — a programme with applications is retired, never hard-deleted:
     deleting it would orphan people's applications. The FK is ON DELETE
     RESTRICT, so the database refuses anyway; this check exists to say so in
     plain language, with the count, instead of surfacing a constraint error. */
  if (resource.key === "programmes") {
    const { count } = await supabaseAdmin
      .from("applications")
      .select("id", { count: "exact", head: true })
      .eq("programme_id", id);
    if ((count ?? 0) > 0) {
      return {
        status: "error",
        formError: `This programme has ${count} application${count === 1 ? "" : "s"} against it, so it cannot be deleted. Retire it instead — it will disappear from the public site and the applications will be kept.`,
      };
    }
  }

  /* §5.12 — same shape for events and registrations: the FK is already ON
     DELETE RESTRICT (Sprint 5.6), so the database refuses regardless; this
     pre-check exists to say so in plain language, with a count, before the
     click rather than only in the error after it. */
  if (resource.key === "events") {
    const { count } = await supabaseAdmin
      .from("registrations")
      .select("id", { count: "exact", head: true })
      .eq("event_id", id);
    if ((count ?? 0) > 0) {
      return {
        status: "error",
        formError: `This event has ${count} registration${count === 1 ? "" : "s"} against it, so it cannot be deleted. Archive it instead — it will disappear from the public site and the registrations will be kept.`,
      };
    }
  }

  const previous = await getRow(resource, id);
  const { error } = await supabaseAdmin
    .from(resource.table)
    .delete()
    .eq("id", id);
  if (error) {
    // Backstop: the count check above and the delete are not in one
    // transaction, so a registration could land in the gap between them.
    // 23503 = foreign_key_violation.
    if (error.code === "23503") {
      return {
        status: "error",
        formError:
          "This item is referenced by other records, so it cannot be deleted. Archive it instead.",
      };
    }
    return { status: "error", formError: "We could not delete this item." };
  }
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

/**
 * §5.7 — retire a programme: it leaves the public site but every application
 * made against it is kept and still shows the title it was submitted under.
 * The alternative (delete) is refused for any programme with applications.
 */
export async function retireProgramme(
  _prev: ActionState = idle,
  form: FormData,
): Promise<ActionState> {
  const auth = await requireStaffAction();
  if (!auth.ok) return auth.state;

  const id = formValue(form, "id");
  if (!id)
    return { status: "error", formError: "That programme could not be found." };

  const resource = getResource("programmes");
  if (!resource)
    return { status: "error", formError: "That content type is not available." };

  const previous = await getRow(resource, id);
  const { error } = await supabaseAdmin
    .from("programmes")
    .update({ archived_at: new Date().toISOString(), status: "draft" })
    .eq("id", id);
  if (error)
    return { status: "error", formError: "We could not retire this programme." };

  const slug = String(previous?.slug ?? "");
  revalidate(resource, slug, slug);
  void recordAudit(
    auth.user,
    "status_change",
    "programmes",
    id,
    `Retired ${previous?.title ?? "programme"}`,
  );
  return {
    status: "success",
    message: "Programme retired. It is no longer on the public site.",
  };
}

/**
 * §5.12 — archive an event: it leaves the public site (the events RLS policy
 * requires archived_at is null — 20260726000005) but every registration made
 * against it is kept intact, unlike a delete which the FK now refuses anyway.
 */
export async function archiveResource(
  _prev: ActionState = idle,
  form: FormData,
): Promise<ActionState> {
  const resource = getResource(formValue(form, "resource"));
  const id = formValue(form, "id");
  if (!resource || !id || resource.key !== "events")
    return { status: "error", formError: "That item cannot be archived." };

  const auth = await requireStaffAction();
  if (!auth.ok) return auth.state;

  const previous = await getRow(resource, id);
  const { error } = await supabaseAdmin
    .from("events")
    .update({ archived_at: new Date().toISOString(), status: "draft" })
    .eq("id", id);
  if (error)
    return { status: "error", formError: "We could not archive this event." };

  const slug = String(previous?.slug ?? "");
  revalidate(resource, slug, slug);
  void recordAudit(
    auth.user,
    "status_change",
    "events",
    id,
    `Archived ${previous?.title ?? "event"}`,
  );
  return {
    status: "success",
    message: "Event archived. It is no longer on the public site; registrations are kept.",
  };
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
