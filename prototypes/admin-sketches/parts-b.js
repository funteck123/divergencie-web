import { I, btn, chip, tag, input, fld, cb, pips, steps, TABS, TAB_ICON, ST, stCls, sk, actionBtns, brand, topBar, tabsBar, miniAccounts, fade } from "./kit.js";

const title = (t) => `<div style="font:600 22px var(--font);color:var(--navy)">${t}</div>`;
const more = () => btn("", { c: "sm ic", i: "ellipsis" });
const editDel = () => `<span class="row" style="gap:4px;justify-content:flex-end">${btn("Edit", { c: "sm", i: "pencil", is: 14 })}${btn("Delete", { c: "sm", k: "dng", i: "trash-2", is: 14 })}</span>`;
const dimBack = (n = 3) => `<div style="margin-top:14px">${miniAccounts(n)}</div>`;

/* ---------- 6 Create forms ---------- */
export const part6 = () => {
  const a = sk(
    "6A",
    "Strip under the toolbar",
    "one row, collapses after create",
    `<div class="body"><div class="row" style="gap:12px">${title("Accounts")}<div class="grow"></div>${btn("Create account", { k: "nav", i: "chevron-up" })}</div>
     <div class="surf" style="padding:16px;margin-top:12px"><div class="row" style="gap:12px;align-items:flex-end">${fld("Account type", "Parent", { dd: 1, v: 1, s: "width:180px" })}${fld("Name", "Name", { s: "width:240px" })}${fld("Currency", "INR — Indian Rupee", { dd: 1, v: 1, s: "width:220px" })}${fld("Linked student(s)", "Zara Malik, Leo Tan", { dd: 1, v: 1, s: "flex:1" })}${btn("Create account", { k: "pri", i: "plus" })}${btn("Cancel")}</div></div>${dimBack(3)}</div>`,
    330
  );
  const b = sk(
    "6B",
    "Draft row at the top of the list",
    "type into the row, confirm with the check",
    `<div class="body"><div class="row" style="gap:12px;margin-bottom:12px">${title("Accounts")}<div class="grow"></div>${btn("Create account", { k: "pri", i: "plus" })}</div>
     <table class="tbl"><colgroup><col style="width:150px"><col style="width:230px"><col style="width:130px"><col style="width:110px"><col style="width:90px"><col><col style="width:170px"><col style="width:104px"></colgroup>
     <thead><tr><th>ID</th><th>Name</th><th>Status</th><th>Course</th><th>Batch</th><th>Email</th><th>WhatsApp #</th><th></th></tr></thead>
     <tbody><tr class="sel"><td>${input("Student", { dd: 1, v: 1 })}</td><td>${input("Name", { s: "border-color:var(--navy)" })}</td><td>${chip("Active", "ok")}</td><td>${input("Course", { dd: 1 })}</td><td>${input("Batch", { dd: 1 })}</td><td>${input("Email")}</td><td>${input("WhatsApp #")}</td><td><span class="row" style="gap:4px;justify-content:flex-end">${btn("", { c: "sm ic", k: "pri", i: "check" })}${btn("", { c: "sm ic", i: "x" })}</span></td></tr>
     ${ST.slice(0, 3).map((r) => `<tr><td class="mono">${r.id}</td><td><b>${r.n}</b></td><td>${chip(r.s, stCls(r.s))}</td><td>${r.c}</td><td>${r.b}</td><td class="mut">${r.e}</td><td class="mono">${r.w}</td><td></td></tr>`).join("")}</tbody></table></div>`,
    330
  );
  const sec = (t, inner) => `<div class="surf" style="padding:16px;margin-bottom:12px"><div class="row" style="margin-bottom:12px"><b style="font-size:16px">${t}</b></div>${inner}</div>`;
  const c = sk(
    "6C",
    "Full-width form page, sections stacked",
    "Create service, the longest form",
    `<div class="bar1" style="height:48px">${btn("Services", { k: "on-dark", i: "chevron-left" })}<b style="font-size:18px">Create service</b><div class="grow"></div>${btn("Report an Issue", { k: "on-dark", i: "life-buoy" })}${btn("Sign out", { k: "on-dark", i: "log-out" })}</div>
     <div class="body">
     ${sec("Service", `<div class="gridf" style="grid-template-columns:repeat(6,1fr);align-items:end">${fld("Type", "Course", { dd: 1, v: 1 })}${fld("Group", "Course", { dd: 1, v: 1 })}${fld("Board", "CIE", { dd: 1, v: 1 })}${fld("Course", "IGCSE", { dd: 1, v: 1 })}${fld("Subject", "Physics 0625", { dd: 1, v: 1 })}${btn("Suggest", { i: "rotate-ccw" })}${fld("Name", "Cambridge IGCSE 0625 Physics", { v: 1, s: "grid-column:span 6" })}</div>`)}
     ${sec("Component", `<div class="row" style="gap:12px;margin-bottom:12px">${fld("Component", "Paper 2", { v: 1, s: "width:240px" })}${btn("Add batch", { i: "plus" })}${btn("Add optional component", { i: "plus" })}</div>
       <div class="gridf" style="grid-template-columns:repeat(6,1fr);align-items:end">${fld("Batch", "B14", { v: 1 })}${fld("Amount", "28", { v: 1 })}${fld("Currency", "USD", { dd: 1, v: 1 })}${fld("Billing type", "Hourly", { dd: 1, v: 1 })}${fld("Group", "Student", { dd: 1, v: 1 })}${btn("Add rate", { i: "plus" })}
       ${fld("Day", "Monday", { dd: 1, v: 1 })}${fld("Start", "16:00", { v: 1 })}${fld("End", "17:00", { v: 1 })}${fld("Facilitator", "Teacher 04", { dd: 1, v: 1, s: "grid-column:span 2" })}${btn("Add occurrence", { i: "plus" })}</div>
       <div class="row" style="margin-top:12px">${btn("Add link", { i: "plus" })}</div>`)}</div>
     <div class="row" style="position:absolute;left:0;right:0;bottom:0;height:60px;padding:0 24px;background:var(--white);border-top:1px solid var(--lb)">${btn("Create service", { k: "pri", i: "plus" })}${btn("Cancel")}</div>`,
    640
  );
  return { id: "p6", n: "6", name: "Create forms (Create account, Create service)", html: a + b + c };
};

