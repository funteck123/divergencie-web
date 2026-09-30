import { I, btn, chip, tag, input, fld, cb, pips, steps, chipTone, sk, fade, paper, letters, qsBar } from "./kit.js";

const title = (t) => `<div style="font:600 22px var(--font);color:var(--navy)">${t}</div>`;
const progressBtn = (k = "") => btn("My progress & leaderboard", { i: "chart-line", k });
const who = `<span class="row" style="gap:8px;color:var(--white);opacity:.9">${I("user-check", 16)}Admin</span>`;
const lib = () => `<div class="body" style="position:relative">${fade}</div>`;

/* ---------- Q1 Shell ---------- */
export const q1 = () => {
  const pick = `<div class="row" style="gap:12px;margin-top:4px">${fld("Board", "A Levels", { dd: 1, v: 1, s: "width:200px" })}${fld("Subject", "Physics", { dd: 1, v: 1, s: "width:240px" })}${fld("Component", "Paper 1: Multiple Choice", { dd: 1, v: 1, s: "width:330px" })}</div>`;
  const a = sk("Q1A", "Pinned bar, title left, links right", "one bar on every screen", `${qsBar(`${progressBtn("on-dark")}${btn("Upload paper", { k: "on-dark", i: "upload" })}${who}`)}<div class="body">${title("Library")}<div style="margin-top:12px">${pick}</div></div>${fade}`, 230);
  const b = sk(
    "Q1B",
    "Bar plus three stage tabs",
    "Library, Upload paper, Progress",
    `${qsBar(who)}<div class="tabs"><span class="on">${I("book-open", 16)}&nbsp;Library</span><span>${I("upload", 16)}&nbsp;Upload paper</span><span>${I("chart-line", 16)}&nbsp;My progress & leaderboard</span></div><div class="body">${pick}</div>${fade}`,
    230
  );
  const c = sk(
    "Q1C",
    "Bar changes with the stage",
    "library state above, quiz state below",
    `${qsBar(`${progressBtn("on-dark")}${who}`)}<div style="height:16px"></div>${qsBar(`<span class="row" style="gap:8px;font:600 16px var(--mono);margin-right:12px">${I("timer", 18)}00:03</span>${btn("Pause", { k: "on-dark", i: "pause" })}${btn("Cancel", { k: "on-dark", i: "x" })}${btn("Done practicing", { k: "pri", i: "check" })}`, `<span class="row" style="gap:12px;margin-left:16px">${btn("Back to library", { k: "on-dark", i: "chevron-left" })}<b>Practice</b></span>`)}${fade}`,
    190
  );
  return { id: "q1", n: "Q1", name: "Question Solver: header and stage bar", html: a + b + c };
};

