# Fee payment messages (reference copy)

Saved 2026-10-01 so the original wording is not lost. These are the two messages Management sent by hand before the Billing tab's **Copy reminder** menu (TKT-0316). The live versions are built in `app/dashboard/management/page.js` (`buildReminderMessage`) and `lib/paymentDetails.js` (server-only account blocks).

Contains real payment details. Keep this repository private.

## 1. Full message with Indian bank account and Paytm

Original, pasted 2026-10-01. The student, amounts and Drive link are an example from an old invoice (Aug 2026).

```
Good evening! Fee payment is requested. 😊 On-time fees, smoother studies!

DivergenCIE Student Details Export

Student Name: Amakie Ematu
Status: Active
Course: B14 Cambridge IGCSE
Month(s): Aug 2026
Instructor: Mr Akhtar

Total due: SAR 500 (INR 12723.68022)

Official Invoice PDF: https://drive.google.com/uc?export=download&id=1GWJd_KEjFM8AvzFKsQzICpWvDX5UgkDy

The following are the account details provided by your teacher:

CHECK ACCOUNT DETAILS:
Account Name - Mohammad Fahim Akhtar
Bank Name - State Bank of India
Account Number - 10137922754
IFSC CODE - SBIN0004652
Branch name - Kathara
DOB - 28/03/1975

Paytm ID - 9650675507@ptsbi

Make sure to email the receipt to the team via the official address: DivergenCIE@outlook.com. Thank you! ✨
```

Used by the **Full Indian account** and **Paytm only** choices (Paytm only keeps just the Paytm line under "CHECK ACCOUNT DETAILS:").

## 2. Stripe payment portal message (Saudi, SAR)

Original, pasted 2026-10-01.

```
DivergenCIE | Fee Payment Portal ✨

Pay Securely via Stripe (Preferred)
Easily pay using your credit or debit card via our secure Stripe gateway (SAR): https://buy.stripe.com/eVqaER1894hB2NKf773AY02

Once your transaction is complete, please email the payment receipt to our official team address at finance@divergencie.co.uk so we can successfully update the system.

Thank you for choosing DivergenCIE! 😊
```

Used by the **Saudi Stripe account** choice. In the Billing reminder it replaces the account-details part and closing line (it has its own email address and thank-you).

## 3. Stripe local and international (current logic, 2026-10-01)

Menu order: Indian UPI, Stripe local, Stripe international, Full Indian account.

- Stripe local: same message as section 2 with the invoice currency label and that currency's link (MYR, USD, SAR, GBP). If the currency has no link, it sends the international message.
- Stripe international: same message with "(international)" and the GBP link. GBP is also the default.
- Links per currency: `study/payment-gateways/README.md` (git-ignored) and `lib/paymentDetails.js`.
- Indian UPI replaces the old Paytm only option and shows "UPI ID - 9650675507@ptsbi".

## How the reminder is assembled

1. Greeting line, from the current time in the student's own timezone: `Good morning|afternoon|evening! Fee payment is requested. 😊`
2. Student details (name, status, course, months), total due, official invoice PDF link.
3. The chosen payment section (one of the three above).

Changes made on top of the originals: the "On-time fees, smoother studies!" sentence and the "Instructor" line are not used; the Course line is one short label such as "B14 Cambridge IGCSE" instead of every subject.
