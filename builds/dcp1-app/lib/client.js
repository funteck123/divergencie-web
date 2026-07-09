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

export function logout() {
  localStorage.removeItem(KEY);
}

export function roleHomePath(userType) {
  switch (userType) {
    case "Management":
      return "/dashboard/management";
    case "TrialAcc":
      return "/dashboard/trial";
    case "InterviewAcc":
      return "/dashboard/interview";
    case "Student":
      return "/dashboard/student";
    case "Staff":
      return "/dashboard/staff";
    case "Parent":
      return "/dashboard/parent";
    default:
      return "/";
  }
}

// A Service's Group is an array of the account types it's open to (Student,
// Teacher, Staff, Management, Parent, Ambassador) — gates who can see/book
// it. Legacy single-string values and the old "Both" shorthand (=
// Student+Staff) still normalize correctly.
export function normalizeGroup(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw === "Both") return ["Student", "Staff"];
  return [raw || "Student"];
}

export function groupMatches(serviceGroup, requiredGroup) {
  return normalizeGroup(serviceGroup).includes(requiredGroup);
}

// Maps an account to the Group bucket it belongs in for
// Service/Enrollment eligibility — Staff accounts split into "Teacher"
// (StaffRole exactly "Teacher") vs "Staff" (every other role), matching how
// the Accounts tab already separates them.
export function roleGroupOf(user) {
  if (user.UserType === "Staff") return (user.StaffRole || "Teacher") === "Teacher" ? "Teacher" : "Staff";
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
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request to ${path} failed`);
  }
  return data;
}