/* ---------- Q2 Library picker ---------- */
const linksRow = `<div class="row" style="gap:10px">${btn("Upload your own QP + MS PDFs", { i: "upload" })}${btn("View my progress & the leaderboard", { i: "chart-line" })}${btn("Mistakes Mode", { i: "rotate-ccw" })}</div>`;
export const q2 = () => {
  const a = sk(
    "Q2A",
    "Two rows of selects, fetch on the right",
    "all seven selects kept",
    `<div class="body"><div class="surf" style="padding:16px"><div class="gridf" style="grid-template-columns:repeat(4,1fr)">${fld("Board", "A Levels", { dd: 1, v: 1 })}${fld("Subject", "Physics", { dd: 1, v: 1 })}${fld("Component", "Paper 1: Multiple Choice", { dd: 1, v: 1 })}${fld("Paper Type", "Yearly past papers", { dd: 1, v: 1 })}${fld("Year", "2026", { dd: 1, v: 1 })}${fld("Session", "Feb/March", { dd: 1, v: 1 })}${fld("Paper", "Paper 12", { dd: 1, v: 1 })}<div style="display:flex;align-items:flex-end">${btn("Fetch this paper and start", { k: "pri", s: "width:100%;height:36px;justify-content:center" })}</div></div></div><div style="margin-top:12px">${linksRow}</div></div>`,
    250
  );
  const chips = [["Board", "A Levels"], ["Subject", "Physics"], ["Component", "Paper 1"], ["Type", "Yearly"], ["Year", "2026"], ["Session", "Feb/March"], ["Paper", "Paper 12"]];
  const b = sk(
    "Q2B",
    "Step chips, one list open at a time",
    "each chip reopens its searchable list",
    `<div class="body" style="position:relative"><div class="row" style="gap:6px;flex-wrap:wrap">${chips.map(([k, v], i) => `<span class="tagchip ${i === 1 ? "on" : ""}" style="height:34px;padding:0 12px"><span style="opacity:.7;font-weight:500">${k}</span>&nbsp;${v}${I("chevron-down", 14)}</span>`).join("")}</div>
     <div class="pop" style="left:200px;top:64px;width:300px;padding:0"><div style="padding:8px;border-bottom:1px solid var(--lb)">${input("Search", { i: "search", s: "width:100%" })}</div>${["Biology", "Business", "Chemistry", "Computer Science", "Economics", "Physics"].map((s) => `<div style="padding:8px 12px;${s === "Physics" ? "background:var(--lb);font-weight:600;color:var(--navy)" : ""}">${s}</div>`).join("")}</div>
     <div class="row" style="margin-top:236px;gap:10px">${btn("Fetch this paper and start", { k: "pri" })}${linksRow}</div></div>`,
    390
  );
  const c = sk(
    "Q2C",
    "Board switch, then subject and paper lists",
    "drill down, no sideways layout",
    `<div class="body"><div class="row" style="margin-bottom:12px"><span class="seg"><span>IGCSE</span><span class="on">A Levels</span></span>${input("Search subject", { i: "search", s: "width:260px" })}<div class="grow"></div>${btn("Mistakes Mode", { i: "rotate-ccw" })}${progressBtn()}</div>
     <div class="surf" style="overflow:hidden"><div class="grp">Subject</div><div class="row" style="padding:10px 12px;gap:8px;flex-wrap:wrap">${["Biology", "Business", "Chemistry", "Computer Science", "Economics", "Mathematics", "Physics"].map((s) => `<span class="tagchip ${s === "Physics" ? "on" : ""}" style="height:30px">${s}</span>`).join("")}</div>
     <div class="grp">Component</div><div class="row" style="padding:10px 12px;gap:8px;flex-wrap:wrap">${["Paper 1: Multiple Choice", "Paper 2: Structured", "Paper 3: Practical", "Paper 4: A Level Structured", "Paper 5: Planning"].map((s, i) => `<span class="tagchip ${i === 0 ? "on" : ""}" style="height:30px">${s}</span>`).join("")}</div>
     <div class="grp">Paper</div><div class="row" style="padding:10px 12px;gap:10px">${fld("Paper Type", "Yearly past papers", { dd: 1, v: 1, s: "width:200px" })}${fld("Year", "2026", { dd: 1, v: 1, s: "width:110px" })}${fld("Session", "Feb/March", { dd: 1, v: 1, s: "width:160px" })}${fld("Paper", "Paper 12", { dd: 1, v: 1, s: "width:150px" })}<div class="grow"></div><div style="padding-top:18px">${btn("Fetch this paper and start", { k: "pri", s: "height:36px" })}</div></div></div>
     <div class="row" style="margin-top:10px">${btn("Upload your own QP + MS PDFs", { i: "upload" })}</div></div>`,
    420
  );
  return { id: "q2", n: "Q2", name: "Library picker (Board, Subject, Component, Paper Type, Year, Session, Paper)", html: a + b + c };
};

