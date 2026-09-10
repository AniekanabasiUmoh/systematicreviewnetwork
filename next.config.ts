import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  /* The media workflow accepts images up to 8 MB. Next's default Server Action
     request limit is 1 MB, which made ordinary event photos fail before the
     upload action could validate them. Keep this aligned with MAX_BYTES in
     lib/actions/admin-media.ts. */
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
  async redirects() {
    return [
      {
        source: "/academy/demo-systematic-review-methodology",
        destination: "/academy/systematic-review-methodology",
        permanent: true,
      },
      {
        source: "/academy/enrol/demo-systematic-review-methodology/demo-cohort",
        destination:
          "/academy/enrol/systematic-review-methodology/september-2026",
        permanent: true,
      },
      {
        source:
          "/academy/learn/demo-systematic-review-methodology/demo-cohort/:path*",
        destination:
          "/academy/learn/systematic-review-methodology/september-2026/:path*",
        permanent: true,
      },
      { source: "/events", destination: "/news", permanent: true },
      { source: "/event/:path*", destination: "/news", permanent: true },
      { source: "/wps-members", destination: "/team", permanent: true },
      { source: "/wps-members/:path*", destination: "/team", permanent: true },
      { source: "/qsm_quiz/:path*", destination: "/academy", permanent: true },
      { source: "/category/:path*", destination: "/news", permanent: true },
    ];
  },
  images: {
    /* Only the project's own Storage bucket. Deriving the host from the env var
       rather than hardcoding it means a project move needs no code change, and
       an allowlist (not a wildcard) keeps the optimizer from being used as an
       open proxy for arbitrary remote images. */
    remotePatterns: supabaseHost
      ? [
          {
            protocol: "https",
            hostname: supabaseHost,
            pathname: "/storage/v1/object/public/**",
          },
          {
            protocol: "https",
            hostname: "risingscholars.net",
            pathname: "/static/img/**",
          },
        ]
      : [
          {
            protocol: "https",
            hostname: "risingscholars.net",
            pathname: "/static/img/**",
          },
        ],
    formats: ["image/avif", "image/webp"],
  },

  /* Sprint 6.7 — the certificate generator reads Inter.ttf from disk at
     runtime. Next's bundler only traces files reachable through imports, and a
     .ttf read with fs is not, so without this the font is absent from the
     serverless bundle and certificate downloads fail in production while
     working perfectly in development. */
  outputFileTracingIncludes: {
    "/api/academy/certificate/**": ["./assets/fonts/Inter.ttf"],
    "/verify/**": ["./assets/fonts/Inter.ttf"],
  },
};

export default nextConfig;
