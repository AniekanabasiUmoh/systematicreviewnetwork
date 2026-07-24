import { Figure } from "./Media";

/* §2.1 / §4 — the credibility bar directly under the hero (the ESI pattern).
   Greyscale by default, colour on hover, so a row of mismatched logos reads as
   one set. Trust is established in the first screen, not the footer. */

export type Partner = {
  name: string;
  logo_url?: string | null;
  url?: string | null;
};

export function PartnerLogoBar({
  partners,
  label = "Supported by / working with",
}: {
  partners: Partner[];
  label?: string;
}) {
  if (partners.length === 0) return null;

  return (
    <div>
      <p className="text-eyebrow-style text-slate text-center">{label}</p>
      <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-8">
        {partners.map((p) => {
          const logo = (
            <Figure
              src={p.logo_url}
              alt={p.logo_url ? p.name : ""}
              width={200}
              height={80}
              label={p.name}
              rounded={false}
              className="w-[140px]"
              imgClassName="object-contain grayscale opacity-70 transition-all duration-200 hover:grayscale-0 hover:opacity-100"
              sizes="140px"
            />
          );
          return (
            <li key={p.name}>
              {p.url ? (
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={p.name}
                  className="block"
                >
                  {logo}
                </a>
              ) : (
                logo
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
