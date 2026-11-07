import PublicPage from "@/components/public/NewsPage";
import { notFound } from "next/navigation";
import { parseFilterKey } from "@/lib/public-filters";
export { metadata } from "@/components/public/NewsPage";

export const dynamic = "force-static";
export const revalidate = 30;
export function generateStaticParams() {
  return [];
}

export default async function Page({
  params,
}: {
  params: Promise<{ filters: string }>;
}) {
  const { filters: key } = await params;
  const filters = parseFilterKey(key, ["view", "type"]);
  if (!filters) notFound();
  return <PublicPage filters={filters} />;
}
