// Payment sections pasted into the fee reminder message (TKT-0316). Server-only on purpose:
// the Management page bundle is a public static file, so these values must not be imported
// from client code. app/api/payment-details/route.js serves them to Management sessions only.
// Original wording is preserved in docs/fee-payment-messages.md.
//
// Each option's text is everything that follows the "Official Invoice PDF" line, including the
// closing sentence. text: null means the option is not set up yet; the UI shows it disabled.
const INDIA_HEADER = "The following are the account details provided by your teacher:";

const INDIA_BANK = [
  "CHECK ACCOUNT DETAILS:",
  "Account Name - Mohammad Fahim Akhtar",
  "Bank Name - State Bank of India",
  "Account Number - 10137922754",
  "IFSC CODE - SBIN0004652",
  "Branch name - Kathara",
  "DOB - 28/03/1975",
].join("\n");

const UPI_ID = "UPI ID - 9650675507@ptsbi";

const INDIA_CLOSE = "Make sure to email the receipt to the team via the official address: finance@divergencie.co.uk. Thank you! ✨";

// Stripe payment links, one per currency (saved in study/payment-gateways/README.md).
// Local = the link for the student's own currency. International (GBP) is also the
// fallback when the student's currency has no link of its own. Resolves TKT-0317.
const STRIPE_LINKS = {
  MYR: "https://buy.stripe.com/aFa00d2cd7tN7403op3AY00",
  USD: "https://buy.stripe.com/14AbIV5op29t0FC8IJ3AY01",
  SAR: "https://buy.stripe.com/eVqaER1894hB2NKf773AY02",
  GBP: "https://buy.stripe.com/4gM3cp2cdbK39c87EF3AY03",
};

function stripeSection(currencyLabel, link) {
  return [
    "DivergenCIE | Fee Payment Portal ✨",
    "",
    "Pay Securely via Stripe (Preferred)",
    `Easily pay using your credit or debit card via our secure Stripe gateway (${currencyLabel}): ${link}`,
    "",
    "Once your transaction is complete, please email the payment receipt to our official team address at finance@divergencie.co.uk so we can successfully update the system.",
    "",
    "Thank you for choosing DivergenCIE! 😊",
  ].join("\n");
}

const STRIPE_INTERNATIONAL = stripeSection("international", STRIPE_LINKS.GBP);
const STRIPE_BY_CURRENCY = Object.fromEntries(Object.entries(STRIPE_LINKS).map(([cur, link]) => [cur, stripeSection(cur, link)]));

// Order matches the menu. "stripe-local" has byCurrency: the client picks the entry for the
// invoice currency and falls back to text (the international message) when none matches.
export const PAYMENT_OPTIONS = [
  { key: "india-upi", label: "Indian UPI", text: [INDIA_HEADER, "", "CHECK ACCOUNT DETAILS:", UPI_ID, "", INDIA_CLOSE].join("\n") },
  { key: "stripe-local", label: "Stripe local", text: STRIPE_INTERNATIONAL, byCurrency: STRIPE_BY_CURRENCY },
  { key: "stripe-international", label: "Stripe international", text: STRIPE_INTERNATIONAL },
  { key: "india-full", label: "Full Indian account", text: [INDIA_HEADER, "", INDIA_BANK, "", UPI_ID, "", INDIA_CLOSE].join("\n") },
];
