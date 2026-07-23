import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";

/* §3.2 — Display: Fraunces, optical size axis on, weights 550–650.
   Used ONLY for hero/h2/page titles/pull quotes/impact numbers. */
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz"],
});

/* §3.2 — Body & UI: Inter 400/500/600. Everything else, including admin. */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600"],
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
    <html lang="en" className={`${fraunces.variable} ${inter.variable} h-full`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
