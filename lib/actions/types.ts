/* Normalized result shape for every public form server action (§3.1).
 *
 * One shape for all forms so the client components render errors and success
 * the same way. `fieldErrors` keys match the form field `name`s, which is what
 * lets each <TextField error=...> light up the exact control that failed. A
 * top-level `formError` covers whole-form problems (rate limit, server fault).
 *
 * The honeypot case returns { ok: true } deliberately: a bot must not be able
 * to tell it was dropped, so it sees the same success a human would (§3.2). */

export type ActionState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | {
      status: "error";
      formError?: string;
      fieldErrors?: Record<string, string>;
    };

export const idle: ActionState = { status: "idle" };