/* ---------- Q3 Mode choice + upload ---------- */
const upload = () => `<div class="surf" style="padding:14px"><div class="row" style="gap:12px;align-items:flex-end">${fld("Question Paper PDF", "Choose file", { i: "file-text", s: "flex:1" })}${fld("Mark Scheme / Answer Key PDF", "Choose file", { i: "file-text", s: "flex:1" })}${btn("Digitize this paper", { k: "pri", s: "height:32px" })}</div></div>`;
export const q3 = () => {
  const meta = `<div class="row" style="gap:10px">${tag("40 questions")}${btn("Question paper PDF", { c: "sm", i: "file-text", is: 14 })}${btn("Mark scheme PDF", { c: "sm", i: "file-text", is: 14 })}</div>`;
  const a = sk("Q3A", "Two equal buttons, upload as a strip", "Practice Mode, Test Mode side by side", `<div class="body"><div class="row" style="margin-bottom:12px">${title("Paper 12 · Feb/March 2026")}${meta}</div><div class="row" style="gap:16px"><span class="btn nav" style="flex:1;height:72px;justify-content:center;font-size:18px">${I("eye", 22)}Practice Mode</span><span class="btn nav" style="flex:1;height:72px;justify-content:center;font-size:18px">${I("timer", 22)}Test Mode</span></div><div style="margin-top:16px">${upload()}</div></div>`, 290);
  const b = sk("Q3B", "Stacked rows with a detail tag", "untimed or timed, one line each", `<div class="body"><div class="row" style="margin-bottom:12px">${title("Paper 12 · Feb/March 2026")}${meta}</div><div class="surf" style="overflow:hidden"><div class="row" style="height:64px;padding:0 16px;gap:14px;border-bottom:1px solid var(--lb)">${I("eye", 22)}<b class="grow" style="font-size:16px">Practice Mode</b>${tag("No grading")}${I("chevron-right", 18)}</div><div class="row" style="height:64px;padding:0 16px;gap:14px">${I("timer", 22)}<b class="grow" style="font-size:16px">Test Mode</b>${tag("Timed, one submission")}${I("chevron-right", 18)}</div></div><div class="row" style="margin-top:14px;padding:12px 16px;background:var(--white);border:1px solid var(--lb);border-radius:4px">${I("chevron-down", 16)}<b>Upload your own paper</b></div></div>`, 280);
  const c = sk("Q3C", "Mode switch plus one start button", "upload as a tab", `<div class="body"><div class="row" style="margin-bottom:12px">${title("Paper 12 · Feb/March 2026")}${meta}</div><div class="tabs" style="padding:0;margin-bottom:12px"><span class="on">Library paper</span><span>Upload paper</span></div><div class="surf" style="padding:16px" ><div class="row" style="gap:16px"><span class="seg"><span class="on">Practice Mode</span><span>Test Mode</span></span><div class="grow"></div>${btn("Start", { k: "pri", i: "play", s: "height:40px;padding:0 24px;font-size:15px" })}</div></div></div>`, 250);
  return { id: "q3", n: "Q3", name: "Mode choice and upload (Practice Mode, Test Mode, Digitize this paper)", html: a + b + c };
};

