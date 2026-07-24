import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

/* §3.2 — Inter throughout. Display and body are distinguished by weight and
   tracking, not by family: 700 with tight leading and -0.02em tracking for
   headings, 400/500 for body. One family means one set of metrics, so there
   is no mismatched-fallback layout shift. */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
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
  /* Kept out of search until launch (Sprint 6.2 turns this on deliberately).
     A half-built site indexed early is hard to undo. */
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
