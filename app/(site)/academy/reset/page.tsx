import type { Metadata } from "next";

import { Section, Container } from "@/components/ui/Section";
import { PageHeader } from "@/components/ui/PageHeader";
import { ResetPasswordForm } from "@/components/academy/ResetPasswordForm";

/* Sprint 6.1 — where the emailed reset link lands. The visitor arrives in a
 * short-lived Supabase recovery session, which is what authorises the password
 * change; there is nothing to gate here beyond that session existing, and the
 * action reports plainly when it has expired. */

export const metadata: Metadata = {
  title: "Set a new password",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  return (
    <>
      <PageHeader
        eyebrow="SRN Academy"
        title="Set a new password."
        lede="Choose a new password for your account."
      />
      <Section surface="paper">
        <Container>
          <div className="max-w-md">
            <ResetPasswordForm />
          </div>
        </Container>
      </Section>
    </>
  );
}
