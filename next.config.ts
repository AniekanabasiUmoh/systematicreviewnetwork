import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
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
        ]
      : [],
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