/* ---------- Q4 Quiz bar ---------- */
const qcard = (n, extra = "") => `<div class="surf" style="padding:14px;margin-top:12px"><div class="row" style="margin-bottom:8px"><b style="font-size:16px">Question ${n}</b>${extra}</div>${paper(150)}</div>`;
export const q4 = () => {
  const a = sk(
    "Q4A",
    "Top bar pinned, number strip under it",
    "timer, Pause, Cancel, jump numbers",
    `${qsBar(`<span class="row" style="gap:8px;font:600 16px var(--mono);margin-right:12px">${I("timer", 18)}05:12</span>${btn("Pause", { k: "on-dark", i: "pause" })}${btn("Cancel", { k: "on-dark", i: "x" })}${btn("Submit quiz", { k: "pri", i: "check" })}`, `<b style="margin-left:16px">Test</b>`)}
     <div class="row" style="padding:8px 24px;background:var(--white);border-bottom:1px solid var(--lb);gap:4px;flex-wrap:wrap">${Array.from({ length: 24 }, (_, i) => `<span class="qn ${i === 2 ? "on" : i === 6 ? "warn" : ""}">${i + 1}</span>`).join("")}<span class="mut" style="margin-left:8px">+16</span></div>
     <div class="body" style="padding-top:0">${qcard(3)}</div>${fade}`,
    400
  );
  const b = sk(
    "Q4B",
    "Bottom bar pinned, thumb reach",
    "timer and actions at the bottom edge",
    `<div class="body">${qcard(2)}${qcard(3)}</div>${fade}<div class="row" style="position:absolute;left:0;right:0;bottom:0;height:60px;padding:0 24px;background:var(--navy);color:var(--white);z-index:10;gap:10px"><span class="row" style="gap:8px;font:600 16px var(--mono)">${I("timer", 18)}05:12</span>${btn("Pause", { k: "on-dark", i: "pause" })}${btn("Cancel", { k: "on-dark", i: "x" })}<div class="grow"></div><span class="row" style="gap:8px;font-size:13px">${I("flag", 16)}Flagged: Q3, Q7</span>${btn("Submit quiz", { k: "pri", i: "check" })}</div>`,
    400
  );
  const c = sk(
    "Q4C",
    "Slim pinned pill, flagged jumps on the right",
    "minimum height, content first",
    `<div class="row" style="position:absolute;left:24px;right:24px;top:10px;height:44px;padding:0 10px;background:var(--navy);color:var(--white);border-radius:6px;z-index:10;gap:8px;box-shadow:0 6px 18px rgba(26,26,26,.25)"><span class="row" style="gap:6px;font:600 15px var(--mono);padding:0 8px">${I("timer", 16)}05:12</span>${btn("", { k: "on-dark", c: "ic sm", i: "pause" })}${btn("", { k: "on-dark", c: "ic sm", i: "x" })}<div class="grow"></div><span class="row" style="gap:6px">${btn("Q3", { k: "on-dark", c: "sm", i: "flag", is: 14 })}${btn("Q7", { k: "on-dark", c: "sm", i: "flag", is: 14 })}</span>${btn("Submit quiz", { k: "pri", c: "sm" })}</div>
     <div class="body" style="padding-top:64px">${qcard(3)}${qcard(4)}</div>${fade}`,
    400
  );
  return { id: "q4", n: "Q4", name: "Quiz bar (timer, Pause, Cancel, Done practicing, Submit quiz, flagged)", html: a + b + c };
};

/* ---------- Q5 MCQ question card ---------- */
export const q5 = () => {
  const a = sk(
    "Q5A",
    "Tabs above the image, letters below",
    "Practice: Question and Answer tabs. Test: letters",
    `<div class="body"><div class="surf" style="padding:14px"><div class="row" style="margin-bottom:10px"><b style="font-size:16px">Question 3</b><span class="seg" style="margin-left:8px"><span class="on">Question</span><span>Answer</span></span><div class="grow"></div><span class="row" style="gap:8px">${cb(1)}${I("flag", 16)}Flag</span></div>${paper(170)}
     <div class="row" style="margin-top:12px;gap:8px">${letters("C")}<div class="grow"></div>${chip("Correct", "ok")}${btn("Check answer", { i: "circle-check" })}</div></div><div class="row" style="margin-top:10px;gap:8px">${cb(1)}<span>Show if I'm right after each question</span></div></div>`,
    420
  );
  const b = sk(
    "Q5B",
    "Image full width, one action row",
    "letters, check and flag share the row",
    `<div class="body"><div class="surf" style="padding:0;overflow:hidden"><div class="row" style="height:44px;padding:0 14px;background:var(--lb)"><b>Question 3</b><div class="grow"></div>${chip("Flagged", "warn")}</div>${paper(190)}<div class="row" style="padding:10px 14px;gap:8px;border-top:1px solid var(--lb)">${letters("C")}<div class="grow"></div>${btn("Check answer", { i: "circle-check" })}${btn("Flag", { i: "flag" })}</div></div></div>`,
    400
  );
  const c = sk(
    "Q5C",
    "Collapsed card, tap to open",
    "number, state and answer in one line",
    `<div class="body"><div class="surf" style="overflow:hidden">${[[1, "C", "Correct"], [2, "A", "Incorrect"], [3, "C", "Flagged"], [4, "", ""]].map(([n, l, s], i) => `<div class="row" style="height:52px;padding:0 14px;gap:12px;border-bottom:1px solid var(--lb)">${I(i === 2 ? "chevron-down" : "chevron-right", 16)}<b style="width:110px">Question ${n}</b><span class="row" style="gap:4px">${["A", "B", "C", "D"].map((x) => `<span class="qn ${x === l ? "on" : ""}" style="width:32px;height:28px">${x}</span>`).join("")}</span>${s ? chip(s, chipTone(s)) : ""}<div class="grow"></div>${btn("", { c: "sm ic", i: "flag" })}</div>${i === 2 ? `<div style="padding:10px 14px;background:var(--off)">${paper(130)}<div class="row" style="margin-top:8px;gap:8px">${btn("Check answer", { i: "circle-check" })}${btn("Answer", { i: "eye" })}</div></div>` : ""}`).join("")}</div></div>`,
    420
  );
  return { id: "q5", n: "Q5", name: "MCQ question card (Question, Answer, A to D, Check answer, Flag)", html: a + b + c };
};

