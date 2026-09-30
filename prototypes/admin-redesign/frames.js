// Wireframe frames for the Management (admin) redesign. All people, amounts and IDs are sample data.
const chip = (t, k = "n") => `<span class="chip ${k}">${t}</span>`;
const btn = (t, c = "") => `<span class="btn ${c}">${t}</span>`;
const ico = (r) => `<i class="ico${r ? " r" : ""}"></i>`;
const inp = (t, w = "") => `<div class="input" style="${w}">${t}</div>`;
const field = (l, v, w = "") => `<div class="field" style="${w}"><label>${l}</label>${inp(v)}</div>`;
const note = (x, y, t, h = "") => `<div class="note" style="left:${x}px;top:${y}px">${h ? `<b>${h}</b>` : ""}${t}</div>`;
const pin = (x, y, n) => `<div class="pin" style="left:${x}px;top:${y}px">${n}</div>`;
const tgl = (on = "New") => `<span class="seg"><span class="${on === "Classic" ? "on" : ""}">Classic</span><span class="${on === "New" ? "on" : ""}">New</span></span>`;

const NAV = [
  ["Work", [["Today"], ["Applications", "7", 1], ["Pipeline"]]],
  ["People", [["Accounts"]]],
  ["Academics", [["Services"], ["Schedule", "3", 1], ["Enrollments"]]],
  ["Money", [["Billing", "5", 1]]],
  ["Support", [["Tickets", "4", 1], ["Guides"]]],
  ["System", [["Audit log"]]],
];

function shell(active, title, inner, o = {}) {
  const nav = NAV.map(([g, items]) =>
    `<div class="ng caps">${g}</div>` +
    items.map(([n, c, hot]) => `<div class="ni ${n === active ? "on" : ""}">${ico()}<span>${n}</span>${c ? `<em class="${hot ? "hot" : ""}">${c}</em>` : ""}</div>`).join("")
  ).join("");
  return `<div class="app">
    <aside class="sb">
      <div class="brand"><i></i>DivergenCIE</div>
      ${nav}
      <div class="side-foot"><div class="b">Management</div><div class="mut">MGT-0001 · sample admin</div></div>
    </aside>
    <div class="main">
      <div class="tb">
        <div class="crumb">${title}</div>
        <div class="grow"></div>
        <div class="cmdk">${ico()}<span>Search or jump to…</span><kbd>Ctrl K</kbd></div>
        ${tgl("New")}
        ${btn("Report an Issue")}${btn("Sign out")}
      </div>
      <div class="content" style="padding-right:${o.drawer ? (Number((String(o.drawer).match(/width:(\d+)px/) || [])[1]) || 430) + 24 : 20}px">${inner}</div>
      ${o.drawer || ""}
    </div>
  </div>${o.extra || ""}`;
}

const tbl = (heads, rows, selIdx = -1) =>
  `<table class="t"><thead><tr>${heads.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows
    .map((r, i) => `<tr class="${i === selIdx ? "sel" : ""}">${r.map((c) => `<td>${c}</td>`).join("")}</tr>`)
    .join("")}</tbody></table>`;

const filterBar = (chips, right = "") =>
  `<div class="row" style="margin-bottom:12px;flex-wrap:wrap">${inp("Search name, ID, email…", "width:220px")}${chips.map((c) => `<span class="seg"><span class="${c.on ? "on" : ""}">${c.t}</span></span>`).join("")}<div class="grow"></div>${right}</div>`;

/* 00 ---------------------------------------------------------------- Brief */
const brief = `<div style="padding:44px 52px;display:grid;grid-template-columns:1fr 1fr;gap:44px;height:100%">
  <div class="col" style="gap:14px">
    <div class="caps">Admin redesign · wireframe for approval</div>
    <div class="h1" style="font-size:34px;line-height:1.08">One place to see what needs a person, then act without losing context.</div>
    <div class="mut" style="font-size:13px;line-height:1.6">Nothing here is built. This is a clickable-by-eye wireframe of the Management portal in a new layout. All names, IDs and amounts are sample data.</div>
    <div class="caps" style="margin-top:10px">What is wrong in Classic (measured from the code)</div>
    <ul style="margin:0;padding-left:18px;line-height:1.75">
      <li>10 flat tabs in one row. Intake, money and support sit side by side with no grouping.</li>
      <li>Work that needs a person is hidden: reschedule requests, unpaid invoices, open tickets each live behind a different tab.</li>
      <li>Editing happens inside table rows. The row grows and the list loses its place.</li>
      <li>Wide tables: Services has 15+ columns. The Management page is one 8,080-line file.</li>
      <li>On a phone the tab strip scrolls sideways and hides most tabs.</li>
    </ul>
  </div>
  <div class="col" style="gap:14px">
    <div class="caps">What changes</div>
    <ol style="margin:0;padding-left:18px;line-height:1.75">
      <li><b>Today</b> home: a queue of things that need a person, with counts.</li>
      <li>Sidebar grouped by job: Work, People, Academics, Money, Support, System. Live counts on each.</li>
      <li>Click a row, edit in a side <b>drawer</b>. The list stays visible.</li>
      <li><b>Ctrl K</b> to jump to any person, service or ticket, or run an action.</li>
      <li>Header <b>Classic | New</b> toggle. Switch back any time. Same data and same API.</li>
    </ol>
    <div class="caps" style="margin-top:10px">Decisions I need from you</div>
    <div class="box pad" style="line-height:1.8">
      <div>${pin2(1)} Sidebar grouping and names (frame 02)</div>
      <div>${pin2(2)} Today as the default landing page (frame 02)</div>
      <div>${pin2(3)} Drawer editing instead of inline row edit (frames 04, 06)</div>
      <div>${pin2(4)} Toggle position and behaviour (frame 01)</div>
      <div>${pin2(5)} Keep brand: navy, gold, sky, coral, Satoshi, sharp corners (frame 13)</div>
    </div>
    <div class="mut sm" style="line-height:1.6">Out of this round: Student, Teacher, Parent, Staff, Ambassador portals and the public site. Use the Wireframe / Styled switch on top to see both looks, and the 3D switch to see the layers.</div>
  </div>
</div>`;
function pin2(n) { return `<span class="pin" style="position:static;display:inline-flex;margin-right:8px;vertical-align:middle">${n}</span>`; }