/* ---------- 7 Grouped lists ---------- */
const SV = [
  ["SRV-014", "Physics Group A", "CIE", "Physics 0625", "Paper 2", "B14", "USD 28 / hr", "Mon, Wed 16:00"],
  ["SRV-015", "Physics Group B", "CIE", "Physics 0625", "Paper 4", "B15", "USD 28 / hr", "Tue, Thu 17:00"],
  ["SRV-031", "Physics 1:1", "CIE", "Physics 0625", "All", "—", "USD 42 / hr", "Flexible"],
];
const svTable = (rows, act = 1) => `<table class="tbl"><colgroup><col style="width:100px"><col style="width:200px"><col style="width:70px"><col style="width:170px"><col style="width:110px"><col style="width:70px"><col style="width:130px"><col><col style="width:${act ? 110 : 10}px"></colgroup>
  <thead><tr><th>ID</th><th>Name</th><th>Board</th><th>Subject</th><th>Component</th><th>Batch</th><th>Rate</th><th>Occurrences</th><th></th></tr></thead>
  <tbody>${rows.map((r) => `<tr>${r.map((c, i) => `<td class="${i === 0 ? "mono" : ""}">${i === 1 ? `<b>${c}</b>` : c}</td>`).join("")}<td>${act ? `<span class="row" style="gap:4px;justify-content:flex-end">${btn("", { c: "sm ic", i: "pencil" })}${btn("", { c: "sm ic", k: "dng", i: "trash-2" })}</span>` : ""}</td></tr>`).join("")}</tbody></table>`;
export const part7 = () => {
  const groups = [["Book", 4], ["Counselling", 6], ["Admissions", 3], ["Teacher", 9], ["Staff", 7], ["Management", 3], ["Parent", 2], ["Role", 5], ["Ambassador", 2]];
  const bar = (n, c, open) => `<div class="grp" style="margin-top:${open ? 0 : 1}px">${I(open ? "chevron-down" : "chevron-right", 16)}${n}<span class="tag" style="background:var(--white)">${c}</span></div>`;
  const a = sk(
    "7A",
    "Collapsible group bars (Services)",
    "one open, nine folded",
    `<div class="body"><div class="row" style="margin-bottom:12px">${title("Services")}${input("Search", { i: "search", s: "width:260px" })}${btn("Filter", { i: "funnel" })}<div class="grow"></div>${btn("Create service", { k: "pri", i: "plus" })}</div>
     ${bar("Course", 34, 1)}${svTable(SV)}${groups.map(([n, c]) => bar(n, c, 0)).join("")}</div>${fade}`,
    480
  );
  const segs = [["Course", 34, 1], ["Book", 4], ["Counselling", 6], ["Admissions", 3], ["Teacher", 9], ["Staff", 7], ["Management", 3], ["Parent", 2], ["Role", 5], ["Ambassador", 2]];
  const b = sk(
    "7B",
    "Group switcher, one list at a time",
    "counts on every group",
    `<div class="body"><div class="row" style="margin-bottom:12px">${title("Services")}${input("Search", { i: "search", s: "width:260px" })}${btn("Filter", { i: "funnel" })}<div class="grow"></div>${btn("Create service", { k: "pri", i: "plus" })}</div>
     <div style="margin-bottom:12px"><span class="seg">${segs.map(([n, c, on]) => `<span class="${on ? "on" : ""}" style="padding:0 10px">${n}<em>${c}</em></span>`).join("")}</span></div>${svTable(SV)}</div>`,
    330
  );
  const person = (n, c, open) => `<div class="row" style="height:48px;padding:0 16px;gap:12px;background:var(--white);border-bottom:1px solid var(--lb)">${I(open ? "chevron-down" : "chevron-right", 16)}<b style="width:220px">${n}</b><span class="tag">${c} services</span><div class="grow"></div>${btn("Add service", { c: "sm", i: "plus", is: 14 })}</div>`;
  const cc = sk(
    "7C",
    "People list, enroll strip on top (Enrollments)",
    "rows open into that person's services",
    `<div class="body"><div class="row" style="margin-bottom:12px">${title("Enrollments")}<span class="seg"><span class="on">Students</span><span>Teachers</span><span>Staff</span></span>${input("Search", { i: "search", s: "width:240px" })}<div class="grow"></div>${btn("Enroll", { k: "nav", i: "plus" })}</div>
     <div class="surf" style="padding:12px 16px;margin-bottom:12px"><div class="row" style="gap:12px;align-items:flex-end">${fld("Student", "Select", { dd: 1, s: "width:220px" })}${fld("Service", "Select", { dd: 1, s: "flex:1" })}${btn("Add another service", { i: "plus" })}${fld("Start", "dd/mm/yyyy", { i: "calendar", s: "width:150px" })}${fld("End", "dd/mm/yyyy", { i: "calendar", s: "width:150px" })}${btn("Enroll into 1 service", { k: "pri" })}</div></div>
     <div class="surf" style="overflow:hidden">${person("Zara Malik", 3, 1)}
     <table class="tbl"><colgroup><col style="width:56px"><col><col style="width:80px"><col style="width:130px"><col style="width:120px"><col style="width:120px"><col style="width:110px"></colgroup><thead><tr><th></th><th>Service</th><th>Batch</th><th>Rate</th><th>Start</th><th>End</th><th></th></tr></thead><tbody>
     ${[["Cambridge IGCSE 0625 Physics", "B14", "INR 2,300"], ["Cambridge IGCSE 0580 Maths", "B14", "INR 2,300"], ["Cambridge IGCSE 0510 English", "B14", "INR 2,300"]].map(([s, b, r]) => `<tr><td></td><td>${s}</td><td>${b}</td><td>${r}</td><td>01 Jul 2026</td><td>—</td><td>${editDelLite()}</td></tr>`).join("")}</tbody></table>
     ${person("Leo Tan", 2, 0)}${person("Priya Nair", 1, 0)}${person("Omar Haddad", 4, 0)}</div></div>${fade}`,
    640
  );
  return { id: "p7", n: "7", name: "Grouped lists (Services groups, Enrollments)", html: a + b + cc };
};
function editDelLite() {
  return `<span class="row" style="gap:4px;justify-content:flex-end">${btn("", { c: "sm ic", i: "pencil" })}${btn("", { c: "sm ic", k: "dng", i: "trash-2" })}</span>`;
}

