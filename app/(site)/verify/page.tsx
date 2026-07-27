import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { normaliseCode } from "@/lib/academy/certificates";
import { Section, Container } from "@/components/ui/Section";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/FormField";

/* Sprint 6.7 — the public verification entry point.
 *
 * A plain GET form, no JavaScript required: the people using this are employers
 * and funders on unfamiliar machines, and it must work everywhere. Submitting
 * lands on /verify/[code], which is the shareable, linkable result. */

export const metadata: Metadata = {
  title: "Verify a certificate",
  description:
    "Check that a Systematic Reviews Network certificate is genuine by entering its verification code.",
};

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  /* The form is a plain GET, so it arrives as ?code=. Redirect to the clean
     path, which is the version worth sharing or pasting into an email. An
     unparseable code still goes there and gets the same "we did not issue
     this" answer — refusing it here would only tell a guesser their format was
     wrong. */
  const { code } = await searchParams;
  if (code) {
    redirect(`/verify/${encodeURIComponent(normaliseCode(code) || code.trim())}`);
  }

  return (
    <>
      <PageHeader
        eyebrow="SRN Academy"
        title="Verify a certificate"
        lede="Enter the code printed on the certificate. We will tell you who it belongs to and whether it is still valid."
      />

      <Section surface="paper">
        <Container>
          <form action="/verify" method="get" className="max-w-lg">
            <TextField
              id="code"
              name="code"
              type="text"
              required
              autoComplete="off"
              spellCheck={false}
              label="Verification code"
              hint="It looks like SRN-ABCD-EFGH-JKMN. Capitals and hyphens do not matter."
              placeholder="SRN-"
            />
            <div className="mt-5">
              <Button type="submit">Check this certificate</Button>
            </div>
          </form>

          <p className="text-slate mt-8 max-w-lg leading-relaxed">
            Every certificate the Academy issues carries a code that is unique
            to one person and one course. If a code does not check out here, we
            did not issue it.
          </p>
        </Container>
      </Section>
    </>
  );
}
