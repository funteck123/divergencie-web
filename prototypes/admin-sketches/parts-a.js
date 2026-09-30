import { I, btn, chip, tag, input, fld, cb, pips, steps, TABS, TAB_ICON, ST, stCls, sk, actionBtns, brand, topBar, tabsBar, miniAccounts, fade } from "./kit.js";

const title = (t, extra = "") => `<div style="font:600 22px var(--font);color:var(--navy)">${t}</div>${extra}`;
const typeSeg = `<span class="seg"><span class="on">All<em>214</em></span><span>Students<em>128</em></span><span>Teachers<em>21</em></span><span>Staff<em>9</em></span><span>Parents<em>41</em></span><span>Ambassadors<em>14</em></span></span>`;
const nameCell = (r) => `<b>${r.n}</b>`;

/* ---------- 1 Shell ---------- */
export const part1 = () => {
  const sorted = [...TABS].sort();
  const a = sk("1A", "Two-tier sticky bar", "both tiers stay pinned", `${topBar()}${tabsBar()}<div class="body" style="margin-top:-30px;position:relative">${miniAccounts(6)}</div>${fade}`, 400);
  const b = sk(
    "1B",
    "One bar, section switcher",
    "sections in a searchable menu",
    `<div class="bar1">${brand}<span class="btn on-dark" style="height:34px;margin-left:16px;min-width:190px;justify-content:space-between"><span class="row" style="gap:8px">${I("users")}Accounts</span>${I("chevron-down", 14)}</span><div class="grow"></div>${actionBtns()}</div>
     <div class="menu" style="left:232px;top:54px;width:280px;padding:0"><div style="padding:8px;border-bottom:1px solid var(--lb)">${input("Search", { i: "search", s: "width:100%" })}</div>${sorted.map((t) => `<div class="${t === "Accounts" ? "hl" : ""}">${I(TAB_ICON[t], 16)}${t}</div>`).join("")}</div>
     <div class="body" style="margin-top:-30px;position:relative">${miniAccounts(6)}</div>${fade}`,
    600
  );
  const c = sk(
    "1C",
    "Icon rail, slim top bar",
    "rail pinned, 72 px wide",
    `<div class="rail">${TABS.map((t) => `<div class="${t === "Accounts" ? "on" : ""}">${I(TAB_ICON[t], 20)}<span>${t.length > 9 ? t.replace("Enrollments", "Enroll").replace("Applications", "Apps") : t}</span></div>`).join("")}</div>
     <div style="margin-left:72px"><div class="bar1" style="height:48px">${brand}<div class="grow"></div>${actionBtns()}</div>
     <div class="body" style="position:relative;margin-top:-26px">${miniAccounts(6).replace(/width:230px/, "width:210px")}</div></div>${fade}`,
    640
  );
  return { id: "p1", n: "1", name: "Shell: header and section navigation", html: a + b + c };
};

/* ---------- 2 Toolbar ---------- */
export const part2 = () => {
  const ctx = (n = 3) => `<div style="margin-top:14px">${miniAccounts(n)}</div>`;
  const a = sk("2A", "One row", "title, search, type, filter, create", `<div class="body"><div class="row" style="gap:12px">${title("Accounts")}${input("Search", { i: "search", s: "width:240px" })}${typeSeg}${btn("Filter", { i: "funnel" })}<div class="grow"></div>${btn("Create account", { k: "pri", i: "plus" })}</div>${ctx()}</div>`, 250);
  const b = sk(
    "2B",
    "Two rows",
    "actions above, filters below",
    `<div class="body"><div class="row">${title("Accounts")}<span class="tag">214</span><div class="grow"></div>${btn("Create account", { k: "pri", i: "plus" })}</div>
     <div class="row" style="gap:12px;margin-top:12px">${input("Search", { i: "search", s: "width:300px" })}${typeSeg}${btn("Filter", { i: "funnel" })}<div class="grow"></div>${btn("Columns", { i: "columns-3", k: "gh" })}${btn("Export", { i: "download", k: "gh" })}</div>${ctx()}</div>`,
    290
  );
  const c = sk(
    "2C",
    "Filter popover, floating create",
    "create button floats bottom right",
    `<div class="body"><div class="row" style="gap:12px">${title("Accounts")}${input("Search", { i: "search", s: "width:300px" })}${btn("Filter", { i: "funnel", k: "nav" })}<span class="tag">2</span></div>${ctx(4)}</div>
     <div class="pop" style="left:440px;top:64px;width:560px"><div class="gridf" style="grid-template-columns:1fr 1fr 1fr">${fld("Type", "Student", { dd: 1, v: 1 })}${fld("Status", "Active", { dd: 1, v: 1 })}${fld("Course", "Any", { dd: 1 })}${fld("Batch", "Any", { dd: 1 })}${fld("Currency", "Any", { dd: 1 })}${fld("Timezone", "Any", { dd: 1 })}</div>
     <div class="row" style="margin-top:14px;justify-content:flex-end">${btn("Reset", { k: "gh" })}${btn("Apply", { k: "nav" })}</div></div>
     <div style="position:absolute;right:24px;bottom:18px;z-index:10">${btn("Create account", { k: "pri", i: "plus", s: "height:44px;padding:0 20px;font-size:15px" })}</div>`,
    360
  );
  return { id: "p2", n: "2", name: "Section toolbar and filters", html: a + b + c };
};