/* 01 ------------------------------------------------------ Header + toggle */
const headerDetail = (() => {
  const hdr = (right, label) => `<div class="box" style="margin-bottom:6px"><div class="row" style="padding:14px 22px;justify-content:space-between"><div><div class="caps">DCP1 · Management</div><div class="b" style="font-size:15px">Sample Admin</div></div><div class="row">${right}</div></div></div><div class="mut sm" style="margin:0 0 26px 2px">${label}</div>`;
  return `<div style="padding:34px 40px;height:100%;position:relative">
    <div class="caps" style="margin-bottom:10px">A · Classic header today (from your screenshot)</div>
    ${hdr(`${btn("Install app")}${btn("Report an Issue")}${btn("Sign out")}`, "Components/DashboardShell.jsx, shown to every portal")}
    <div class="caps" style="margin-bottom:10px">B · Management header with the new toggle (shown while in Classic)</div>
    ${hdr(`${tgl("Classic")}${btn("Install app")}${btn("Report an Issue")}${btn("Sign out")}`, "Toggle sits first in the button row. Only Management accounts see it.")}
    <div class="caps" style="margin-bottom:10px">C · Same toggle once New is on (the top bar of the new layout)</div>
    <div class="box" style="margin-bottom:6px"><div class="row" style="padding:12px 22px"><div class="b" style="font-size:15px">Today</div><div class="grow"></div><div class="cmdk">${ico()}<span>Search or jump to…</span><kbd>Ctrl K</kbd></div>${tgl("New")}${btn("Report an Issue")}${btn("Sign out")}</div></div>
    <div style="height:30px"></div>
    <div class="row" style="align-items:flex-start;gap:30px">
      <div class="box pad grow" style="line-height:1.7"><div class="caps" style="margin-bottom:6px">Behaviour</div>
        Switching keeps you on the same area (Classic Billing opens New Billing).<br>Saved per account on this device. Account-level save comes later.<br>Switching needs no reload and changes no data.<br>Both UIs use the same <span class="b">/api</span> routes.</div>
      <div class="box pad" style="width:300px;line-height:1.7"><div class="caps" style="margin-bottom:6px">Phone</div><div class="row">${ico()}<span>Toggle moves into the ⋯ menu:</span></div><div class="box pad" style="margin-top:8px"><div class="row" style="justify-content:space-between"><span>Interface</span>${tgl("New")}</div><hr style="border:0;border-top:1px solid var(--line);margin:10px 0"><div>Report an Issue</div><div style="margin-top:8px">Sign out</div></div></div>
    </div>
    ${pin(18, 228, 4)}${note(690, 214, "Segmented, not a link, so the current mode is always visible.", "Why a segmented toggle")}
  </div>`;
})();

/* 02 ---------------------------------------------------------- Today */
const today = shell("Today", "Today", `
  <div class="row" style="margin-bottom:14px"><div><div class="h1">Wed 30 Sep</div><div class="mut">19 things need a person right now</div></div><div class="grow"></div>${btn("+ New account", "p")}${btn("+ New service")}</div>
  <div class="row" style="gap:12px;margin-bottom:16px;align-items:stretch">
    ${[["Active students", "128", "+6 this month"], ["Active teachers", "21", "2 on trial"], ["Sessions this week", "214", "9 rescheduled"], ["Collected, Sep", "$18,420", "of $24,900 billed"]].map(([l, v, s]) => `<div class="kpi grow"><div class="caps">${l}</div><div class="v">${v}</div><div class="mut sm">${s}</div></div>`).join("")}
  </div>
  <div class="row" style="align-items:flex-start;gap:16px">
    <div class="box grow">
      <div class="row" style="padding:12px 14px;border-bottom:1px solid var(--line)"><span class="b">Needs you</span><div class="grow"></div><span class="mut sm">sorted by oldest first</span></div>
      ${[["7", "Applications to review", "Oldest waiting 4 days", "Review", "warn"], ["3", "Reschedule requests", "Next session in 26 hours", "Review", "bad"], ["5", "Invoices overdue", "$1,240 outstanding", "Open Billing", "bad"], ["4", "Open tickets", "1 new, unassigned", "Open Tickets", "info"], ["2", "Offers awaiting reply", "Sent 3 and 6 days ago", "Open Pipeline", "warn"], ["2", "Schedule conflicts", "Same teacher, same hour", "Fix", "bad"]].map(([c, t, s, a, k]) => `<div class="attn"><div class="cnt">${c}</div><div class="grow"><div class="b">${t}</div><div class="mut sm">${s}</div></div>${chip(k === "bad" ? "urgent" : k === "warn" ? "waiting" : "new", k)}${btn(a, "s")}</div>`).join("")}
    </div>
    <div class="col" style="width:400px;gap:16px">
      <div class="box"><div class="row" style="padding:12px 14px;border-bottom:1px solid var(--line)"><span class="b">Sessions today</span><div class="grow"></div><span class="mut sm">9</span></div>
        ${[["09:00", "IGCSE Physics · Group A", "Teacher 04"], ["11:30", "A Level Chem · 1:1", "Teacher 09"], ["14:00", "IGCSE Maths · Group C", "Teacher 02"], ["16:30", "A Level Bio · Group B", "Teacher 07"]].map(([t, s, w]) => `<div class="attn" style="padding:9px 14px"><span class="mut sm" style="width:40px">${t}</span><div class="grow"><div>${s}</div><div class="mut sm">${w}</div></div></div>`).join("")}</div>
      <div class="box"><div class="row" style="padding:12px 14px;border-bottom:1px solid var(--line)"><span class="b">Systems</span></div>
        ${[["Question Solver", "up"], ["Syllabus viewer", "up"], ["Database backup", "1 day ago"]].map(([s, v]) => `<div class="attn" style="padding:9px 14px"><span class="dot" style="color:var(--green)"></span><div class="grow">${s}</div><span class="mut sm">${v}</span></div>`).join("")}</div>
    </div>
  </div>
  ${note(780, 600, "Each row is a filtered view. Clicking opens that page with the filter already on.", "Needs you")}
`, { extra: pin(216, 140, 1) + pin(236, 228, 2) });

