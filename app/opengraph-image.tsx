import { ImageResponse } from "next/og";

/* §1.2 / §6.2 — default OG image: title on brand navy.
   Generated at request time rather than shipped as a static asset, so per-page
   variants in Sprint 6.2 reuse this exact treatment. Rendered with system
   sans; next/og cannot use the next/font pipeline without fetching the font
   file, and the shape of the card matters more than the exact face here. */

export const alt =
  "Systematic Reviews Network — Better evidence. Smarter decisions.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundColor: "#24276E",
        padding: "72px",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          color: "rgba(255,255,255,0.65)",
          fontSize: 24,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        Systematic Reviews Network
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          color: "#FFFFFF",
          fontSize: 76,
          fontWeight: 700,
          letterSpacing: "-0.03em",
          lineHeight: 1.05,
        }}
      >
        Better evidence.
        <span style={{ color: "#C9A227" }}>Smarter decisions.</span>
      </div>

      {/* Evidence-green rule, echoing the action colour. */}
      <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
        <div style={{ width: 96, height: 6, backgroundColor: "#1F6F5C" }} />
        <div
          style={{
            color: "rgba(255,255,255,0.7)",
            fontSize: 24,
          }}
        >
          Capacity building in evidence synthesis
        </div>
      </div>
    </div>,
    size,
  );
}
