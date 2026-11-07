import PublicPage from "@/components/public/ResourcesPage";
import { notFound } from "next/navigation";
import { parseFilterKey } from "@/lib/public-filters";
export { metadata } from "@/components/public/ResourcesPage";

export const dynamic = "force-static";
export const revalidate = 300;
export function generateStaticParams() {
  return [];
}

export default async function Page({
  params,
}: {
  params: Promise<{ filters: string }>;
}) {
  const { filters: key } = await params;
  const filters = parseFilterKey(key, ["category"]);
  if (!filters) notFound();
  return <PublicPage filters={filters} />;
}