/* ---------- Q6 Structured card ---------- */
const brk = (rows) => `<table class="tbl"><colgroup><col style="width:50px"><col style="width:260px"><col></colgroup><thead><tr><th></th><th>Mark</th><th>Evidence</th></tr></thead><tbody>${rows.map(([ok, m, e]) => `<tr><td>${I(ok ? "circle-check" : "circle-x", 18)}</td><td>${m}</td><td class="mut">${e}</td></tr>`).join("")}</tbody></table>`;
export const q6 = () => {
  const rows = [[1, "Uses F = ma", "Line 1"], [1, "Substitutes values", "Line 2"], [0, "Final unit", "Missing"]];
  const a = sk("Q6A", "Image, answer box, result in place", "graded marks appear under the box", `<div class="body"><div class="surf" style="padding:14px"><div class="row" style="margin-bottom:10px"><b style="font-size:16px">Question 2</b><div class="grow"></div>${chip("Graded", "ok")}<b>2 / 3</b></div>${paper(150)}<div class="ta" style="margin-top:12px">Your working</div><div class="row" style="margin-top:10px;gap:8px">${btn("Submit answer", { k: "nav" })}${btn("Diagram template", { i: "file-text" })}</div><div style="margin-top:12px">${brk(rows)}</div></div></div>`, 560);
  const b = sk("Q6B", "Answer and result as tabs", "Question, Your answer, Marks, Full-mark answer", `<div class="body"><div class="surf" style="padding:14px"><div class="row" style="margin-bottom:10px"><b style="font-size:16px">Question 2</b><span class="seg" style="margin-left:8px"><span>Question</span><span class="on">Your answer</span><span>Marks</span><span>Full-mark answer</span></span><div class="grow"></div>${chip("Graded", "ok")}<b>2 / 3</b></div><div class="ta" style="height:150px">Your working</div><div class="row" style="margin-top:10px;gap:8px">${btn("Submit answer", { k: "nav" })}${chip("Answer changed since last submit", "warn").replace("Answer changed since last submit", "Changed")}</div></div></div>`, 330);
  const c = sk("Q6C", "Result strip above, details folded", "marks first, evidence on demand", `<div class="body"><div class="surf" style="padding:14px"><div class="row" style="margin-bottom:10px"><b style="font-size:16px">Question 2</b>${chip("Graded", "ok")}<div class="grow"></div><span class="row" style="gap:6px">${[1, 1, 0].map((x) => I(x ? "circle-check" : "circle-x", 22)).join("")}</span><b style="font-size:18px;margin-left:6px">2 / 3</b></div>${paper(120)}<div class="ta" style="margin-top:12px;height:70px">Your working</div><div class="row" style="margin-top:10px;gap:8px">${btn("Submit answer", { k: "nav" })}${btn("Mark breakdown", { i: "chevron-down" })}${btn("Full-mark answer", { i: "chevron-down" })}</div></div></div>`, 370);
  return { id: "q6", n: "Q6", name: "Structured question card (Submit answer, marks, breakdown, full-mark answer)", html: a + b + c };
};

