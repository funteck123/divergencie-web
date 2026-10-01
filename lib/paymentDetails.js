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

const PAYTM = "Paytm ID - 9650675507@ptsbi";

const INDIA_CLOSE = "Make sure to email the receipt to the team via the official address: DivergenCIE@outlook.com. Thank you! ✨";

// TKT-0317: the international option reuses the Saudi link until the correct one exists.
const STRIPE_LINK = "https://buy.stripe.com/eVqaER1894hB2NKf773AY02";

function stripeSection(currencyLabel) {
  return [
    "DivergenCIE | Fee Payment Portal ✨",
    "",
    "Pay Securely via Stripe (Preferred)",
    `Easily pay using your credit or debit card via our secure Stripe gateway (${currencyLabel}): ${STRIPE_LINK}`,
    "",
    "Once your transaction is complete, please email the payment receipt to our official team address at finance@divergencie.co.uk so we can successfully update the system.",
    "",
    "Thank you for choosing DivergenCIE! 😊",
  ].join("\n");
}

export const PAYMENT_OPTIONS = [
  { key: "paytm", label: "Paytm only", text: [INDIA_HEADER, "", "CHECK ACCOUNT DETAILS:", PAYTM, "", INDIA_CLOSE].join("\n") },
  { key: "india-full", label: "Full Indian account", text: [INDIA_HEADER, "", INDIA_BANK, "", PAYTM, "", INDIA_CLOSE].join("\n") },
  { key: "stripe-saudi", label: "Saudi Stripe account", text: stripeSection("SAR") },
  { key: "stripe-international", label: "International Stripe account", text: stripeSection("international") },
];
