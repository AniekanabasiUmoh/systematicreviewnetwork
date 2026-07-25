import Link from "next/link";
import { ForgotPasswordForm } from "@/components/admin/ForgotPasswordForm";

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-full items-center justify-center px-6 py-16">
      <div className="w-full max-w-[400px]">
        <div className="border-hairline bg-paper border p-8">
          <p className="text-display-tight text-brand text-[1.375rem] tracking-[-0.02em]">
            SRN
          </p>
          <h1 className="text-h3 text-ink mt-6 font-semibold">
            Reset your password
          </h1>
          <p className="text-slate text-small mt-1.5">
            Enter your email and we&apos;ll send a link to set a new password.
          </p>

          <div className="mt-7">
            <ForgotPasswordForm />
          </div>

          <p className="text-slate text-small mt-6">
            <Link href="/admin/login" className="text-ink font-semibold underline underline-offset-2">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