/* ---------- Q7 Results ---------- */
const rev = [["1", "C", "C", "Correct"], ["2", "A", "B", "Incorrect"], ["3", "C", "C", "Flagged"], ["4", "D", "D", "Correct"], ["5", "—", "A", "Incorrect"]];
export const q7 = () => {
  const banner = `<div class="row" style="gap:16px;margin-bottom:12px"><b style="font-size:34px;font-variant-numeric:tabular-nums">31 / 38</b><span class="tag">82%</span>${chip("Saved", "ok")}<div class="grow"></div>${btn("Digitize another paper", { k: "pri", i: "upload" })}${btn("My progress & leaderboard", { i: "chart-line" })}</div>`;
  const a = sk("Q7A", "Banner, then compact review table", "one row per question", `<div class="body">${banner}<table class="tbl"><colgroup><col style="width:120px"><col style="width:140px"><col style="width:140px"><col><col style="width:110px"></colgroup><thead><tr><th>Question</th><th>Your answer</th><th>Correct</th><th>Status</th><th></th></tr></thead><tbody>${rev.map(([q, y, c, s]) => `<tr><td><b>${q}</b></td><td>${y}</td><td>${c}</td><td>${chip(s, chipTone(s))}</td><td>${btn("Review", { c: "sm" })}</td></tr>`).join("")}</tbody></table></div>`, 400);
  const b = sk("Q7B", "Number grid colored by result", "tap a number to open that question", `<div class="body">${banner}<div class="row" style="gap:6px;flex-wrap:wrap">${Array.from({ length: 38 }, (_, i) => `<span class="qn ${[1, 4, 11, 19, 27, 30, 33].includes(i) ? "bad" : i === 2 ? "warn" : ""}" style="width:44px;height:38px">${i + 1}</span>`).join("")}</div><div class="row" style="margin-top:12px;gap:16px">${chip("Correct", "ok")}${chip("Incorrect", "bad")}${chip("Flagged", "warn")}</div></div>`, 360);
  const c = sk("Q7C", "Incorrect first, correct folded", "review the misses before the rest", `<div class="body">${banner}<div class="surf" style="overflow:hidden"><div class="grp" style="background:var(--coral);color:var(--white)">${I("circle-x", 16)}Incorrect<span class="tag" style="background:var(--white)">7</span></div>${rev.filter((r) => r[3] === "Incorrect").map(([q, y, c]) => `<div class="row" style="height:44px;padding:0 16px;gap:16px;border-bottom:1px solid var(--lb)"><b style="width:100px">Question ${q}</b><span>Your answer ${y}</span><span class="mut">Correct ${c}</span><div class="grow"></div>${btn("Review", { c: "sm" })}</div>`).join("")}<div class="grp">${I("chevron-right", 16)}Flagged<span class="tag" style="background:var(--white)">1</span></div><div class="grp">${I("chevron-right", 16)}Correct<span class="tag" style="background:var(--white)">30</span></div></div></div>`, 420);
  return { id: "q7", n: "Q7", name: "Results (score, review, Digitize another paper)", html: a + b + c };
};

