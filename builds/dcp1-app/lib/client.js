"use client";

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

// A Service's Group ("Student" | "Staff" | "Both") gates who can see/book it.
export function groupMatches(serviceGroup, requiredGroup) {
  const group = serviceGroup || "Student";
  return group === "Both" || group === requiredGroup;
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
