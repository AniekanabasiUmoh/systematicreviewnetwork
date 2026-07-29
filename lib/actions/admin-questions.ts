"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fieldErrorsFrom } from "@/lib/actions/schemas";
import { idle, type ActionState } from "@/lib/actions/types";
import { requireStaffAction } from "@/lib/admin/auth";
import { recordAudit } from "@/lib/admin/audit";
import { supabaseAdmin } from "@/lib/supabase/server";

/* Sprint 7.2 — staff defining questions on an event.
 *
 * Same step order as every other write path: role, parse, build the payload
 * field by field, write on the service role, revalidate, audit.
 *
 * The one rule with teeth: a question that has been ANSWERED is archived, never
 * deleted. Deleting it would leave answers in `registrations.answers` keyed to
 * an id nothing can name, which is both a broken export and a quiet data loss.
 */

function formValue(form: FormData, name: string) {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

const schema = z
  .object({
    event_id: z.string().trim().min(1),
    label: z
      .string()
      .trim()
      .min(1, "Write the question as the person registering will read it.")
      .max(200),
    help_text: z
      .string()
      .trim()
      .max(300)
      .optional()
      .transform((v) => (v ? v : undefined)),
    field_type: z.enum(["short_text", "long_text", "select", "checkbox"]),
    /* One option per line, the same convention as programmes' covers/for_who
       in §5.7 — no repeater widget, which is where form builders start to
       become products. */
    options: z
      .string()
      .optional()
      .transform((v) =>
        (v ?? "")
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
      ),
    required: z
      .string()
      .optional()
      .transform((v) => v === "on" || v === "true"),
  })
  .refine(
    (v) => v.field_type !== "select" || v.options.length >= 2,
    {
      message: "A choose-one question needs at least two options, one per line.",
      path: ["options"],
    },
  );

export async function saveEventQuestion(
  _prev: ActionState = idle,
  form: FormData,
): Promise<ActionState> {
  const auth = await requireStaffAction();
  if (!auth.ok) return auth.state;

  const parsed = schema.safeParse({
    event_id: formValue(form, "event_id"),
    label: formValue(form, "label"),
    help_text: formValue(form, "help_text"),
    field_type: formValue(form, "field_type"),
    options: formValue(form, "options"),
    required: formValue(form, "required"),
  });
  if (!parsed.success)
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };

  const data = parsed.data;
  const id = formValue(form, "id") || undefined;

  const payload = {
    event_id: data.event_id,
    label: data.label,
    help_text: data.help_text ?? null,
    field_type: data.field_type,
    // Options are meaningless for the other three types; store none.
    options: data.field_type === "select" ? data.options : [],
    required: data.required,
  };

  const table = supabaseAdmin.from("event_questions");
  const result = id
    ? await table.update(payload as never).eq("id", id).select("id").single()
    : await table
        .insert({ ...payload, sort_order: await nextSortOrder(data.event_id) } as never)
        .select("id")
        .single();

  if (result.error) {
    console.error("[questions] save failed:", result.error.message);
    return { status: "error", formError: "We could not save that question." };
  }

  revalidatePath(`/admin/events`);
  void recordAudit(
    auth.user,
    id ? "update" : "create",
    "event_questions",
    String(result.data.id),
    data.label,
  );
  return { status: "success", message: "Question saved." };
}

async function nextSortOrder(eventId: string): Promise<number> {
  const { data } = await supabaseAdmin
    .from("event_questions")
    .select("sort_order")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: false })
    .limit(1);
  const top = (data ?? [])[0] as { sort_order: number } | undefined;
  return (top?.sort_order ?? -1) + 1;
}

export async function deleteEventQuestion(
  _prev: ActionState = idle,
  form: FormData,
): Promise<ActionState> {
  const auth = await requireStaffAction();
  if (!auth.ok) return auth.state;

  const id = formValue(form, "id");
  const { data: question } = await supabaseAdmin
    .from("event_questions")
    .select("id, label, event_id")
    .eq("id", id)
    .maybeSingle();
  if (!question)
    return { status: "error", formError: "That question no longer exists." };

  /* Has anyone answered it? Counting in the database rather than in memory:
     an event with two thousand registrations should not be pulled into a
     server action to answer one yes/no question. */
  const { count } = await supabaseAdmin
    .from("registrations")
    .select("id", { count: "exact", head: true })
    .eq("event_id", question.event_id)
    .not(`answers->>${id}`, "is", null);

  if ((count ?? 0) > 0) {
    /* Archive instead. The counted refusal is the §5.7/§5.12 pattern: say how
       many people it affects and name the alternative in the same breath. */
    const { error } = await supabaseAdmin
      .from("event_questions")
      .update({ archived_at: new Date().toISOString() } as never)
      .eq("id", id);
    if (error)
      return { status: "error", formError: "We could not archive that question." };

    revalidatePath("/admin/events");
    void recordAudit(
      auth.user,
      "update",
      "event_questions",
      id,
      `Archived "${question.label}" (${count} answers)`,
    );
    return {
      status: "success",
      message: `${count} ${count === 1 ? "person has" : "people have"} answered this, so it has been archived rather than deleted. It no longer appears on the form, and their answers stay in the export.`,
    };
  }

  const { error } = await supabaseAdmin
    .from("event_questions")
    .delete()
    .eq("id", id);
  if (error)
    return { status: "error", formError: "We could not delete that question." };

  revalidatePath("/admin/events");
  void recordAudit(auth.user, "delete", "event_questions", id, question.label);
  return { status: "success", message: "Question deleted." };
}

export async function reorderEventQuestions(
  _prev: ActionState = idle,
  form: FormData,
): Promise<ActionState> {
  const auth = await requireStaffAction();
  if (!auth.ok) return auth.state;

  const ids = formValue(form, "order")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (ids.length === 0)
    return { status: "error", formError: "Nothing to reorder." };

  for (const [index, id] of ids.entries()) {
    await supabaseAdmin
      .from("event_questions")
      .update({ sort_order: index } as never)
      .eq("id", id);
  }

  revalidatePath("/admin/events");
  void recordAudit(
    auth.user,
    "reorder",
    "event_questions",
    null,
    `Reordered ${ids.length} questions`,
  );
  return { status: "success", message: "Order saved." };
}