/* ---------- Q8 Progress and leaderboard ---------- */
const chartSvg = (w, h) => {
  const xs = Array.from({ length: 6 }, (_, i) => Math.round(40 + ((w - 56) * i) / 5));
  const line = (ys) => xs.map((x, i) => `${x},${h - ys[i]}`).join(" ");
  const me = [54, 84, 76, 116, 108, 140];
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block;background:var(--white);border:1px solid var(--lb);border-radius:4px"><g stroke="#D5E8F0" stroke-width="1">${[0, 1, 2, 3].map((i) => `<line x1="40" x2="${w - 12}" y1="${16 + (i * (h - 40)) / 3}" y2="${16 + (i * (h - 40)) / 3}"/>`).join("")}</g><g fill="#666" font-size="11" font-family="Inter,Arial">${["100", "66", "33", "0"].map((t, i) => `<text x="8" y="${20 + (i * (h - 40)) / 3}">${t}</text>`).join("")}</g><polyline fill="none" stroke="#4A9FD4" stroke-width="2" opacity=".5" points="${line([70, 80, 100, 96, 112, 120])}"/><polyline fill="none" stroke="#1A3C5E" stroke-width="3" stroke-linejoin="round" points="${line(me)}"/><circle cx="${xs[5]}" cy="${h - me[5]}" r="5" fill="#1A3C5E"/></svg>`;
};
const hist = `<table class="tbl"><colgroup><col><col style="width:90px"><col style="width:150px"><col style="width:90px"><col style="width:70px"><col style="width:100px"><col style="width:130px"><col style="width:90px"></colgroup><thead><tr><th>Paper</th><th>Mode</th><th>Chapter</th><th>Score</th><th class="num">%</th><th>Time taken</th><th>When</th><th></th></tr></thead><tbody>${[["Physics 1 Feb/March 2026 P12", "Test", "All", "31 / 38", "82", "42:10", "Sep 29"], ["Physics 1 Oct/Nov 2025 P11", "Test", "All", "27 / 40", "68", "51:02", "Sep 27"], ["Kinematics worksheet 1", "Practice", "2.1", "-", "-", "12:40", "Sep 25"]].map((r) => `<tr><td><b>${r[0]}</b></td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td><td class="num">${r[4]}</td><td>${r[5]}</td><td>${r[6]}</td><td>${btn("View", { c: "sm" })}</td></tr>`).join("")}</tbody></table>`;
const lbT = `<table class="tbl"><colgroup><col style="width:60px"><col><col style="width:160px"><col style="width:160px"></colgroup><thead><tr><th>#</th><th>Student</th><th class="num">Average %</th><th class="num">Total correct</th></tr></thead><tbody>${[["1", "Mei L.", "91", "612"], ["2", "Zara M.", "88", "574"], ["3", "Sam O.", "84", "530"]].map((r) => `<tr><td>${r[0]}</td><td><b>${r[1]}</b></td><td class="num">${r[2]}</td><td class="num">${r[3]}</td></tr>`).join("")}</tbody></table>`;
const filters = `<div class="row" style="gap:10px">${fld("Subject", "Physics", { dd: 1, v: 1, s: "width:200px" })}${fld("Chapter", "All chapters", { dd: 1, v: 1, s: "width:220px" })}</div>`;
export const q8 = () => {
  const a = sk("Q8A", "Sections in one column, chart first", "chart, history, mistakes, leaderboard", `<div class="body"><div class="row" style="margin-bottom:10px">${title("My progress")}<div class="grow"></div>${filters}</div>${chartSvg(1232, 170)}<div style="margin-top:12px">${hist}</div></div>${fade}`, 420);
  const b = sk("Q8B", "Four tabs, one section at a time", "Progress, History, Mistakes, Leaderboard", `<div class="body"><div class="row" style="margin-bottom:10px">${title("My progress")}<span class="seg" style="margin-left:12px"><span class="on">Progress</span><span>History</span><span>Mistakes</span><span>Leaderboard</span></span><div class="grow"></div>${filters}</div>${chartSvg(1232, 230)}</div>`, 360);
  const c = sk("Q8C", "Summary strip, sections fold", "latest score, attempts, rank on top", `<div class="body"><div class="row" style="gap:12px;margin-bottom:12px">${[["Last score", "82%"], ["Attempts", "14"], ["Rank, Physics", "3"], ["Mistakes", "27"]].map(([l, v]) => `<div class="surf grow" style="padding:10px 14px"><div class="lbl">${l}</div><b style="font-size:24px">${v}</b></div>`).join("")}</div>
   <div class="grp">${I("chevron-down", 16)}Score over time</div><div style="padding:10px 0">${chartSvg(1232, 140)}</div><div class="grp">${I("chevron-right", 16)}History</div><div class="grp" style="margin-top:1px">${I("chevron-right", 16)}Mistake tracker</div><div class="grp" style="margin-top:1px">${I("chevron-down", 16)}Leaderboard</div>${lbT}</div>`, 520);
  return { id: "q8", n: "Q8", name: "Progress and leaderboard (chart, history, mistakes, tiers)", html: a + b + c };
};
export { chartSvg, hist, lbT, filters };
