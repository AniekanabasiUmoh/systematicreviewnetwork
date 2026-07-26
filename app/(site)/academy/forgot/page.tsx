import type { Metadata } from "next";
import Link from "next/link";

import { Section, Container } from "@/components/ui/Section";
import { PageHeader } from "@/components/ui/PageHeader";
import { ForgotPasswordForm } from "@/components/academy/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Reset your password",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return (
    <>
      <PageHeader
        eyebrow="SRN Academy"
        title="Reset your password."
        lede="Enter the email address on your account and we'll send you a link to set a new password."
      />
      <Section surface="paper">
        <Container>
          <div className="max-w-md">
            <ForgotPasswordForm />
            <p className="text-slate text-small mt-6">
              <Link
                href="/academy/sign-in"
                className="text-ink underline underline-offset-2"
              >
                Back to sign in
              </Link>
            </p>
          </div>
        </Container>
      </Section>
    </>
  );
}