/* ---------- 8 Pipeline queues ---------- */
const PR = [
  ["Staff Interview", "Dana Reyes", "DC Staff · Associate Project Manager"],
  ["Teacher Interview", "Ivan Petrov", "Cambridge IGCSE 0580 Maths"],
  ["Teacher Interview", "Amira Khan", "Cambridge IGCSE 0620 Chemistry"],
  ["Teacher Interview", "Noel Park", "Cambridge A Level 9709 Maths"],
];
const TR = [
  ["Zara Malik", "IGCSE Physics", 2, "Thu 15:00", "Teacher 04"],
  ["Leo Tan", "A Level Chemistry", 3, "Fri 10:00", "Teacher 09"],
  ["Omar Haddad", "IGCSE Maths", 1, "—", "—"],
];
export const part8 = () => {
  const pend = `<table class="tbl"><colgroup><col style="width:150px"><col style="width:180px"><col><col style="width:230px"><col style="width:340px"></colgroup><thead><tr><th>Type</th><th>Requester</th><th>Service</th><th>Assign slot</th><th></th></tr></thead><tbody>
   ${PR.map((r) => `<tr><td>${r[0]}</td><td><b>${r[1]}</b></td><td class="mut">${r[2]}</td><td>${input("Select an open slot", { dd: 1, s: "height:28px" })}</td><td><span class="row" style="gap:4px;justify-content:flex-end">${btn("Approve", { c: "sm", k: "nav" })}${btn("New slot instead", { c: "sm", i: "plus", is: 14 })}${btn("Reject", { c: "sm", k: "dng" })}</span></td></tr>`).join("")}</tbody></table>`;
  const a = sk(
    "8A",
    "Queue switcher, one table at a time",
    "four queues, counts visible",
    `<div class="body"><div class="row" style="margin-bottom:12px">${title("Pipeline")}<span class="seg"><span>Trial Pipeline<em>3</em></span><span>Interview Pipeline<em>2</em></span><span>Inquiries<em>4</em></span><span class="on">Pending Requests<em>4</em></span></span><div class="grow"></div>${btn("Filter", { i: "funnel" })}</div>${pend}</div>`,
    330
  );
  const all = [
    ...TR.map((r) => ["Trial", r[0], r[1], r[2], "Copy Trial Message", "copy"]),
    ["Interview", "Ivan Petrov", "Cambridge IGCSE 0580 Maths", 2, "Send Task", "send"],
    ["Interview", "Amira Khan", "Cambridge IGCSE 0620 Chemistry", 4, "Send offer", "send"],
    ["Request", "Noel Park", "Cambridge A Level 9709 Maths", 0, "Approve", "check"],
  ];
  const b = sk(
    "8B",
    "One queue, one next action per row",
    "stage and type in columns, rest in menu",
    `<div class="body"><div class="row" style="margin-bottom:12px">${title("Pipeline")}${input("Search", { i: "search", s: "width:260px" })}<span class="seg"><span class="on">All<em>13</em></span><span>Trial</span><span>Interview</span><span>Inquiry</span><span>Request</span></span><div class="grow"></div>${btn("Filter", { i: "funnel" })}</div>
     <table class="tbl"><colgroup><col style="width:110px"><col style="width:190px"><col><col style="width:150px"><col style="width:210px"><col style="width:100px"></colgroup><thead><tr><th>Type</th><th>Name</th><th>Service</th><th>Progress</th><th></th><th></th></tr></thead><tbody>
     ${all.map((r) => `<tr><td>${tag(r[0])}</td><td><b>${r[1]}</b></td><td class="mut">${r[2]}</td><td>${r[3] ? steps(r[3], 5) : ""}</td><td>${btn(r[4], { c: "sm", k: "nav", i: r[5], is: 14 })}</td><td><span class="row" style="justify-content:flex-end">${more()}</span></td></tr>`).join("")}</tbody></table></div>`,
    430
  );
  const accBar = (n, c, open) => `<div class="grp">${I(open ? "chevron-down" : "chevron-right", 16)}${n}<span class="tag" style="background:var(--white)">${c}</span></div>`;
  const cc = sk(
    "8C",
    "Folded sections with counts",
    "section with work stays open",
    `<div class="body"><div class="row" style="margin-bottom:12px">${title("Pipeline")}<div class="grow"></div>${btn("Filter", { i: "funnel" })}</div>
     ${accBar("Pending Requests", 4, 0)}${accBar("Trial Pipeline", 3, 1)}
     <table class="tbl"><colgroup><col style="width:170px"><col style="width:190px"><col style="width:150px"><col style="width:130px"><col style="width:130px"><col style="width:210px"><col style="width:90px"><col></colgroup><thead><tr><th>Name</th><th>Service</th><th>Progress</th><th>Scheduled</th><th>Instructor</th><th>Message</th><th>Feedback</th><th></th></tr></thead><tbody>
     ${TR.map((r) => `<tr><td><b>${r[0]}</b></td><td>${r[1]}</td><td>${steps(r[2], 5)}</td><td>${r[3]}</td><td>${r[4]}</td><td>${btn("Copy Trial Message", { c: "sm", i: "copy", is: 14 })}</td><td>${btn("", { c: "sm ic", i: "message-square-plus" })}</td><td><span class="row" style="gap:4px;justify-content:flex-end">${btn("Convert", { c: "sm", k: "nav" })}${btn("Reject", { c: "sm", k: "dng" })}</span></td></tr>`).join("")}</tbody></table>
     ${accBar("Interview Pipeline", 2, 0)}${accBar("Inquiries", 4, 0)}</div>`,
    430
  );
  return { id: "p8", n: "8", name: "Pipeline queues (Trial, Interview, Inquiries, Pending Requests)", html: a + b + cc };
};

