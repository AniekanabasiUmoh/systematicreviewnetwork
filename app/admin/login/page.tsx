import { LoginForm } from "@/components/admin/LoginForm";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="flex min-h-full items-center justify-center px-6 py-16">
      <div className="w-full max-w-[400px]">
        <div className="border-hairline bg-paper border p-8">
          <p className="text-display-tight text-brand text-[1.375rem] tracking-[-0.02em]">
            SRN
          </p>
          <h1 className="text-h3 text-ink mt-6 font-semibold">Sign in</h1>
          <p className="text-slate text-small mt-1.5">
            Staff access to the Systematic Reviews Network site.
          </p>

          <div className="mt-7">
            <LoginForm next={next} />
          </div>
        </div>
      </div>
    </div>
  );
}
