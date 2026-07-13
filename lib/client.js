"use client";

import { useState } from "react";

const KEY = "dcp1_user";

export function getCurrentUser() {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : null;
}

export function setCurrentUser(user) {
  localStorage.setItem(KEY, JSON.stringify(user));
}

// localStorage only ever drove the UI (which dashboard to render) — the
// actual session cookie is httpOnly and cleared server-side via POST
// /api/logout. Clearing localStorage without that call would leave a valid
// cookie behind (the API would still authenticate the old session).
export function logout() {
  localStorage.removeItem(KEY);
  fetch("/api/logout", { method: "POST" }).catch(() => {});
}

export function roleHomePath(userType) {
  switch (userType) {
    case "Management":
      return "/dashboard/management";
    case "TrialAcc":
      return "/dashboard/trial";
    case "TeacherInterviewAcc":
    case "StaffInterviewAcc":
    case "AmbassadorInterviewAcc":
      return "/dashboard/interview";
    case "Student":
      return "/dashboard/student";
    case "Teacher":
      return "/dashboard/teacher";
    case "Staff":
      return "/dashboard/staff";
    case "Parent":
      return "/dashboard/parent";
    case "Ambassador":
      return "/dashboard/ambassador";
    default:
      return "/";
  }
}

// A Service's Group is an array of the account types it's open to (Student,
// Teacher, Staff, Management, Parent, Ambassador) — gates who can see/book
// it. Legacy single-string values and the old "Both" shorthand (=
// Student+Teacher) still normalize correctly.
export function normalizeGroup(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw === "Both") return ["Student", "Teacher"];
  return [raw || "Student"];
}

export function groupMatches(serviceGroup, requiredGroup) {
  return normalizeGroup(serviceGroup).includes(requiredGroup);
}

// Maps an account to the Group bucket it belongs in for Service/Enrollment
// eligibility. Teacher and Staff are separate UserTypes, so this is just
// the account's own type.
export function roleGroupOf(user) {
  return user.UserType;
}

// Click-to-sort for any list of plain objects. Pass keys directly present on
// the items (add synthetic ones, e.g. `_period`, before sorting composite
// values like Year+Month).
export function useSort(items, initialKey, initialDir = "asc") {
  const [sortKey, setSortKey] = useState(initialKey);
  const [sortDir, setSortDir] = useState(initialDir);

  function toggleSort(key) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sorted = [...items].sort((a, b) => {
    let av = a[sortKey];
    let bv = b[sortKey];
    if (typeof av === "string") av = av.toLowerCase();
    if (typeof bv === "string") bv = bv.toLowerCase();
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  return { sorted, sortKey, sortDir, toggleSort };
}

export async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  // A 401 means the session cookie is missing/expired even though stale
  // localStorage still thinks we're logged in (e.g. cookie expired after 7
  // days) — without this, every dashboard would hang on "Loading…" forever
  // since load() calls aren't wrapped in try/catch. Bounce to login instead.
  if (res.status === 401 && typeof window !== "undefined") {
    localStorage.removeItem(KEY);
    window.location.href = "/login";
    return new Promise(() => {}); // navigation is in flight; never resolve
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request to ${path} failed`);
  }
  return data;
}

// A single rate's display string — shared by formatRates (every rate a
// Service offers, for Management's own view) and any caller that already
// knows which ONE rate applies (e.g. a user's own enrollment).
export function formatRate(r) {
  if (!r) return "—";
  return r.Description ? `${r.Currency} ${r.Rate} (${r.Description})` : `${r.Currency} ${r.Rate}`;
}

// A Service can offer more than one currency (s.Rates: [{Currency, Rate}]).
// Falls back to the legacy singular Currency/Rate for any service that
// predates that field. Shows EVERY rate — only appropriate for
// Management's own view of a Service; an enrolled user should only ever
// see the one rate they're actually enrolled at (see formatRate above).
export function formatRates(s) {
  const rates = Array.isArray(s.Rates) && s.Rates.length > 0 ? s.Rates : [{ Currency: s.Currency || "INR", Rate: s.Rate ?? 0 }];
  return rates.map(formatRate).join(" / ");
}