/* 03 ---------------------------------------------------------- Pipeline */
const pipeline = shell("Pipeline", "Pipeline", `
  <div class="row" style="margin-bottom:12px"><div class="h1">Pipeline</div><div class="grow"></div>${inp("Search applicant…", "width:220px")}<span class="seg"><span class="on">Board</span><span>List</span></span></div>
  <div class="kan">
    ${[["Applied", 7, [["Sample Applicant 01", "IGCSE Physics", "2d"], ["Sample Applicant 02", "A Level Chem", "4d"], ["Sample Applicant 03", "IGCSE Maths", "4d"]]],
       ["Trial", 5, [["Sample Applicant 04", "A Level Bio", "Thu 15:00"], ["Sample Applicant 05", "IGCSE ESL", "Fri 10:00"]]],
       ["Interview", 3, [["Sample Applicant 06", "Teacher · Maths", "Mon 12:00", 1], ["Sample Applicant 07", "Teacher · Physics", "Needs slot"]]],
       ["Offer sent", 2, [["Sample Applicant 08", "Teacher · Chem", "sent 6d ago"], ["Sample Applicant 09", "Student · IGCSE", "sent 3d ago"]]],
       ["Account created", 14, [["Sample Applicant 10", "Student", "yesterday"]]]]
      .map(([t, n, cs]) => `<div class="kcol"><div class="row"><span class="b">${t}</span><span class="chip n">${n}</span></div>${cs.map(([nm, sv, w, s]) => `<div class="kcard ${s ? "sel" : ""}"><div class="b">${nm}</div><div class="mut sm">${sv}</div><div class="row"><span class="mut sm">${w}</span><div class="grow"></div>${chip("student".slice(0, 0) + (sv.startsWith("Teacher") ? "teacher" : "student"), "info")}</div></div>`).join("")}</div>`).join("")}
  </div>
  ${note(28, 560, "Classic splits this into Applications and Pipeline tables with 9 columns. The board shows the stage at a glance. List view keeps the sortable table.", "Board + List")}
`, { drawer: `<div class="drawer"><div class="dh"><div class="row"><div class="grow"><div class="caps">Interview · Applicant</div><div class="b" style="font-size:17px">Sample Applicant 06</div></div>${btn("✕", "s g")}</div>
  <div class="stepper" style="margin-top:14px"><i class="f"></i>Applied<u></u><i class="f"></i>Trial<u></u><i class="f"></i>Interview<u></u><i></i>Offer<u></u><i></i>Account</div></div>
  <div class="db col" style="gap:12px">${field("Service", "Teacher · Maths")}${field("Interview slot", "Mon 05 Oct, 12:00 · Teacher 04")}${field("Interviewer feedback", "Strong subject knowledge. Timing needs work.", "")}${field("Offer link", "https://…")}<div class="row" style="margin-top:4px">${chip("email ok", "ok")}${chip("WhatsApp ok", "ok")}</div></div>
  <div class="df">${btn("Send offer", "p")}${btn("Waitlist")}${btn("Reject", "d")}</div></div>` });

