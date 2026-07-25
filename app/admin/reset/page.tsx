import { SetPasswordForm } from "@/components/admin/SetPasswordForm";

export const dynamic = "force-dynamic";

/* Sprint 5.10 — this page sits OUTSIDE the (shell) route group deliberately:
 * a person arriving here from the reset email is mid-recovery, not signed in
 * as staff in the normal sense, and should not see the admin shell/nav. */

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-full items-center justify-center px-6 py-16">
      <div className="w-full max-w-[400px]">
        <div className="border-hairline bg-paper border p-8">
          <p className="text-display-tight text-brand text-[1.375rem] tracking-[-0.02em]">
            SRN
          </p>
          <h1 className="text-h3 text-ink mt-6 font-semibold">
            Set a new password
          </h1>
          <p className="text-slate text-small mt-1.5">
            Choose a new password for your account.
          </p>

          <div className="mt-7">
            <SetPasswordForm />
          </div>
        </div>
      </div>
    </div>
  );
}
