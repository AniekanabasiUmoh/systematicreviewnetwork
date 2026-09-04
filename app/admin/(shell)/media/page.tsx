import { requireStaff } from "@/lib/admin/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { MediaUploadForm } from "@/components/admin/MediaUploadForm";
import { DeleteMediaButton } from "@/components/admin/DeleteMediaButton";
import { MediaPreview } from "@/components/admin/MediaPreview";

export const dynamic = "force-dynamic";

export default async function AdminMediaPage() {
  await requireStaff();
  const { data, error } = await supabaseAdmin
    .from("media")
    .select("id, storage_path, file_name, alt_text, width, height, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    console.error("[admin/media] media list failed:", error.message);
  }
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return (
    <>
      <AdminPageHeader
        title="Media library"
        description="Upload real SRN images with alternative text, then use them across the site."
      />
      <MediaUploadForm />
      <section className="mt-8">
        <h2 className="text-display text-ink text-h3">Recent images</h2>
        {error ? (
          <div
            role="alert"
            className="border-hairline bg-paper text-slate mt-4 border p-6"
          >
            <p className="text-ink font-semibold">
              The media list could not be loaded.
            </p>
            <p className="text-small mt-2 leading-relaxed">
              Uploads are still available above. Refresh this page and, if the
              problem persists, send the reference from the server log to an
              administrator.
            </p>
          </div>
        ) : !base ? (
          <div
            role="alert"
            className="border-hairline bg-paper text-slate mt-4 border p-6"
          >
            <p className="text-ink font-semibold">
              Media storage is not configured.
            </p>
            <p className="text-small mt-2 leading-relaxed">
              The public Supabase URL is missing from this deployment. No image
              URLs are generated until the server environment is corrected.
            </p>
          </div>
        ) : (data ?? []).length === 0 ? (
          <p className="text-slate text-small mt-4">
            No images have been uploaded yet. Upload one above, then return to
            your event form and choose it.
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {(data ?? []).map((item) => {
              const src = `${base}/storage/v1/object/public/media/${item.storage_path}`;
              const width = item.width && item.width > 0 ? item.width : 800;
              const height = item.height && item.height > 0 ? item.height : 600;
              return (
                <article
                  key={item.id}
                  className="border-hairline bg-paper overflow-hidden border"
                >
                  <MediaPreview
                    src={src}
                    alt={item.alt_text}
                    width={width}
                    height={height}
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
        )}
      </section>
    </>
  );
}