/* ---------- 3 Record rows ---------- */
const sentHdr = `<th style="width:92px" title="Timesheet, Progress Tracker, Group, GCR, Schedule">Sent</th>`;
export const part3 = () => {
  const a = sk(
    "3A",
    "One line, eight columns",
    "rest opens under the row",
    `<div class="body"><table class="tbl"><colgroup><col style="width:40px"><col style="width:108px"><col style="width:200px"><col style="width:120px"><col style="width:92px"><col style="width:76px"><col style="width:170px"><col><col style="width:92px"><col style="width:104px"></colgroup>
     <thead><tr><th></th><th>ID</th><th>Name</th><th>Status</th><th>Course</th><th>Batch</th><th>WhatsApp #</th><th>Email</th>${sentHdr}<th></th></tr></thead>
     <tbody>${ST.map((r, i) => `<tr class="${r.s === "Inactive" ? "dim" : ""}"><td>${I("chevron-right", 16)}</td><td class="mono">${r.id}</td><td><b>${r.n}</b></td><td>${chip(r.s, stCls(r.s))}</td><td>${r.c}</td><td>${r.b}</td><td class="mono">${r.w}</td><td class="mut">${r.e}</td><td>${pips(r.p)}</td><td><span class="row" style="gap:4px;justify-content:flex-end">${btn("Edit", { c: "sm", i: "pencil", is: 14 })}${btn("", { c: "sm ic", i: "ellipsis" })}</span></td></tr>`).join("")}</tbody></table></div>`,
    390
  );
  const row2 = (r) => `<div class="row" style="height:68px;padding:0 16px;gap:16px;background:var(--white);border-bottom:1px solid var(--lb);${r.s === "Inactive" ? "color:var(--mut)" : ""}">
    <div style="width:280px"><div class="row" style="gap:10px"><b style="font-size:15px">${r.n}</b>${chip(r.s, stCls(r.s))}</div><div class="mono mut">${r.id}</div></div>
    <div style="width:280px;line-height:1.35"><div>${r.c} · ${r.b}</div><div class="mut tr" style="font-size:13px">${r.tz} · ${r.cur}</div></div>
    <div class="grow" style="line-height:1.35"><div class="mono">${r.w}</div><div class="mut tr" style="font-size:13px">${r.e}</div></div>
    ${pips(r.p)}<span class="row" style="gap:4px">${btn("Edit", { c: "sm", i: "pencil", is: 14 })}${btn("", { c: "sm ic", i: "ellipsis" })}</span></div>`;
  const b = sk("3B", "Two lines per record", "identity above, context below", `<div class="body"><div class="surf" style="overflow:hidden">${ST.map(row2).join("")}</div></div>`, 520);
  const c = sk(
    "3C",
    "Grouped by batch",
    "course and batch move to group bars",
    `<div class="body"><div class="surf" style="overflow:hidden">
    ${[["IGCSE · B14", ST.filter((r) => r.b === "B14")], ["A Level · B8", ST.filter((r) => r.b === "B8")]].map(([g, rows]) => `<div class="grp">${I("chevron-down", 16)}${g}<span class="tag" style="background:var(--white)">${rows.length}</span></div>
    ${rows.map((r) => `<div class="row" style="height:44px;padding:0 16px;gap:16px;border-bottom:1px solid var(--lb);${r.s === "Inactive" ? "color:var(--mut)" : ""}"><span class="mono" style="width:96px">${r.id}</span><b style="width:200px">${r.n}</b><span style="width:110px">${chip(r.s, stCls(r.s))}</span><span class="mono" style="width:160px">${r.w}</span><span class="grow mut tr">${r.e}</span>${pips(r.p)}<span class="row" style="gap:4px">${btn("Edit", { c: "sm", i: "pencil", is: 14 })}${btn("", { c: "sm ic", i: "ellipsis" })}</span></div>`).join("")}`).join("")}
    <div class="grp">${I("chevron-right", 16)}IGCSE · B9<span class="tag" style="background:var(--white)">1</span></div></div></div>`,
    430
  );
  return { id: "p3", n: "3", name: "Record rows (Student Accounts, 21 columns today)", html: a + b + c };
};

