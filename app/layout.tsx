import type { Metadata } from "next";
import { Inter, Archivo, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

/* §3.2 (revised) — two families. Inter carries body copy; Archivo carries
   headings, the wordmark, and impact numbers. Archivo is variable 100–900 with
   a width axis, which is what makes the ESI-style "thin over black" hero move
   possible — a genuine thin paired with black at the same size reads as
   art-directed rather than defaulted. Both use display:swap so a slow font
   never blocks paint. */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  display: "swap",
  axes: ["wdth"],
});

/* Sprint 6.10 — a third family, used ONLY for small uppercase labels in the
   Academy ("PART 1", "MODULE 2", lesson durations). Two weights, nothing else.
   A tracked monospace label reads as a considered detail where the same words
   in sans read as a heading that lost an argument with its own hierarchy. */
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Systematic Reviews Network",
    template: "%s · Systematic Reviews Network",
  },
  description:
    "Better evidence. Smarter decisions. Capacity building in evidence synthesis across Africa and beyond.",
  openGraph: {
    type: "website",
    siteName: "Systematic Reviews Network",
    locale: "en_GB",
    url: siteUrl,
  },
  twitter: { card: "summary_large_image" },
  icons: {
    icon: [
      {
        url: "/favicon.ico?v=2",
        sizes: "16x16 32x32 48x48",
        type: "image/x-icon",
      },
      { url: "/icon.png?v=2", sizes: "512x512", type: "image/png" },
    ],
    apple: { url: "/apple-icon.png?v=2", sizes: "180x180", type: "image/png" },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${archivo.variable} ${plexMono.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