/* 04 ---------------------------------------------------------- Accounts */
const accounts = shell("Accounts", "Accounts", `
  <div class="row" style="margin-bottom:12px"><div class="h1">Accounts</div><div class="grow"></div>${btn("Export")}${btn("+ New account", "p")}</div>
  ${filterBar([{ t: "All 214", on: 1 }, { t: "Students 128" }, { t: "Teachers 21" }, { t: "Parents 41" }, { t: "Staff 9" }, { t: "Ambassadors 14" }], btn("Filters ▾"))}
  <div class="box">${tbl(["ID", "Name", "Type", "Status", "Services", "Last seen", ""], [
    ["STU-0412", "<b>Aisha K.</b>", chip("student", "info"), chip("active", "ok"), "IGCSE Physics, Maths", "today", "⋯"],
    ["STU-0413", "<b>Omar R.</b>", chip("student", "info"), chip("active", "ok"), "A Level Chem", "2 days ago", "⋯"],
    ["PAR-0120", "<b>Sample Parent 01</b>", chip("parent", "bad"), chip("active", "ok"), "2 children linked", "5 days ago", "⋯"],
    ["TCH-0007", "<b>Teacher 07</b>", chip("teacher", "ok"), chip("active", "ok"), "A Level Bio, 11 students", "today", "⋯"],
    ["STU-0414", "<b>Sample Student 14</b>", chip("student", "info"), chip("paused", "warn"), "IGCSE Maths", "3 weeks ago", "⋯"],
    ["STF-0003", "<b>Staff 03</b>", chip("staff", "n"), chip("active", "ok"), "—", "today", "⋯"],
    ["STU-0415", "<b>Sample Student 15</b>", chip("student", "info"), chip("trial", "info"), "IGCSE ESL (trial)", "yesterday", "⋯"],
    ["TCH-0009", "<b>Teacher 09</b>", chip("teacher", "ok"), chip("active", "ok"), "A Level Chem", "yesterday", "⋯"],
  ], 0)}</div>
  <div class="row mut sm" style="margin-top:10px">Showing 8 of 214 ${"&nbsp;"}<div class="grow"></div>‹ 1 2 3 … ›</div>
  ${note(28, 600, "Classic edits a row in place, pushing the table down. Here the row stays put and the drawer holds the form.", "Drawer editing")}
`, { drawer: `<div class="drawer"><div class="dh"><div class="row"><div class="grow"><div class="caps">STU-0412 · Student</div><div class="b" style="font-size:17px">Aisha K.</div></div>${btn("✕", "s g")}</div>
  <div class="seg" style="margin-top:12px"><span class="on">Profile</span><span>Schedule</span><span>Billing</span><span>Credentials</span><span>Danger</span></div></div>
  <div class="db col" style="gap:12px">${field("Name", "Aisha K.")}<div class="row">${field("Email", "aisha@example.com", "flex:1")}${field("WhatsApp", "+00 000 0000", "flex:1")}</div><div class="row">${field("Timezone", "Europe/London", "flex:1")}${field("Status", "Active ▾", "flex:1")}</div>${field("Linked parent", "Sample Parent 01")}
  <div class="box pad"><div class="caps" style="margin-bottom:6px">Enrolments</div>IGCSE Physics · Group A<br>IGCSE Maths · Group C</div>
  <div class="row">${btn("View as this user")}${btn("Copy login details")}</div></div>
  <div class="df">${btn("Save changes", "p")}${btn("Cancel")}<div class="grow"></div>${btn("Delete…", "d")}</div></div>` });

/* 05 ---------------------------------------------------------- Schedule */
const schedule = (() => {
  const hours = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];
  const days = ["Mon 28", "Tue 29", "Wed 30", "Thu 01", "Fri 02", "Sat 03", "Sun 04"];
  const evs = { "2": [[1, 1, "IGCSE Phys A", 0], [6, 1.4, "IGCSE Maths C", 0]], "3": [[3, 1, "A Lvl Chem 1:1", 1], [1, 1, "IGCSE Phys A", 0]], "1": [[4, 1.2, "A Lvl Bio B", 0]], "4": [[2, 1, "ESL Trial", 0], [2, 1, "IGCSE Phys B", 1]], "0": [[1, 1, "IGCSE Phys A", 0]], "5": [[0, 2, "A Lvl Chem grp", 0]] };
  const grid = `<div class="wk"><div class="hd"></div>${days.map((d, i) => `<div class="hd ${i === 2 ? "b" : ""}">${d}</div>`).join("")}${hours.map((h) => `<div class="hr">${h}</div>${days.map((_, di) => { const hi = hours.indexOf(h); const es = (evs[di] || []).filter((e) => Math.floor(e[0]) === hi).map((e) => `<div class="ev ${e[3] ? "x" : ""}" style="top:3px;height:${e[1] * 46 - 6}px">${e[2]}</div>`).join(""); return `<div class="cell">${es}</div>`; }).join("")}`).join("")}</div>`;
  return shell("Schedule", "Schedule", `
    <div class="row" style="margin-bottom:12px"><div class="h1">Schedule</div><div class="grow"></div><span class="seg"><span>Day</span><span class="on">Week</span><span>Month</span></span>${btn("‹")}${btn("Today")}${btn("›")}${btn("+ Slot", "p")}</div>
    <div class="row" style="align-items:flex-start;gap:16px"><div class="box grow" style="overflow:hidden">${grid}</div>
      <div class="col" style="width:330px">
        <div class="box"><div class="row" style="padding:10px 12px;border-bottom:1px solid var(--line)"><span class="b">Conflicts</span>${chip("2", "bad")}</div><div class="pad sm" style="line-height:1.7">Thu 01 · 10:00<br><span class="mut">Teacher 04 is in 2 sessions</span><div style="margin-top:6px">${btn("Fix", "s")}</div></div></div>
        <div class="box"><div class="row" style="padding:10px 12px;border-bottom:1px solid var(--line)"><span class="b">Reschedule requests</span>${chip("3", "warn")}</div>
          ${["Aisha K. · IGCSE Phys A", "Omar R. · A Lvl Chem", "Parent 01 · Maths C"].map((t) => `<div class="pad sm" style="border-bottom:1px solid var(--line)"><div class="b">${t}</div><div class="mut">Wed 14:00 → Fri 14:00</div><div class="row" style="margin-top:6px">${btn("Approve", "s p")}${btn("Decline", "s")}</div></div>`).join("")}</div>
      </div></div>
    ${note(610, 640, "Conflicts and requests sit beside the calendar, not in separate tables above it.", "Right rail")}`);
})();

