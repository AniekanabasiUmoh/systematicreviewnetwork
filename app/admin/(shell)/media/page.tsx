import Image from "next/image";
import { requireStaff } from "@/lib/admin/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { MediaUploadForm } from "@/components/admin/MediaUploadForm";
import { DeleteMediaButton } from "@/components/admin/DeleteMediaButton";

export const dynamic = "force-dynamic";

export default async function AdminMediaPage() {
  await requireStaff();
  const { data } = await supabaseAdmin
    .from("media")
    .select("id, storage_path, file_name, alt_text, width, height, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  return (
    <>
      <AdminPageHeader
        title="Media library"
        description="Upload real SRN images with alternative text, then use them across the site."
      />
      <MediaUploadForm />
      <section className="mt-8">
        <h2 className="text-display text-ink text-h3">Recent images</h2>
        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {(data ?? []).map((item) => {
            const src = `${base}/storage/v1/object/public/media/${item.storage_path}`;
            return (
              <article
                key={item.id}
                className="border-hairline bg-paper overflow-hidden border"
              >
                <Image
                  src={src}
                  alt=""
                  width={item.width ?? 800}
                  height={item.height ?? 600}
                  className="h-40 w-full object-cover"
                />
                <div className="p-4">
                  <p className="text-ink text-small font-medium">
                    {item.alt_text}
                  </p>
                  <p className="text-slate mt-1 truncate text-[0.75rem]">
                    {item.file_name}
                  </p>
                  <DeleteMediaButton id={item.id} name={item.file_name} />
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}
