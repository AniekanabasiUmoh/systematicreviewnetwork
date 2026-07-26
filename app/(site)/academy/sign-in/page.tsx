import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Section, Container } from "@/components/ui/Section";
import { PageHeader } from "@/components/ui/PageHeader";
import { SignInForm } from "@/components/academy/SignInForm";
import { getLearner } from "@/lib/academy/auth";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your SRN Academy account.",
};

export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  if (await getLearner()) redirect("/account");
  const { next } = await searchParams;

  return (
    <>
      <PageHeader
        eyebrow="SRN Academy"
        title="Sign in."
        lede="Pick up where you left off."
      />

      <Section surface="paper">
        <Container>
          <div className="max-w-md">
            <SignInForm next={next} />
            <p className="text-slate text-small mt-6">
              Don&apos;t have an account yet?{" "}
              <Link
                href="/academy/sign-up"
                className="text-ink font-semibold underline underline-offset-2"
              >
                Create one
              </Link>
              .
            </p>
            <p className="text-slate text-small mt-3">
              Staff sign in at{" "}
              <Link
                href="/admin/login"
                className="text-ink underline underline-offset-2"
              >
                the admin
              </Link>
              .
            </p>
          </div>
        </Container>
      </Section>
    </>
  );
}
