import * as React from "react";

/* Shared email shell (§4.1 "branded React Email template").
 *
 * Deliberately hand-rolled with inline styles and table layout — the lingua
 * franca that renders in Gmail web + mobile, Outlook, and Apple Mail alike.
 * Palette matches the site: ink #16182B ground for the header band, plain white
 * body, one evidence-green rule as the only accent (no green on text, no gold —
 * the site's standing constraints hold in email too). */

const INK = "#16182B";
const GREEN = "#1F6F5C";
const SLATE = "#494C63";
const HAIRLINE = "#E4E5EA";
const PAPER = "#FFFFFF";

export function EmailLayout({
  preview,
  heading,
  children,
}: {
  preview: string;
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: "#F4F5F7",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          color: INK,
        }}
      >
        {/* Preheader: shown in the inbox preview, hidden in the body. */}
        <div
          style={{
            display: "none",
            overflow: "hidden",
            lineHeight: "1px",
            opacity: 0,
            maxHeight: 0,
            maxWidth: 0,
          }}
        >
          {preview}
        </div>

        <table
          role="presentation"
          width="100%"
          cellPadding={0}
          cellSpacing={0}
          style={{ backgroundColor: "#F4F5F7", padding: "24px 0" }}
        >
          <tbody>
            <tr>
              <td align="center">
                <table
                  role="presentation"
                  width={600}
                  cellPadding={0}
                  cellSpacing={0}
                  style={{
                    width: "600px",
                    maxWidth: "600px",
                    backgroundColor: PAPER,
                    border: `1px solid ${HAIRLINE}`,
                  }}
                >
                  <tbody>
                    {/* Header band */}
                    <tr>
                      <td
                        style={{
                          backgroundColor: INK,
                          padding: "28px 40px",
                          borderBottom: `3px solid ${GREEN}`,
                        }}
                      >
                        <span
                          style={{
                            color: PAPER,
                            fontSize: "20px",
                            fontWeight: 700,
                            letterSpacing: "-0.02em",
                          }}
                        >
                          Systematic Reviews Network
                        </span>
                      </td>
                    </tr>

                    {/* Body */}
                    <tr>
                      <td style={{ padding: "40px" }}>
                        <h1
                          style={{
                            margin: "0 0 20px",
                            fontSize: "24px",
                            lineHeight: 1.2,
                            color: INK,
                            fontWeight: 700,
                          }}
                        >
                          {heading}
                        </h1>
                        {children}
                      </td>
                    </tr>

                    {/* Footer */}
                    <tr>
                      <td
                        style={{
                          padding: "24px 40px",
                          borderTop: `1px solid ${HAIRLINE}`,
                          fontSize: "13px",
                          color: SLATE,
                          lineHeight: 1.6,
                        }}
                      >
                        Systematic Reviews Network
                        <br />
                        Building capacity for systematic reviews across low- and
                        middle-income countries.
                        <br />
                        <a
                          href="https://systematicreviewsnetwork.org"
                          style={{ color: SLATE }}
                        >
                          systematicreviewsnetwork.org
                        </a>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  );
}

/* Reusable body atoms so the individual emails stay declarative. */

export function P({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        margin: "0 0 16px",
        fontSize: "16px",
        lineHeight: 1.6,
        color: SLATE,
      }}
    >
      {children}
    </p>
  );
}

export function Button({ href, children }: { href: string; children: string }) {
  return (
    <table role="presentation" cellPadding={0} cellSpacing={0} style={{ margin: "8px 0 24px" }}>
      <tbody>
        <tr>
          <td
            style={{ backgroundColor: GREEN }}
            align="center"
          >
            <a
              href={href}
              style={{
                display: "inline-block",
                padding: "12px 28px",
                color: PAPER,
                fontSize: "15px",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              {children}
            </a>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

/** Labelled key/value detail block, e.g. an event's when/where. */
export function DetailList({
  rows,
}: {
  rows: { label: string; value: string }[];
}) {
  return (
    <table
      role="presentation"
      width="100%"
      cellPadding={0}
      cellSpacing={0}
      style={{
        margin: "0 0 24px",
        border: `1px solid ${HAIRLINE}`,
        borderCollapse: "collapse",
      }}
    >
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.label} style={i > 0 ? { borderTop: `1px solid ${HAIRLINE}` } : undefined}>
            <td
              style={{
                padding: "12px 16px",
                fontSize: "12px",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                color: SLATE,
                fontWeight: 700,
                width: "120px",
                verticalAlign: "top",
              }}
            >
              {r.label}
            </td>
            <td
              style={{
                padding: "12px 16px",
                fontSize: "15px",
                color: INK,
                lineHeight: 1.5,
              }}
            >
              {r.value}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
