import { Archivo, Inter } from "next/font/google";

/* Prototype display face — Archivo, variable 100–900.

   Chosen for the ESI two-weight hero move: a genuine thin (200/300) paired
   with black (800/900) at the same size reads as art-directed, not generated.
   Archivo is architectural and institutional without being Inter or the
   AI-default Space Grotesk. Body stays Inter (Wellcome does the same). */

export const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  display: "swap",
  axes: ["wdth"],
});

export const inter = Inter({
  variable: "--font-inter-proto",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600"],
});
