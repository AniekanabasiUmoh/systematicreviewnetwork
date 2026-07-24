import type { Metadata } from "next";
import { archivo, inter } from "./fonts";
import "./proto.css";

export const metadata: Metadata = {
  title: "SRN — design prototype",
  robots: { index: false, follow: false },
};

/* Isolated prototype. Its own layout, its own stylesheet — it does not touch
   the live site's tokens, header, or footer, so nothing here can regress the
   real homepage. Delete the /prototype route once a direction is chosen. */

export default function PrototypeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${archivo.variable} ${inter.variable} proto-root`}>
      {children}
    </div>
  );
}
