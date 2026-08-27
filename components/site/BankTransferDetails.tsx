import { Landmark } from "lucide-react";
import { Icon } from "@/components/ui/Icon";

/* Round-2 client correction — the client asked about giving in USD and said
 * the Paystack donation link was "yet to go through" for that. Paystack here
 * only takes NGN, so this is the direct route: the same First Bank of Nigeria
 * accounts the old site listed, recovered from the WordPress export
 * (wordpress-export/inventory.json, page "donate"), plus the Selar link.
 * Sits alongside <DonationForm/> rather than replacing it — cards still work
 * for NGN givers who'd rather not leave the site. */

const ACCOUNTS = [
  {
    label: "Bank transfer, NGN (Nigeria)",
    rows: [
      ["Account name", "The Systematic Reviews Network Ltd/Gte"],
      ["Bank", "First Bank of Nigeria"],
      ["Account number", "2046271367"],
    ],
  },
  {
    label: "Bank transfer, USD (international)",
    rows: [
      ["Account name", "The Systematic Reviews Network Ltd/Gte"],
      ["Bank", "First Bank of Nigeria"],
      ["Account number", "2046261487"],
      ["Sort code", "011150000"],
      ["SWIFT code", "FBNINLAG"],
    ],
  },
];

export function BankTransferDetails() {
  return (
    <div className="border-hairline bg-mist border p-6">
      <span className="bg-evidence-tint mb-4 flex h-11 w-11 items-center justify-center">
        <Icon icon={Landmark} size="lg" color="evidence" />
      </span>
      <h3 className="text-ink text-[1.05rem] font-semibold">
        Prefer a bank transfer?
      </h3>
      <p className="text-slate text-small mt-2 leading-relaxed">
        Give directly by bank transfer in naira or US dollars, or through our
        Selar page. These don&apos;t issue an automatic receipt, so email{" "}
        <a href="mailto:info@systematicreviewsnetwork.org" className="text-ink underline">
          info@systematicreviewsnetwork.org
        </a>{" "}
        with your transfer details and we&apos;ll confirm.
      </p>

      <div className="mt-5 space-y-5">
        {ACCOUNTS.map((acc) => (
          <div key={acc.label}>
            <p className="text-eyebrow-style text-slate">{acc.label}</p>
            <dl className="mt-2 space-y-1">
              {acc.rows.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 text-small">
                  <dt className="text-slate">{label}</dt>
                  <dd className="text-ink font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>

      <a
        href="https://selar.com/showlove/srn"
        target="_blank"
        rel="noopener noreferrer"
        className="text-ink mt-5 inline-flex items-center text-small font-semibold underline"
      >
        Give through Selar instead →
      </a>
    </div>
  );
}