/* ---------- 9 Schedule ---------- */
export const part9 = () => {
  const bar = `<div class="row" style="margin-bottom:12px">${title("Schedule")}<span class="seg"><span>List</span><span class="on">Calendar</span></span>${btn("", { c: "ic", i: "chevron-left" })}${btn("Today")}${btn("", { c: "ic", i: "chevron-right" })}<b style="margin-left:8px">September 2026</b><div class="grow"></div>${btn("Filter", { i: "funnel" })}${btn("Weekly Schedule Image", { i: "file-text" })}${btn("Offer slot", { k: "pri", i: "plus" })}</div>`;
  const barList = bar.replace('<span class="seg"><span>List</span><span class="on">Calendar</span></span>', '<span class="seg"><span class="on">List</span><span>Calendar</span></span>');
  const slot = (d, t, s, w, bad) => `<div class="row" style="height:44px;padding:0 16px;gap:16px;background:var(--white);border-bottom:1px solid var(--lb)"><span class="mono" style="width:90px">${t} IST</span><b style="width:340px" class="tr">${s}</b><span style="width:160px" class="mut">${w}</span>${bad ? chip("Conflict", "bad") : ""}<div class="grow"></div>${bad ? btn("Resolve", { c: "sm", k: "nav" }) : ""}${more()}</div>`;
  const a = sk(
    "9A",
    "Agenda by day, conflicts pinned",
    "list view, nothing wider than the screen",
    `<div class="body">${barList}
     <div class="surf" style="overflow:hidden;margin-bottom:12px"><div class="grp" style="background:var(--coral);color:var(--white)">${I("circle-alert", 16)}Conflicts<span class="tag" style="background:var(--white)">2</span></div>${slot("", "16:00", "Cambridge IGCSE 0625 Physics #6", "Teacher 04", 1)}${slot("", "16:00", "DC Staff · Finance Manager #8", "Teacher 04", 1)}</div>
     <div class="surf" style="overflow:hidden"><div class="grp">Mon 28 Sep</div>${slot("", "09:00", "Cambridge IGCSE 0580 Maths #7", "Teacher 02")}${slot("", "11:30", "Cambridge A Level 9701 Chemistry #3", "Teacher 09")}<div class="grp">Tue 29 Sep</div>${slot("", "16:00", "Cambridge IGCSE 0625 Physics #7", "Teacher 04")}${slot("", "17:00", "Cambridge A Level 9709 Maths #2", "Teacher 05")}</div></div>${fade}`,
    470
  );
  const day = (n, pills, bad) => `<div><b>${n}</b>${pills.map((p, i) => `<span class="pill ${bad && i === 0 ? "x" : ""}">${p}</span>`).join("")}</div>`;
  const b = sk(
    "9B",
    "Month grid, pills",
    "+N more opens the day",
    `<div class="body">${bar}<div class="cal">${["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((h) => `<div style="min-height:0;background:var(--lb);font-weight:600;color:var(--navy)">${h}</div>`).join("")}
     ${[...Array(28)].map((_, i) => { const n = i + 1; const p = n % 7 === 3 ? ["16:00 Physics #6", "16:00 Finance #8", "17:00 Maths #2"] : n % 7 === 5 ? ["09:00 Maths #7"] : n % 7 === 1 ? ["11:30 Chemistry #3", "16:00 Physics #7"] : []; return day(n, p.slice(0, 2), n === 17).replace("</div>", p.length > 2 ? `<span class="more">+${p.length - 2} more</span></div>` : "</div>"); }).join("")}</div></div>`,
    570
  );
  const hours = [8, 10, 12, 14, 16, 18, 20, 22];
  const gb = (l, w, t, c = "") => `<b class="${c}" style="left:${l}%;width:${w}%">${t}</b>`;
  const gantt = (n, bars) => `<div class="row" style="background:var(--white)"><div style="width:140px;padding:0 12px;font-weight:600">${n}</div><div class="gantt grow">${bars}</div></div>`;
  const c = sk(
    "9C",
    "Day timeline per instructor",
    "conflicts show as overlapping red bars",
    `<div class="body">${bar.replace("<b style=\"margin-left:8px\">September 2026</b>", '<b style="margin-left:8px">Wed 30 Sep</b>')}
     <div class="surf" style="overflow:hidden"><div class="row" style="height:32px;background:var(--lb)"><div style="width:140px;padding:0 12px;font-weight:600;color:var(--navy)">Instructor</div><div class="grow" style="display:flex;justify-content:space-between;padding-right:8px;font-size:12px;color:var(--navy)">${hours.map((h) => `<span>${h}:00</span>`).join("")}</div></div>
     ${gantt("Teacher 02", gb(7, 12, "Maths #7") + gb(48, 12, "Maths #8"))}
     ${gantt("Teacher 04", gb(57, 13, "Physics #6", "x") + `<b class="x" style="left:62%;width:13%;opacity:.88">Finance #8</b>`)}
     ${gantt("Teacher 05", gb(64, 12, "Maths #2", "s"))}
     ${gantt("Teacher 09", gb(25, 14, "Chemistry #3") + gb(70, 10, "Chem #4"))}</div>
     <div class="row" style="margin-top:12px">${btn("Resolve", { k: "nav" })}${chip("2 conflicts", "bad")}</div></div>`,
    330
  );
  return { id: "p9", n: "9", name: "Schedule (List, Calendar, conflicts, Offer slot)", html: a + b + c };
};

/* ---------- 10 Billing ---------- */
export const part10 = () => {
  const tools = `<div class="row" style="gap:12px;margin-bottom:12px">${title("Billing")}${fld("Year", "2026", { dd: 1, v: 1, s: "width:100px" })}${fld("Month", "September", { dd: 1, v: 1, s: "width:150px" })}<div class="grow"></div>${btn("Generate drafts for this month", { k: "pri", i: "plus" })}${btn("Rebuild", { i: "rotate-ccw" })}${btn("Create draft", { i: "plus" })}</div>`;
  const toolsRow = tools.replace(/<div class="row" style="gap:12px;margin-bottom:12px">/, '<div class="row" style="gap:12px;margin-bottom:12px;align-items:flex-end">');
  const segs = `<div class="row" style="margin-bottom:12px"><span class="seg"><span class="on">Invoices · Students<em>26</em></span><span>Paychecks · Teachers<em>14</em></span><span>Paychecks · Staff<em>6</em></span></span><div class="grow"></div>${input("Search", { i: "search", s: "width:260px" })}${btn("Filter", { i: "funnel" })}</div>`;
  const BR = [
    ["Zara Malik", "Physics, Maths", "Sep 2026", "USD 448", "USD 224", "₹ 37,200", "₹ 18,600", "Sent", "info", "—"],
    ["Leo Tan", "Chemistry", "Sep 2026", "MYR 320", "MYR 0", "₹ 5,900", "₹ 0", "Settled", "ok", "28 Sep"],
    ["Omar Haddad", "Maths, English", "Sep 2026", "SAR 400", "SAR 400", "₹ 8,900", "₹ 8,900", "Draft", "", "—"],
    ["Mei Lin", "Physics", "Sep 2026", "USD 560", "USD 560", "₹ 46,500", "₹ 46,500", "Needs approval", "warn", "29 Sep"],
  ];
  const a = sk(
    "10A",
    "Tools in one row, merged amount cells",
    "9 columns become 7, no sideways scroll",
    `<div class="body">${toolsRow}${segs}
     <table class="tbl"><colgroup><col style="width:40px"><col style="width:180px"><col><col style="width:110px"><col style="width:150px"><col style="width:150px"><col style="width:170px"><col style="width:100px"></colgroup>
     <thead><tr><th></th><th>Student</th><th>Subjects</th><th>Period</th><th class="num">Amount / Due</th><th class="num">INR Amount / Due</th><th>Status</th><th>Paid</th></tr></thead><tbody>
     ${BR.map((r) => `<tr><td>${I("chevron-right", 16)}</td><td><b>${r[0]}</b></td><td class="mut">${r[1]}</td><td>${r[2]}</td><td class="num"><div class="cell2" style="align-items:flex-end"><span>${r[3]}</span><small>due ${r[4]}</small></div></td><td class="num"><div class="cell2" style="align-items:flex-end"><span>${r[5]}</span><small>due ${r[6]}</small></div></td><td>${chip(r[7], r[8])}</td><td>${r[9]}</td></tr>`).join("")}</tbody></table></div>`,
    430
  );
  const person = (n, meta, open) => `<div class="row" style="height:48px;padding:0 16px;gap:12px;background:var(--white);border-bottom:1px solid var(--lb)">${I(open ? "chevron-down" : "chevron-right", 16)}<b style="width:200px">${n}</b>${meta.map(([t, k]) => chip(t, k)).join("")}<div class="grow"></div><b class="num" style="width:120px">USD 448</b><span class="num mut" style="width:110px">due 224</span></div>`;
  const b = sk(
    "10B",
    "Person ledger with totals",
    "each person one row, invoices inside",
    `<div class="body">${toolsRow}${segs}<div class="surf" style="overflow:hidden">${person("Zara Malik", [["2 invoices", ""], ["1 draft", ""], ["1 sent", "info"]], 1)}
     <table class="tbl"><colgroup><col style="width:56px"><col><col style="width:110px"><col style="width:130px"><col style="width:130px"><col style="width:170px"><col style="width:190px"></colgroup><thead><tr><th></th><th>Subjects</th><th>Period</th><th class="num">Amount</th><th class="num">Amount due</th><th>Status</th><th></th></tr></thead><tbody>
     <tr><td></td><td>Physics, Maths</td><td>Sep 2026</td><td class="num">USD 448</td><td class="num">USD 224</td><td>${chip("Needs approval", "warn")}</td><td><span class="row" style="gap:4px;justify-content:flex-end">${btn("Approve", { c: "sm", k: "nav" })}${btn("Partial", { c: "sm" })}${more()}</span></td></tr>
     <tr><td></td><td>Physics</td><td>Aug 2026</td><td class="num">USD 224</td><td class="num">USD 0</td><td>${chip("Settled", "ok")}</td><td></td></tr></tbody></table>
     ${person("Leo Tan", [["1 invoice", ""], ["1 settled", "ok"]], 0)}${person("Omar Haddad", [["2 invoices", ""], ["1 draft", ""]], 0)}${person("Mei Lin", [["1 invoice", ""], ["needs approval", "warn"]], 0)}</div></div>`,
    580
  );
  const lane = (n, c, on) => `<span class="${on ? "on" : ""}">${n}<em>${c}</em></span>`;
  const c = sk(
    "10C",
    "Lifecycle lanes",
    "Draft, Sent, Needs approval, Settled",
    `<div class="body">${toolsRow}<div class="row" style="margin-bottom:12px"><span class="seg">${lane("Draft", 9)}${lane("Sent", 11)}${lane("Needs approval", 3, 1)}${lane("Settled", 54)}</span><span class="steps" style="margin-left:8px"><i class="on"></i><u></u><i class="on"></i><u></u><i class="on"></i><u></u><i></i></span><div class="grow"></div>${input("Search", { i: "search", s: "width:260px" })}</div>
     <table class="tbl"><colgroup><col style="width:180px"><col style="width:160px"><col><col style="width:130px"><col style="width:140px"><col style="width:140px"><col style="width:250px"></colgroup><thead><tr><th>Person</th><th>Role</th><th>Subjects</th><th>Period</th><th class="num">Amount</th><th class="num">Due</th><th></th></tr></thead><tbody>
     ${[["Mei Lin", "Student", "Physics", "USD 560", "USD 560"], ["Zara Malik", "Student", "Physics, Maths", "USD 448", "USD 224"], ["Teacher 07", "Teacher", "Chemistry", "GBP 320", "GBP 320"]].map((r) => `<tr><td><b>${r[0]}</b></td><td>${tag(r[1])}</td><td class="mut">${r[2]}</td><td>Sep 2026</td><td class="num">${r[3]}</td><td class="num">${r[4]}</td><td><span class="row" style="gap:4px;justify-content:flex-end">${btn("Approve", { c: "sm", k: "nav" })}${btn("Partial", { c: "sm" })}${btn("", { c: "sm ic", k: "dng", i: "trash-2" })}</span></td></tr>`).join("")}</tbody></table></div>`,
    420
  );
  return { id: "p10", n: "10", name: "Billing (Generate, Rebuild, Create, invoices and paychecks)", html: a + b + c };
};

/* ---------- 11 Tickets ---------- */
const TK = [
  ["TKT-0310", "Parent · PAR-0120", "Invoice shows the wrong total for September and the", "1", "Sep 30 09:14", "", 0],
  ["TKT-0309", "Student · STU-0412", "Cannot open yearly paper from the solver after login", "", "Sep 29 18:02", "", 0],
  ["TKT-0308", "Teacher · TCH-0007", "Session time shows the wrong timezone on my schedule", "2", "Sep 29 11:40", "", 1],
  ["TKT-0307", "Staff · STF-0003", "Old Physics papers refuse to grade in Paper 3", "", "Sep 28 15:20", "Sep 30", 0],
];
const tkActions = () => `<span class="row" style="gap:4px;justify-content:flex-end">${btn("", { c: "sm ic", i: "message-square-plus" })}${btn("", { c: "sm ic", i: "pencil" })}${btn("", { c: "sm ic", i: "check" })}${btn("", { c: "sm ic", i: "pause" })}</span>`;
export const part11 = () => {
  const head = `<div class="row" style="margin-bottom:12px">${title("Tickets")}${input("Search", { i: "search", s: "width:260px" })}<div class="grow"></div>${btn("Filter", { i: "funnel" })}${btn("Check Uptime", { i: "clock" })}</div>`;
  const a = sk(
    "11A",
    "Inbox rows, icon actions",
    "Note, Edit, Close, Hold as icons with tooltips",
    `<div class="body">${head}<table class="tbl"><colgroup><col style="width:100px"><col style="width:180px"><col><col style="width:90px"><col style="width:140px"><col style="width:100px"><col style="width:180px"></colgroup><thead><tr><th>Ticket #</th><th>Sender</th><th>Message</th><th>Attachment</th><th>Created</th><th>Closed</th><th></th></tr></thead><tbody>
     ${TK.map((r) => `<tr class="${r[5] ? "dim" : ""}"><td class="mono">${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3] ? I("file-text", 16) : ""}</td><td>${r[4]}</td><td>${r[5] || "—"}</td><td>${tkActions()}</td></tr>`).join("")}</tbody></table>
     <div class="tip" style="right:136px;top:142px">+ Note</div></div>`,
    330
  );
  const b = sk(
    "11B",
    "Status lanes, thread opens under row",
    "Open, On hold, Closed",
    `<div class="body">${head.replace('<div class="grow"></div>', '<span class="seg"><span class="on">Open<em>3</em></span><span>On hold<em>1</em></span><span>Closed<em>38</em></span></span><div class="grow"></div>')}
     <div class="surf" style="overflow:hidden">${TK.slice(0, 2).map((r, i) => `<div class="row" style="height:48px;padding:0 16px;gap:16px;border-bottom:1px solid var(--lb)">${I(i === 0 ? "chevron-down" : "chevron-right", 16)}<span class="mono" style="width:84px">${r[0]}</span><span style="width:170px" class="mut">${r[1]}</span><b class="grow tr">${r[2]}</b><span class="mut" style="width:110px">${r[4]}</span>${btn("Close", { c: "sm", i: "check", is: 14 })}${btn("Hold", { c: "sm", i: "pause", is: 14 })}</div>${i === 0 ? `<div style="padding:12px 16px 16px 52px;background:var(--off);border-bottom:1px solid var(--lb)"><div class="surf" style="padding:10px 12px;margin-bottom:8px">Invoice shows the wrong total for September and the amount due does not match.</div><div class="row" style="gap:8px">${input("Note", { s: "flex:1" })}${btn("Note", { i: "message-square-plus", k: "nav" })}${btn("Edit", { i: "pencil" })}</div></div>` : ""}`).join("")}</div></div>`,
    330
  );
  const c = sk(
    "11C",
    "Sender first, compact cards in one column",
    "each ticket a two-line row",
    `<div class="body">${head}<div class="surf" style="overflow:hidden">${TK.map((r) => `<div class="row" style="height:68px;padding:0 16px;gap:16px;border-bottom:1px solid var(--lb);${r[5] ? "color:var(--mut)" : ""}"><div style="width:240px;line-height:1.3"><b>${r[1]}</b><div class="mono mut">${r[0]}</div></div><div class="grow" style="line-height:1.3"><div class="tr">${r[2]}</div><div class="mut" style="font-size:13px">${r[4]}${r[3] ? " · " + r[3] + " attachment" : ""}</div></div>${r[6] ? chip("On hold", "warn") : r[5] ? chip("Closed") : chip("Open", "info")}<span class="row" style="gap:4px">${btn("Note", { c: "sm", i: "message-square-plus", is: 14 })}${btn("Edit", { c: "sm", i: "pencil", is: 14 })}${btn("Close", { c: "sm", i: "check", is: 14 })}${btn("Hold", { c: "sm", i: "pause", is: 14 })}</span></div>`).join("")}</div></div>`,
    420
  );
  return { id: "p11", n: "11", name: "Tickets (Note, Edit, Close, Hold, Check Uptime)", html: a + b + c };
};

/* ---------- 12 Audit log ---------- */
const AU = [
  ["Sep 30 10:42", "MGT-0001", "billing", "Invoice INV-0412", "Marked paid in full"],
  ["Sep 30 10:15", "MGT-0001", "account", "STU-0414", "Status Active to Inactive"],
  ["Sep 30 09:58", "STF-0003", "ticket", "TKT-0310", "Assigned"],
  ["Sep 29 17:30", "MGT-0001", "impersonate", "STU-0412", "Started and stopped"],
  ["Sep 29 16:02", "MGT-0001", "delete", "STU-0399", "Deleted with backup"],
];
export const part12 = () => {
  const head = (x = "") => `<div class="row" style="margin-bottom:12px">${title("Audit Log")}${x}<div class="grow"></div>${input("Search", { i: "search", s: "width:260px" })}${btn("Filter", { i: "funnel" })}</div>`;
  const pager = `<div class="pager" style="margin-top:12px"><span class="mut">1–50 of 412</span>${btn("Previous", { i: "chevron-left" })}${btn("Next", { i: "chevron-right" })}</div>`;
  const a = sk(
    "12A",
    "Table with action filter",
    "five columns, pager at the bottom",
    `<div class="body">${head('<span class="seg"><span class="on">All</span><span>account</span><span>billing</span><span>delete</span><span>impersonate</span></span>')}<table class="tbl"><colgroup><col style="width:150px"><col style="width:130px"><col style="width:140px"><col style="width:200px"><col></colgroup><thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Entity</th><th>Summary</th></tr></thead><tbody>
     ${AU.map((r) => `<tr><td class="mono">${r[0]}</td><td class="mono">${r[1]}</td><td>${chip(r[2], r[2] === "delete" ? "bad" : r[2] === "impersonate" ? "warn" : "info")}</td><td>${r[3]}</td><td class="mut">${r[4]}</td></tr>`).join("")}</tbody></table>${pager}</div>`,
    420
  );
  const b = sk(
    "12B",
    "Day timeline",
    "day headers, time at the left",
    `<div class="body">${head()}<div class="surf tl" style="overflow:hidden"><div class="d">Today</div>${AU.slice(0, 3).map((r) => `<div class="e"><span class="mono">${r[0].slice(7)}</span><span>${chip(r[2], r[2] === "delete" ? "bad" : "info")}</span><span><b>${r[3]}</b> <span class="mut">· ${r[4]} · ${r[1]}</span></span></div>`).join("")}<div class="d">Yesterday</div>${AU.slice(3).map((r) => `<div class="e"><span class="mono">${r[0].slice(7)}</span><span>${chip(r[2], r[2] === "delete" ? "bad" : "warn")}</span><span><b>${r[3]}</b> <span class="mut">· ${r[4]} · ${r[1]}</span></span></div>`).join("")}</div>${pager}</div>`,
    500
  );
  const c = sk(
    "12C",
    "Grouped by entity",
    "one bar per account or ticket",
    `<div class="body">${head()}${[["STU-0412", 3, 1], ["STU-0414", 2, 0], ["TKT-0310", 2, 0], ["Invoice INV-0412", 4, 0], ["STU-0399", 1, 0]].map(([n, c, o]) => `<div class="grp" style="margin-top:1px">${I(o ? "chevron-down" : "chevron-right", 16)}${n}<span class="tag" style="background:var(--white)">${c}</span></div>${o ? `<table class="tbl"><colgroup><col style="width:150px"><col style="width:130px"><col style="width:140px"><col></colgroup><tbody>${AU.slice(0, 3).map((r) => `<tr><td class="mono">${r[0]}</td><td class="mono">${r[1]}</td><td>${chip(r[2], "info")}</td><td class="mut">${r[4]}</td></tr>`).join("")}</tbody></table>` : ""}`).join("")}${pager}</div>`,
    460
  );
  return { id: "p12", n: "12", name: "Audit Log (When, Actor, Action, Entity, Summary, Previous, Next)", html: a + b + c };
};

/* ---------- 13 Phone ---------- */
const phoneRows = (n = 6) => ST.slice(0, n).map((r) => `<div style="height:72px;padding:10px 14px;background:var(--white);border-bottom:1px solid var(--lb);display:flex;gap:10px;align-items:center;${r.s === "Inactive" ? "color:var(--mut)" : ""}"><div class="grow" style="line-height:1.35"><div class="row" style="gap:8px"><b style="font-size:15px">${r.n}</b>${chip(r.s, stCls(r.s))}</div><div class="mut" style="font-size:13px"><span class="mono">${r.id}</span> · ${r.c} · ${r.b}</div></div>${btn("", { c: "sm ic", i: "ellipsis" })}</div>`).join("");
const phone = (inner, extra = "", h = 844) => `<div class="wrap" style="width:390px;flex:none"><div class="sk ph" style="height:${h}px">${inner}${extra}</div></div>`;
const phCap = (id, t, n) => `<div style="width:390px;flex:none"><div class="cap" style="margin:0 0 8px"><code>${id}</code>${t}</div><div class="mut" style="font-size:14px;margin:-4px 0 8px">${n}</div></div>`;
export const part13 = () => {
  const navItems = [...TABS].sort();
  const a = phone(
    `<div class="bar1" style="height:52px;padding:0 12px;gap:8px"><span class="btn on-dark" style="flex:1;justify-content:space-between;height:36px">${I("users")}<span class="grow" style="text-align:left">Accounts</span>${I("chevron-down", 14)}</span>${btn("", { k: "on-dark", c: "ic", i: "ellipsis" })}</div>
     <div class="menu" style="right:12px;top:50px;min-width:210px"><div>${I("download")}Install app</div><div>${I("life-buoy")}Report an Issue</div><div>${I("log-out")}Sign out</div></div>
     <div style="padding:10px 14px;background:var(--off)" class="row">${input("Search", { i: "search", s: "flex:1" })}${btn("", { c: "ic", i: "funnel" })}</div>${phoneRows(9)}
     <div style="position:absolute;right:14px;bottom:18px;z-index:10">${btn("Create account", { k: "pri", i: "plus", s: "height:44px;padding:0 18px;font-size:15px" })}</div>`
  );
  const b = phone(
    `<div class="bar1" style="height:52px;padding:0 12px;gap:8px"><b style="font-size:17px">Accounts</b><div class="grow"></div>${btn("", { k: "on-dark", c: "ic", i: "search" })}${btn("", { k: "on-dark", c: "ic", i: "ellipsis" })}</div>
     <div style="padding:10px 14px;background:var(--off);overflow:hidden;white-space:nowrap" class="row"><span class="seg"><span class="on">All</span><span>Students</span><span>Teachers</span><span>Staff</span></span></div>${phoneRows(8)}
     <div class="nav-bottom">${[["Accounts", "users", 1], ["Schedule", "calendar"], ["Billing", "wallet"], ["Tickets", "ticket"], ["More", "menu"]].map(([n, ic, on]) => `<div class="${on ? "on" : ""}">${I(ic, 22)}${n}</div>`).join("")}</div>
     <div style="position:absolute;right:14px;bottom:76px;z-index:10">${btn("", { k: "pri", c: "ic", i: "plus", s: "width:48px;height:48px" })}</div>`
  );
  const c = phone(
    `<div class="bar1" style="height:52px;padding:0 12px;gap:8px">${btn("", { k: "on-dark", c: "ic", i: "menu" })}<b style="font-size:17px">Accounts</b><div class="grow"></div>${btn("", { k: "on-dark", c: "ic", i: "ellipsis" })}</div>${phoneRows(4)}<div class="dimmer" style="top:52px"></div>
     <div class="sheet" style="top:120px;border-radius:0"><div class="grip"></div><div style="padding:0 12px 10px">${input("Search", { i: "search", s: "width:100%" })}</div>
     ${navItems.map((t) => `<div class="row" style="height:46px;padding:0 16px;gap:12px;${t === "Accounts" ? "background:var(--lb);font-weight:600;color:var(--navy)" : ""}">${I(TAB_ICON[t], 18)}${t}</div>`).join("")}
     <div class="row" style="padding:12px;border-top:1px solid var(--lb);gap:8px;margin-top:6px">${btn("Install app", { i: "download", c: "sm" })}${btn("Report an Issue", { i: "life-buoy", c: "sm" })}${btn("Sign out", { i: "log-out", c: "sm" })}</div></div>`
  );
  const html = `<div style="display:flex;gap:32px;align-items:flex-start;flex-wrap:wrap">
    <div>${phCap("13A", "Section switcher in the bar", "actions in the ⋯ menu")}${a}</div>
    <div>${phCap("13B", "Bottom navigation", "four sections plus More")}${b}</div>
    <div>${phCap("13C", "Menu sheet", "all ten sections, searchable")}${c}</div></div>`;
  return { id: "p13", n: "13", name: "Phone (390 × 844)", html, raw: true };
};
