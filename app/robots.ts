import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Public pages are indexable; private routes set their own noindex metadata. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/account/", "/academy/enrol/", "/academy/learn/"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
