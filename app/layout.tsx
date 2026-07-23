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

export const metadata: Metadata = {
  title: {
    default: "Systematic Reviews Network",
    template: "%s · Systematic Reviews Network",
  },
  description:
    "Better evidence. Smarter decisions. Capacity building in evidence synthesis.",
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
