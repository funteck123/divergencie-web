// Pure data, no Node-only imports (no "fs" etc.) — safe to import from both
// server route handlers (app/api/users/route.js) and "use client" dashboard
// components (app/dashboard/management/page.js), unlike most of app/api/*
// which pulls in lib/db.js's fs usage and can't be imported client-side.
// Single source of truth for these three constants, previously hand-copied
// in both places and at risk of drifting out of sync.

export const DEPARTMENTS = ["Marketing", "Finance", "HR", "IT", "PR"];
// Teacher/Ambassador Department is fixed to their own type name (not user
// editable) — Staff instead picks one of DEPARTMENTS. Role is free text on
// all three: for Staff it's their job title, for Teacher/Ambassador it's
// whatever descriptor Management wants to record (e.g. "Subject Lead").
export const ROLE_ELIGIBLE = ["Teacher", "Staff", "Ambassador"];
export const FIXED_DEPARTMENT = { Teacher: "Teacher", Ambassador: "Ambassador" };

// Shared by User.Currency and Service.Currency — not a claim of ISO 4217
// completeness, just the set this app's accounts/billing actually use.
export const CURRENCIES = ["INR", "USD", "MYR", "SAR", "GBP", "EUR", "AED", "SGD", "AUD", "CAD"];