/* 06 ---------------------------------------------------------- Academics */
const academics = shell("Services", "Services", `
  <div class="row" style="margin-bottom:12px"><div class="h1">Services</div><span class="seg"><span class="on">Services</span><span>Enrollments</span></span><div class="grow"></div>${btn("Columns ▾")}${btn("+ New service", "p")}</div>
  ${filterBar([{ t: "All 62", on: 1 }, { t: "IGCSE 34" }, { t: "A Level 21" }, { t: "Staff roles 7" }], "")}
  <div class="box">${(() => {
    const heads = ["", "ID", "Name", "Board", "Subject", "Component", "Batch", "Rate", "Sessions/wk", ""];
    const g = (l, o) => `<tr class="grp"><td colspan="10">${o ? "▾" : "▸"} ${l} <span class="mut" style="font-weight:400">· ${o ? 3 : 2} services</span></td></tr>`;
    const r = (id, n, b, s, c, ba, rate, w, sel) => `<tr class="${sel ? "sel" : ""}"><td><input type="checkbox" disabled></td><td>${id}</td><td><b>${n}</b></td><td>${b}</td><td>${s}</td><td>${c}</td><td>${ba}</td><td>${rate}</td><td>${w}</td><td>⋯</td></tr>`;
    return `<table class="t"><thead><tr>${heads.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>
      ${g("IGCSE Physics", 1)}${r("SRV-014", "Physics Group A", "CIE", "Physics 0625", "Paper 2", "B1", "$28 / hr", 2, 1)}${r("SRV-015", "Physics Group B", "CIE", "Physics 0625", "Paper 4", "B2", "$28 / hr", 2)}${r("SRV-031", "Physics 1:1", "CIE", "Physics 0625", "All", "—", "$42 / hr", 1)}
      ${g("A Level Chemistry", 1)}${r("SRV-020", "Chem Group", "CIE", "Chemistry 9701", "Paper 4", "B1", "$34 / hr", 2)}${r("SRV-021", "Chem 1:1", "CIE", "Chemistry 9701", "All", "—", "$48 / hr", 1)}
      ${g("IGCSE Maths", 0)}${g("Staff roles", 0)}</tbody></table>`;
  })()}</div>
  <div class="mut sm" style="margin-top:10px">Wide columns (Course, Department, Role, Occurrences, Facilitator) move into the drawer. The Columns menu brings any back.</div>
  ${note(820, 560, "Classic shows 15+ columns at once. Five core columns stay. The rest live in the drawer or the Columns menu.", "Less width")}
`, { drawer: `<div class="drawer" style="width:400px"><div class="dh"><div class="row"><div class="grow"><div class="caps">SRV-014 · Service</div><div class="b" style="font-size:17px">Physics Group A</div></div>${btn("✕", "s g")}</div><div class="seg" style="margin-top:12px"><span class="on">Details</span><span>Rates</span><span>Occurrences</span><span>Enrolled</span></div></div>
  <div class="db col" style="gap:12px">${field("Name", "Physics Group A")}<div class="row">${field("Board", "CIE", "flex:1")}${field("Subject", "Physics 0625", "flex:1")}</div><div class="row">${field("Component", "Paper 2", "flex:1")}${field("Batch", "B1", "flex:1")}</div>${field("Instructor", "Teacher 04")}<div class="box pad"><div class="caps" style="margin-bottom:6px">Weekly occurrences</div>Mon 09:00–10:00<br>Wed 09:00–10:00</div></div>
  <div class="df">${btn("Save", "p")}${btn("Cancel")}<div class="grow"></div>${btn("Delete…", "d")}</div></div>` });

/* 07 ---------------------------------------------------------- Billing */
const billing = shell("Billing", "Billing", `
  <div class="row" style="margin-bottom:12px"><div class="h1">Billing</div><span class="seg"><span class="on">Invoices</span><span>Paychecks</span></span><div class="grow"></div>${btn("Rebuild drafts")}${btn("+ Manual invoice", "p")}</div>
  <div class="row" style="gap:12px;margin-bottom:14px">${[["Billed, Sep", "$24,900", ""], ["Collected", "$18,420", "74%"], ["Outstanding", "$6,480", "31 invoices"], ["Overdue", "$1,240", "5 invoices"]].map(([l, v, s], i) => `<div class="kpi grow" style="${i === 3 ? "box-shadow:inset 0 2px 0 var(--coral)" : ""}"><div class="caps">${l}</div><div class="v">${v}</div><div class="mut sm">${s || "&nbsp;"}</div></div>`).join("")}</div>
  ${filterBar([{ t: "All", on: 1 }, { t: "Draft 4" }, { t: "Due 26" }, { t: "Overdue 5" }, { t: "Paid 91" }], btn("Month: Sep ▾"))}
  <div class="box">${tbl(["Student", "Period", "Services", "Amount", "Status", "Actions"], [
    ["<b>Sample Student 14</b>", "Sep 2026", "IGCSE Maths", "$224", chip("overdue 12d", "bad"), `${btn("Mark paid", "s p")}${btn("Copy reminder", "s")}`],
    ["<b>Aisha K.</b>", "Sep 2026", "Physics, Maths", "$448", chip("due 05 Oct", "warn"), `${btn("Mark paid", "s p")}${btn("Copy reminder", "s")}`],
    ["<b>Omar R.</b>", "Sep 2026", "A Level Chem", "$384", chip("paid 28 Sep", "ok"), `${btn("Copy receipt", "s")}`],
    ["<b>Sample Student 15</b>", "Sep 2026", "ESL trial", "$0", chip("draft", "n"), `${btn("Approve", "s p")}${btn("Edit", "s")}`],
  ], 1)}
    <div class="pad" style="background:var(--bg2);border-bottom:1px solid var(--line)"><div class="row" style="align-items:flex-start;gap:20px"><div class="grow"><div class="caps" style="margin-bottom:6px">Line items · Aisha K.</div>${tbl(["Service", "Sessions", "Rate", "Total"], [["Physics Group A", "8", "$28", "$224"], ["Maths Group C", "8", "$28", "$224"]])}</div><div style="width:260px" class="col"><div class="caps">Mark paid</div><div class="seg"><span class="on">In full</span><span>Partial</span></div>${inp("Amount $448")}${btn("Confirm", "p")}</div></div></div>
  </div>
  ${note(40, 640, "One Mark paid button, Full or Partial chosen inside. Reminder button hides once paid, as in current Classic.", "Matches Classic rules")}
`);

/* 08 ---------------------------------------------------------- Tickets */
const tickets = shell("Tickets", "Tickets", `
  <div class="row" style="margin-bottom:12px"><div class="h1">Tickets</div><div class="grow"></div><span class="seg"><span class="on">Open 4</span><span>In progress 2</span><span>Resolved 38</span></span></div>
  <div class="row" style="align-items:stretch;gap:0;height:640px" >
    <div class="box" style="width:380px;overflow:hidden">
      ${[["TKT-0310", "Invoice shows wrong total", "Parent 01", "new", "bad", 1], ["TKT-0309", "Cannot open yearly paper", "Aisha K.", "open", "warn"], ["TKT-0308", "Session time shows wrong zone", "Teacher 07", "open", "warn"], ["TKT-0307", "Old Physics papers refuse to grade", "Staff 03", "in progress", "info"]].map(([id, t, w, s, k, sel]) => `<div class="pad" style="border-bottom:1px solid var(--line);${sel ? "background:var(--fill)" : ""}"><div class="row"><span class="mut sm">${id}</span><div class="grow"></div>${chip(s, k)}</div><div class="b" style="margin:4px 0">${t}</div><div class="mut sm">${w} · 2h ago</div></div>`).join("")}
    </div>
    <div class="box grow" style="border-left:0;display:flex;flex-direction:column">
      <div class="pad" style="border-bottom:1px solid var(--line)"><div class="row"><div class="grow"><div class="caps">TKT-0310</div><div class="b" style="font-size:17px">Invoice shows wrong total</div></div>${btn("Assign ▾")}${btn("Resolve", "p")}</div>
        <div class="stepper" style="margin-top:12px"><i class="f"></i>Open<u></u><i></i>In progress<u></u><i></i>Resolved</div></div>
      <div class="pad thread col grow" style="gap:12px;background:var(--bg2)">
        <div class="msg"><div class="row sm mut"><span class="b" style="color:var(--ink)">Parent 01</span>· logged in as PAR-0120 · Sep 30, 09:14</div><div style="margin-top:6px">The September invoice says $448 but I pay for one course only.</div><div class="row" style="margin-top:8px">${chip("attachment", "n")}<span class="mut sm">screenshot.png</span></div></div>
        <div class="msg" style="align-self:flex-end"><div class="sm mut">Internal note · Staff 03</div><div style="margin-top:6px">Checking enrolments for Sept.</div></div>
      </div>
      <div class="pad row" style="border-top:1px solid var(--line)">${inp("Write a note or reply…", "flex:1")}${btn("Send", "p")}</div>
    </div>
  </div>
  ${note(440, 740, "Sender identity comes from the session, never typed, as Report an Issue works today.", "Same rule")}
`);

/* 09 ---------------------------------------------------------- Guides */
const guides = shell("Guides", "Guides", `
  <div class="row" style="margin-bottom:12px"><div class="h1">Guides</div><div class="grow"></div>${btn("+ New guide", "p")}</div>
  <div class="row" style="align-items:flex-start;gap:16px">
    <div class="box" style="width:440px">${["How to book a trial", "Reading your invoice", "Using the Question Solver", "Reschedule policy", "Teacher onboarding checklist"].map((t, i) => `<div class="pad row" style="border-bottom:1px solid var(--line);${i === 2 ? "background:var(--fill)" : ""}"><div class="grow"><div class="b">${t}</div><div class="mut sm">Audience: ${i === 4 ? "Teachers" : "Students, Parents"}</div></div>${chip(i === 3 ? "draft" : "published", i === 3 ? "warn" : "ok")}</div>`).join("")}</div>
    <div class="box grow pad col" style="gap:12px"><div class="row"><div class="caps grow">Editing · Using the Question Solver</div>${chip("published", "ok")}</div>${field("Title", "Using the Question Solver")}${field("Audience", "Students, Parents ▾")}${field("Link or body", "https://…")}<div class="ph" style="height:150px"></div><div class="row">${btn("Save", "p")}${btn("Unpublish")}<div class="grow"></div>${btn("Delete…", "d")}</div></div>
  </div>
`);

/* 10 ---------------------------------------------------------- Audit */
const audit = shell("Audit log", "Audit log", `
  <div class="row" style="margin-bottom:12px"><div class="h1">Audit log</div><div class="grow"></div>${btn("Export CSV")}</div>
  ${filterBar([{ t: "All actions", on: 1 }, { t: "Accounts" }, { t: "Billing" }, { t: "Deletes" }, { t: "Impersonation" }], btn("Last 7 days ▾"))}
  <div class="box">${tbl(["When", "Who", "Action", "Target", "Detail"], [
    ["10:42", "MGT-0001", chip("billing", "info"), "INV-0412", "Marked paid in full"],
    ["10:15", "MGT-0001", chip("account", "n"), "STU-0414", "Status active → paused"],
    ["09:58", "STF-0003", chip("ticket", "n"), "TKT-0310", "Assigned to self"],
    ["Yesterday 17:30", "MGT-0001", chip("impersonate", "warn"), "STU-0412", "Started, stopped after 4 min"],
    ["Yesterday 16:02", "MGT-0001", chip("delete", "bad"), "STU-0399", "Deleted, backup kept, restorable"],
    ["Yesterday 11:20", "MGT-0001", chip("schedule", "n"), "SRV-014", "Moved Wed 14:00 → Fri 14:00"],
  ])}</div>
  ${note(820, 500, "Read-only. Rows with a recoverable delete get a Restore button.", "Restore")}
`);

/* 11 ---------------------------------------------------------- Palette + states */
const states = `<div style="position:absolute;inset:0;background:var(--bg2);padding:40px">
  <div class="caps" style="margin-bottom:10px">Command palette (Ctrl K)</div>
  <div class="box" style="width:640px;box-shadow:0 20px 50px rgba(0,0,0,.18)"><div class="row pad" style="border-bottom:1px solid var(--line)">${ico()}<span class="mut">aisha</span></div>
    <div class="pad col" style="gap:4px"><div class="caps">People</div><div class="row pad" style="background:var(--fill);padding:8px 10px">${ico(1)}<b>Aisha K.</b><span class="mut sm">STU-0412 · student</span></div><div class="row" style="padding:8px 10px">${ico(1)}<span>Aisha (Parent) </span><span class="mut sm">PAR-0088</span></div>
    <div class="caps" style="margin-top:8px">Actions</div><div class="row" style="padding:8px 10px">${ico()}<span>Create invoice for Aisha K.</span></div><div class="row" style="padding:8px 10px">${ico()}<span>View as Aisha K.</span></div></div></div>
  <div class="row" style="gap:20px;margin-top:40px;align-items:flex-start">
    <div class="col" style="width:380px"><div class="caps">Loading</div><div class="box pad col">${[70, 100, 85].map((w) => `<div class="bar" style="width:${w}%;height:12px"></div>`).join("")}</div></div>
    <div class="col" style="width:380px"><div class="caps">Empty</div><div class="box pad" style="text-align:center;padding:30px"><div class="ph" style="width:64px;height:64px;margin:0 auto 10px"></div><div class="b">No overdue invoices</div><div class="mut sm">Nothing to chase this month.</div></div></div>
    <div class="col" style="width:380px"><div class="caps">Error and confirm</div><div class="box pad col"><div class="row">${chip("Couldn't save", "bad")}</div><div class="sm mut">The server returned an error. Your edits are still in the form. Try again.</div><div class="row">${btn("Try again", "p")}${btn("Dismiss")}</div></div></div>
  </div>
  <div class="caps" style="margin:40px 0 10px">Destructive action (applies to every Delete…)</div>
  <div class="box pad row" style="width:760px;gap:18px;align-items:flex-start"><div class="grow"><div class="b">Delete STU-0399?</div><div class="mut sm" style="margin-top:4px">A backup is saved first. You can restore from the Audit log.</div></div>${btn("Cancel")}${btn("Delete, keep backup", "d")}</div>
</div>`;

/* 12 ---------------------------------------------------------- Mobile */
const phoneFrame = (x, inner, sheet = "", active = 0) => `<div class="phone" style="left:${x}px;top:28px">
  <div class="pt"><b style="font-size:15px">${inner.t}</b><div class="grow"></div>${btn("⋯", "s")}</div>
  <div class="pb">${inner.b}</div>
  <div class="nav">${["Today", "People", "Schedule", "Money", "More"].map((n, i) => `<div class="${i === active ? "on" : ""}">${ico()}${n}</div>`).join("")}</div>${sheet}</div>`;
const mobile = `<div style="position:absolute;inset:0">
${phoneFrame(28, { t: "Today", b: `<div class="row"><div class="h1" style="font-size:19px">Wed 30 Sep</div></div><div class="kpi"><div class="caps">Needs you</div><div class="v">19</div></div>${["7 Applications", "3 Reschedules", "5 Invoices overdue", "4 Open tickets"].map((t) => `<div class="box pad row"><b class="grow">${t}</b><span class="mut">›</span></div>`).join("")}<div class="box pad"><div class="caps">Sessions today</div><div style="margin-top:6px">09:00 IGCSE Physics A<br>11:30 A Level Chem 1:1</div></div>` }, "", 0)}
${phoneFrame(446, { t: "People", b: `${inp("Search accounts…")}<div class="row"><span class="chip info">All</span><span class="chip n">Students</span><span class="chip n">Teachers</span></div>${["Aisha K.|STU-0412", "Omar R.|STU-0413", "Teacher 07|TCH-0007", "Sample Student 14|STU-0414"].map((r) => { const [a, b] = r.split("|"); return `<div class="box pad row"><div class="grow"><b>${a}</b><div class="mut sm">${b}</div></div>${chip("active", "ok")}</div>`; }).join("")}` }, "", 1)}
${phoneFrame(864, { t: "Aisha K.", b: `<div class="box pad"><div class="caps">STU-0412</div><b>Aisha K.</b></div><div class="mut sm">(list behind the sheet)</div>` }, `<div class="sheet" style="top:170px"><div class="row"><b class="grow" style="font-size:16px">Edit account</b>${btn("✕", "s g")}</div><div class="col" style="margin-top:12px">${field("Name", "Aisha K.")}${field("Email", "aisha@example.com")}${field("Status", "Active ▾")}<div class="row" style="margin-top:6px">${btn("Save", "p")}${btn("Cancel")}</div></div></div>`, 1)}
${note(1290, 70, "On a phone the drawer becomes a bottom sheet. Five-item bottom nav replaces the sideways tab strip. More holds Guides, Audit log, Services, Enrollments.", "Mobile")}
</div>`;

/* 13 ---------------------------------------------------------- Kit */
const kit = `<div style="padding:40px 48px" class="col" >
  <div class="caps">Design tokens (existing brand, no new colours)</div>
  <div class="row" style="gap:10px">${[["Navy", "#1a3c5e", "primary actions, sidebar active"], ["Gold", "#e8a832", "focus, dark-mode primary"], ["Sky", "#4a9fd4", "info, links"], ["Coral", "#e05a4e", "urgent, destructive"], ["Green", "#16a34a", "paid, up"]].map(([n, h, u]) => `<div style="width:190px"><div style="height:54px;background:${h}"></div><div class="b" style="margin-top:6px">${n} <span class="mut" style="font-weight:400">${h}</span></div><div class="mut sm">${u}</div></div>`).join("")}</div>
  <div class="caps" style="margin-top:22px">Type, Satoshi · corners 0 px · 1 px lines</div>
  <div class="row" style="gap:40px;align-items:flex-end"><div><div style="font-size:28px;font-weight:900;letter-spacing:-.01em">Page title 28 / 900</div></div><div class="b" style="font-size:17px">Section 17 / 700</div><div>Body 13 / 400</div><div class="mut sm">Caption 11 / 400</div><div class="caps">Label 10 caps</div></div>
  <div class="caps" style="margin-top:22px">Buttons · chips · toggle</div>
  <div class="row" style="gap:10px">${btn("Primary", "p")}${btn("Secondary")}${btn("Ghost", "g")}${btn("Destructive", "d")}${btn("Small", "s")}<span style="width:20px"></span>${chip("paid", "ok")}${chip("due", "warn")}${chip("overdue", "bad")}${chip("new", "info")}${chip("draft")}<span style="width:20px"></span>${tgl("New")}</div>
  <div class="caps" style="margin-top:22px">Inputs</div>
  <div class="row" style="gap:10px">${field("Text", "Value", "width:220px")}${field("Select", "Active ▾", "width:180px")}<div class="field"><label>Search</label>${inp("Search…", "width:260px")}</div></div>
  <div class="caps" style="margin-top:22px">Table density</div>
  <div class="row" style="gap:16px;align-items:flex-start"><div class="box grow">${tbl(["Comfortable", "Status"], [["Row A", chip("ok", "ok")], ["Row B", chip("due", "warn")]])}</div><div class="box grow">${tbl(["Compact", "Status"], [["Row A", chip("ok", "ok")], ["Row B", chip("due", "warn")]])}</div></div>
  ${pin(820, 10, 5)}
</div>`;

/* 14 ---------------------------------------------------------- Map */
const mapping = `<div style="padding:40px 48px">
  <div class="caps">Where each Classic tab goes</div>
  <div class="box" style="margin-top:10px">${tbl(["Classic tab", "New location", "What changes"], [
    ["—", "<b>Work › Today</b>", "New. The queue of things that need a person."],
    ["Applications", "<b>Work › Applications</b>", "Table stays. Row opens in a drawer."],
    ["Pipeline", "<b>Work › Pipeline</b>", "Board view added. List view keeps the current table."],
    ["Accounts", "<b>People › Accounts</b>", "Type chips replace the grouped tables. Edit in drawer."],
    ["Services", "<b>Academics › Services</b>", "5 core columns. Rest in drawer and Columns menu."],
    ["Schedule", "<b>Academics › Schedule</b>", "Week calendar. Conflicts and requests in the right rail."],
    ["Enrollments", "<b>Academics › Enrollments</b>", "Segmented next to Services. Same data."],
    ["Billing", "<b>Money › Billing</b>", "KPI strip on top. Invoices and Paychecks segmented."],
    ["Tickets", "<b>Support › Tickets</b>", "Inbox and thread side by side."],
    ["Guides", "<b>Support › Guides</b>", "List and editor side by side."],
    ["Audit Log", "<b>System › Audit log</b>", "Filter chips. Restore button on recoverable deletes."],
  ])}</div>
  <div class="row" style="gap:16px;margin-top:22px;align-items:flex-start">
    <div class="box pad grow" style="line-height:1.7"><div class="caps" style="margin-bottom:6px">Build plan if approved</div>1. Add toggle to the header, default Classic.<br>2. New shell and Today behind the toggle.<br>3. One area at a time: Billing, Tickets, Accounts, then the rest.<br>4. Classic stays until you say remove it.</div>
    <div class="box pad grow" style="line-height:1.7"><div class="caps" style="margin-bottom:6px">Not changing</div>APIs, data, permissions, impersonation, backups, Student/Teacher/Parent/Staff/Ambassador portals.</div>
  </div>
</div>`;

export const FRAMES = [
  { id: "brief", n: "00", t: "Brief and decisions", w: 1120, h: 720, html: brief },
  { id: "header", n: "01", t: "Header toggle", w: 1100, h: 720, html: headerDetail },
  { id: "today", n: "02", t: "Today (home)", w: 1440, h: 900, html: today },
  { id: "pipeline", n: "03", t: "Pipeline", w: 1440, h: 900, html: pipeline },
  { id: "accounts", n: "04", t: "Accounts", w: 1440, h: 900, html: accounts },
  { id: "schedule", n: "05", t: "Schedule", w: 1440, h: 900, html: schedule },
  { id: "services", n: "06", t: "Services", w: 1440, h: 900, html: academics },
  { id: "billing", n: "07", t: "Billing", w: 1440, h: 900, html: billing },
  { id: "tickets", n: "08", t: "Tickets", w: 1440, h: 900, html: tickets },
  { id: "guides", n: "09", t: "Guides", w: 1440, h: 900, html: guides },
  { id: "audit", n: "10", t: "Audit log", w: 1440, h: 900, html: audit },
  { id: "states", n: "11", t: "Palette and states", w: 1440, h: 900, html: states },
  { id: "mobile", n: "12", t: "Mobile · 390 × 844", w: 1600, h: 900, html: mobile },
  { id: "kit", n: "13", t: "Tokens and components", w: 1440, h: 720, html: kit },
  { id: "map", n: "14", t: "Classic → New map", w: 1100, h: 820, html: mapping },
];