/* ---------- 4 Row actions ---------- */
export const part4 = () => {
  const list = (actions, o = {}) => `<table class="tbl" style="position:relative"><colgroup>${o.sel ? '<col style="width:44px">' : ""}<col style="width:108px"><col style="width:210px"><col style="width:120px"><col style="width:92px"><col style="width:76px"><col>${`<col style="width:${o.aw || 230}px">`}</colgroup>
   <thead><tr>${o.sel ? "<th></th>" : ""}<th>ID</th><th>Name</th><th>Status</th><th>Course</th><th>Batch</th><th>Email</th><th></th></tr></thead>
   <tbody>${ST.slice(0, 4).map((r, i) => `<tr class="${o.selRows && o.selRows.includes(i) ? "sel" : ""}">${o.sel ? `<td>${cb(o.selRows.includes(i))}</td>` : ""}<td class="mono">${r.id}</td><td><b>${r.n}</b></td><td>${chip(r.s, stCls(r.s))}</td><td>${r.c}</td><td>${r.b}</td><td class="mut">${r.e}</td><td><span class="row" style="gap:4px;justify-content:flex-end">${actions(r, i)}</span></td></tr>`).join("")}</tbody></table>`;
  const a = sk(
    "4A",
    "Two visible, rest in menu",
    "Edit and Log in as stay; overflow holds the rest",
    `<div class="body" style="position:relative">${list((r) => `${btn("Edit", { c: "sm", i: "pencil", is: 14 })}${btn("Log in as", { c: "sm", i: "log-in", is: 14 })}${btn("", { c: "sm ic", i: "ellipsis" })}`)}
     <div class="menu" style="right:34px;top:136px;width:232px"><div>${I("key-round")}Reset password</div><div>${I("user-x")}Deactivate</div><div>${I("user-check")}Activate</div><hr><div>${I("graduation-cap")}Convert to Student</div><div>${I("book-open")}Convert to Teacher</div><div>${I("users")}Convert to Staff</div><hr><div>${I("trash-2", 16).replace("<svg", '<svg style="color:var(--coral)"')}Delete</div></div></div>`,
    420
  );
  const b = sk(
    "4B",
    "Icon cluster, tooltip names",
    "five fixed icon buttons per row",
    `<div class="body" style="position:relative">${list(() => `${btn("", { c: "sm ic", i: "pencil" })}${btn("", { c: "sm ic", i: "log-in" })}${btn("", { c: "sm ic", i: "key-round" })}${btn("", { c: "sm ic", i: "user-x" })}${btn("", { c: "sm ic dng", k: "dng", i: "trash-2" })}`, { aw: 190 })}
     <div class="tip" style="right:110px;top:132px">Reset password</div></div>`,
    330
  );
  const c = sk(
    "4C",
    "Select rows, act in a bar",
    "actions appear once rows are checked",
    `<div class="body"><div class="row" style="height:48px;background:var(--navy);color:var(--white);padding:0 12px;border-radius:var(--r);margin-bottom:10px;gap:8px"><b style="min-width:110px">2 selected</b>${btn("Edit", { k: "on-dark", i: "pencil" })}${btn("Reset password", { k: "on-dark", i: "key-round" })}${btn("Log in as", { k: "on-dark", i: "log-in", c: "dis" })}${btn("Deactivate", { k: "on-dark", i: "user-x" })}${btn("Activate", { k: "on-dark", i: "user-check" })}${btn("Delete", { k: "on-dark", i: "trash-2" })}<div class="grow"></div>${btn("", { k: "on-dark", c: "ic", i: "x" })}</div>
     ${list(() => `${btn("", { c: "sm ic gh", i: "ellipsis" })}`, { sel: 1, selRows: [1, 3], aw: 70 })}</div>`,
    360
  );
  return { id: "p4", n: "4", name: "Row actions (Edit, Delete, Reset password, Log in as, Activate, Deactivate, Convert)", html: a + b + c };
};

