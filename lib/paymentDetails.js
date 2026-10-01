// Payment details pasted into the fee reminder message (TKT-0316). Server-only on purpose:
// the Management page bundle is a public static file, so these values must not be imported
// from client code. app/api/payment-details/route.js serves them to Management sessions only.
//
// text: null means the option is not set up yet; the UI shows it disabled.
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

export const PAYMENT_OPTIONS = [
  { key: "paytm", label: "Paytm only", text: `CHECK ACCOUNT DETAILS:\n${PAYTM}` },
  { key: "india-full", label: "Full Indian account", text: `${INDIA_BANK}\n\n${PAYTM}` },
  { key: "stripe-saudi", label: "Saudi Stripe account", text: null },
  { key: "stripe-international", label: "International Stripe account", text: null },
];
