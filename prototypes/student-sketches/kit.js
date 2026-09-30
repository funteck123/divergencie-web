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

export const chipTone = (s) => (s === "Correct" ? "ok" : s === "Incorrect" ? "bad" : s === "Flagged" ? "warn" : "");
export const sk = (id, title, note, html, h, extra = "") =>
  `<div class="cap"><code>${id}</code>${title}<span>${note || ""}</span></div><div class="wrap"><div class="sk ${extra}" style="height:${h}px">${html}</div></div>`;
export const fade = `<div class="fade"></div>`;
export const paper = (h, lines = true) => `<div class="paper" style="height:${h}px"></div>`;
export const letters = (sel) => ["A", "B", "C", "D"].map((l) => `<span class="btn ic ${l === sel ? "nav" : ""}" style="width:40px;height:40px;font-size:15px">${l}</span>`).join("");
export const qsBar = (right = "", left = "") => `<div class="bar1"><div class="brand"><b style="font-size:18px">DC Question Solver</b></div>${left}<div class="grow"></div>${right}</div>`;
