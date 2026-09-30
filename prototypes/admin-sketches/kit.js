import ICONS from "./icons.js";

export const I = (n, s = 16) =>
  `<svg class="i" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]}</svg>`;
export const btn = (label, o = {}) => `<span class="btn ${o.k || ""} ${o.c || ""}" style="${o.s || ""}">${o.i ? I(o.i, o.is || 16) : ""}${label || ""}</span>`;
export const chip = (t, k = "") => `<span class="chip ${k}">${t}</span>`;
export const tag = (t) => `<span class="tag">${t}</span>`;
export const input = (t, o = {}) =>
  `<div class="input ${o.v ? "v" : ""}" style="${o.s || ""}">${o.i ? I(o.i, 14) : ""}<span class="tr">${t}</span>${o.dd ? I("chevron-down", 14).replace('class="i"', 'class="i caret"') : ""}</div>`;
export const fld = (l, t, o = {}) => `<label class="fld" style="${o.s || ""}"><span>${l}</span>${input(t, { ...o, s: "" })}</label>`;
export const cb = (on) => `<span class="cb ${on ? "on" : ""}">${on ? I("check", 12) : ""}</span>`;
export const pips = (a) => `<span class="pips">${a.map((x) => `<i class="${x ? "on" : ""}"></i>`).join("")}</span>`;
export const steps = (n, total = 5) => `<span class="steps">${Array.from({ length: total }, (_, i) => `<i class="${i < n ? "on" : ""}"></i>${i < total - 1 ? "<u></u>" : ""}`).join("")}</span>`;

export const TABS = ["Applications", "Pipeline", "Accounts", "Services", "Schedule", "Enrollments", "Billing", "Guides", "Tickets", "Audit Log"];
export const TAB_ICON = { Applications: "file-text", Pipeline: "funnel", Accounts: "users", Services: "book-open", Schedule: "calendar", Enrollments: "graduation-cap", Billing: "wallet", Guides: "clipboard-list", Tickets: "ticket", "Audit Log": "history" };

export const ST = [
  { id: "STU-0412", n: "Zara Malik", s: "Active", c: "IGCSE", b: "B14", tz: "Asia/Kolkata", cur: "INR", w: "+91 98100 00412", pw: "+91 98100 10412", pe: "parent.malik@example.com", e: "zara@example.com", sc: "Delhi Public", loc: "Delhi", p: [1, 1, 1, 0, 1] },
  { id: "STU-0413", n: "Leo Tan", s: "Active", c: "A Level", b: "B8", tz: "Asia/Kuala_Lumpur", cur: "MYR", w: "+60 12 000 0413", pw: "+60 12 000 1413", pe: "tan.family@example.com", e: "leo@example.com", sc: "Bukit High", loc: "Penang", p: [1, 1, 0, 0, 1] },
  { id: "STU-0414", n: "Priya Nair", s: "Inactive", c: "IGCSE", b: "B14", tz: "Asia/Kolkata", cur: "INR", w: "—", pw: "—", pe: "—", e: "—", sc: "—", loc: "Kochi", p: [0, 0, 0, 0, 0] },
  { id: "STU-0415", n: "Omar Haddad", s: "Active", c: "IGCSE", b: "B14", tz: "Asia/Riyadh", cur: "SAR", w: "+966 54 000 0415", pw: "+966 55 000 0415", pe: "haddad.home@example.com", e: "omar@example.com", sc: "Alfajr", loc: "Riyadh", p: [1, 0, 1, 1, 0] },
  { id: "STU-0416", n: "Mei Lin", s: "Active", c: "A Level", b: "B8", tz: "Asia/Singapore", cur: "USD", w: "+65 8000 0416", pw: "+65 8000 1416", pe: "lin.parents@example.com", e: "mei@example.com", sc: "Raffles", loc: "Singapore", p: [1, 1, 1, 1, 1] },
  { id: "STU-0417", n: "Sam Okafor", s: "Active", c: "IGCSE", b: "B9", tz: "Europe/London", cur: "GBP", w: "+44 7000 000417", pw: "+44 7000 001417", pe: "okafor.home@example.com", e: "sam@example.com", sc: "Kingsway", loc: "London", p: [1, 0, 0, 0, 1] },
];
export const stCls = (s) => (s === "Active" ? "ok" : "");

export const sk = (id, title, note, html, h, extra = "") =>
  `<div class="cap"><code>${id}</code>${title}<span>${note || ""}</span></div><div class="wrap"><div class="sk ${extra}" style="height:${h}px">${html}</div></div>`;

export const actionBtns = (right = "") =>
  `${btn("Install app", { k: "on-dark", i: "download" })}${btn("Report an Issue", { k: "on-dark", i: "life-buoy" })}${btn("Sign out", { k: "on-dark", i: "log-out" })}${right}`;
export const brand = `<div class="brand"><small>DCP1 · Management</small>Admin</div>`;
export const topBar = (extra = "") => `<div class="bar1">${brand}<div class="grow"></div>${extra}${actionBtns()}</div>`;
export const tabsBar = (active = "Accounts") => `<div class="tabs">${TABS.map((t) => `<span class="${t === active ? "on" : ""}">${t}</span>`).join("")}</div>`;

/* compact accounts table used as background content inside shell sketches */
export function miniAccounts(rows = 6, o = {}) {
  return `<table class="tbl"><colgroup><col style="width:110px"><col style="width:230px"><col style="width:130px"><col style="width:110px"><col style="width:90px"><col><col style="width:170px"></colgroup>
  <thead><tr><th>ID</th><th>Name</th><th>Status</th><th>Course</th><th>Batch</th><th>Email</th><th>WhatsApp #</th></tr></thead>
  <tbody>${ST.slice(0, rows).map((r) => `<tr><td class="mono">${r.id}</td><td><b>${r.n}</b></td><td>${chip(r.s, stCls(r.s))}</td><td>${r.c}</td><td>${r.b}</td><td class="mut">${r.e}</td><td class="mono">${r.w}</td></tr>`).join("")}</tbody></table>`;
}
export const fade = `<div class="fade"></div>`;
