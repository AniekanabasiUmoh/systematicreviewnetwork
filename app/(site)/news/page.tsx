import PublicPage from "@/components/public/NewsPage";
export { metadata } from "@/components/public/NewsPage";

// Public anonymous content only. Private forms and actions stay dynamic.
export const dynamic = "force-static";
export const revalidate = 30;

export default function Page() {
  return <PublicPage />;
}
