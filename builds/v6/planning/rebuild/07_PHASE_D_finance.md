# Rebuild — Phase D: Finance subsystem (depends on Identity, Scheduling, Curriculum)

| # | Module | Owns | Notes |
|---|---|---|---|
| D1 | `rates` | RateList, RateItem, CurrencyRate, change logs | Country->rate lookup with DEFAULT fallback (handoff §26.18). Composite-unique fix (ISSUE-066). |
| D2 | `invoicing` | StudentInvoice, InvoiceLineItem, BillingMonth | Real generation (kills ISSUE-040 mock). HOURLY_FLEXIBLE dual-log reconcile + SERVICE_CORRECTION ticket (ISSUE-093). Billing starts only when enrolment ACTIVE (§26.19). |
| D3 | `payroll` | Claim, Paycheck, *LineItem, change logs | One claim per list per month (§26.21, ISSUE-031). v11 polymorphic FK split (ISSUE-057). |
| D4 | `ambassador-comp` | Commission, AmbassadorClaim, Paycheck | Commission auto-inactivate/resume lifecycle (ISSUE-095); real earnings (kills ISSUE-037). Polymorphic claim lines commission+allowance (§52.4). |
| D5 | `ledger` | LedgerEntry, AccountTransaction, budgets | Double-entry, multi-currency (ISSUE-044). |
| D6 | `payments` | PaymentMethod, PaymentRecord, Stripe | Receipt-link required except Stripe (§26.35). Dispute flow (§26.34). |