/* ---------- 5 Edit record ---------- */
const editGrid = (cols = 4) => `<div class="gridf" style="grid-template-columns:repeat(${cols},1fr)">
  ${fld("Name", "Zara Malik", { v: 1 })}${fld("Status", "Active", { dd: 1, v: 1 })}${fld("Course", "IGCSE", { dd: 1, v: 1 })}${fld("Batch", "B14", { dd: 1, v: 1 })}
  ${fld("Timezone", "Asia/Kolkata", { dd: 1, v: 1 })}${fld("Currency", "INR", { dd: 1, v: 1 })}${fld("WhatsApp #", "+91 98100 00412", { v: 1 })}${fld("Parent WhatsApp #", "+91 98100 10412", { v: 1 })}
  ${fld("Parent Email", "parent.malik@example.com", { v: 1 })}${fld("Email", "zara@example.com", { v: 1 })}${fld("School", "Delhi Public", { v: 1 })}${fld("Location", "Delhi", { v: 1 })}
  ${fld("Notes", "", { s: `grid-column:span ${cols === 4 ? 2 : 3}` })}${fld("Timesheet", "Link", { i: "file-text" })}${fld("Progress Tracker", "Link", { i: "file-text" })}</div>
  <div class="row" style="gap:20px;margin-top:14px">${["Group Sent", "GCR Sent", "Schedule Sent"].map((t, i) => `<span class="row" style="gap:8px">${cb(i !== 1)}${t}</span>`).join("")}</div>`;
export const part5 = () => {
  const dimRows = (n) => `<div style="opacity:.55">${miniAccounts(n)}</div>`;
  const a = sk(
    "5A",
    "Expands in place",
    "row opens into the form",
    `<div class="body"><table class="tbl"><colgroup><col style="width:108px"><col style="width:230px"><col style="width:130px"><col style="width:110px"><col style="width:90px"><col><col style="width:170px"></colgroup><tbody><tr class="sel"><td class="mono">STU-0412</td><td><b>Zara Malik</b></td><td>${chip("Active", "ok")}</td><td>IGCSE</td><td>B14</td><td class="mut">zara@example.com</td><td class="mono">+91 98100 00412</td></tr></tbody></table>
     <div class="surf" style="padding:16px;border-top:0;border-radius:0 0 4px 4px">${editGrid(4)}<div class="row" style="margin-top:16px">${btn("Save", { k: "pri", i: "save" })}${btn("Cancel")}<div class="grow"></div>${btn("Reset password", { i: "key-round" })}${btn("Delete", { k: "dng", i: "trash-2" })}</div></div></div>`,
    480
  );
  const b = sk(
    "5B",
    "Bottom sheet",
    "list stays visible above",
    `<div class="body">${miniAccounts(6)}</div><div class="dimmer"></div>
     <div class="sheet" style="top:150px"><div class="grip"></div><div class="row" style="padding:4px 24px 12px"><b style="font-size:20px">Zara Malik</b><span class="mono mut">STU-0412</span>${chip("Active", "ok")}<div class="grow"></div>${btn("", { c: "ic", i: "x" })}</div>
     <div style="padding:0 24px 16px">${editGrid(4)}</div><div class="row" style="padding:12px 24px;border-top:1px solid var(--lb);background:var(--off)">${btn("Save", { k: "pri", i: "save" })}${btn("Cancel")}<div class="grow"></div>${btn("Log in as", { i: "log-in" })}${btn("Reset password", { i: "key-round" })}${btn("Deactivate", { i: "user-x" })}${btn("Delete", { k: "dng", i: "trash-2" })}</div></div>`,
    580
  );
  const c = sk(
    "5C",
    "Own page with back",
    "record gets the full width",
    `<div class="bar1" style="height:48px">${btn("Accounts", { k: "on-dark", i: "chevron-left" })}<b style="font-size:18px">Zara Malik</b><span class="mono" style="opacity:.8">STU-0412</span>${chip("Active", "ok").replace("<span", '<span style="color:var(--white)"')}<div class="grow"></div>${btn("Log in as", { k: "on-dark", i: "log-in" })}${btn("Reset password", { k: "on-dark", i: "key-round" })}${btn("Deactivate", { k: "on-dark", i: "user-x" })}${btn("Delete", { k: "on-dark", i: "trash-2" })}</div>
     <div class="tabs"><span class="on">Profile</span><span>Contact</span><span>Tracking</span><span>Credentials</span><span>Schedule</span></div>
     <div class="body"><div class="surf" style="padding:20px">${editGrid(4)}</div></div>
     <div class="row" style="position:absolute;left:0;right:0;bottom:0;height:60px;padding:0 24px;background:var(--white);border-top:1px solid var(--lb)">${btn("Save", { k: "pri", i: "save" })}${btn("Cancel")}</div>`,
    640
  );
  return { id: "p5", n: "5", name: "Edit record", html: a + b + c };
};
