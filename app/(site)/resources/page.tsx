import PublicPage from "@/components/public/ResourcesPage";
export { metadata } from "@/components/public/ResourcesPage";

// Public anonymous content only. Private forms and actions stay dynamic.
export const dynamic = "force-static";
export const revalidate = 300;

export default function Page() {
  return <PublicPage />;
}
