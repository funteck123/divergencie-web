import { q1, q2, q3, q4, q5, q6, q7, q8 } from "./parts-qs.js";
import { q13, s1, s2, s3, s4, s5, s13 } from "./parts-sy.js";

const parts = [q1, q2, q3, q4, q5, q6, q7, q8, q13, s1, s2, s3, s4, s5, s13].map((f) => f());

const intro1 = `
<h1>Question Solver and Syllabus sketches</h1>
<p class="lead">Current tools kept. Structure, placement, sizing and spacing change. Pick one option per part.</p>
<h3 style="margin-top:20px">Measured on the live pages, 1440 × 900 and 390 × 844</h3>
<div class="facts">
  <div><b>800 px</b>Question Solver column on a 1,440 px screen</div>
  <div><b>27 screens</b>one Practice page, 39 questions in a row</div>
  <div><b>23 px</b>sideways scroll on a phone, Library</div>
  <div><b>0</b>pinned bars in both tools: timer, Pause and Cancel scroll away</div>
  <div><b>2 boxes</b>Syllabus: subject list beside the content</div>
  <div><b>381 px</b>sideways scroll on a phone, open Syllabus subject</div>
</div>
<h3>Personas</h3>
<div class="personas">
  <div><b>A · Ledger</b><span>Dense, one line, everything visible at once.</span></div>
  <div><b>B · Desk</b><span>Roomier, larger targets, sheets and steps.</span></div>
  <div><b>C · Console</b><span>Action first. Pinned bars, menus, folded sections.</span></div>
</div>`;
const intro2 = `
<h3 style="margin-top:0">Parts</h3>
<nav class="index">${parts.map((p) => `<a href="#${p.id}">${p.n} ${p.name.split(" (")[0]}</a>`).join("")}</nav>
<h3>Rules applied to every sketch</h3>
<div class="facts" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr))">
  <div>Bars pinned. Only the content scrolls.</div>
  <div>Full width. No sideways scroll at 1280 or 390.</div>
  <div>Every current button kept, new place and size.</div>
  <div>Dropdowns A to Z, searchable.</div>
  <div>Labels only, no sentences in the UI.</div>
  <div>Brand palette, Inter, line icons.</div>
</div>`;

/* ---- blocks: the smallest pieces that must never be split across pages ---- */
const blocks = [{ kind: "text", html: intro1 }, { kind: "text", html: intro2 }];
parts.forEach((p) => {
  const h2 = `<h2 id="${p.id}">${p.n} · ${p.name}</h2>`;
  if (p.raw) {
    blocks.push({ kind: "raw", html: h2 + p.html });
    return;
  }
  p.html.split(/(?=<div class="cap">)/).forEach((frame, i) => blocks.push({ kind: "frame", html: (i === 0 ? h2 : "") + frame }));
});

/* ---- A4 landscape, 96 dpi: 297 x 210 mm, margins 10 / 10 / 14 / 10 mm ---- */
const MM = 96 / 25.4;
const SHEET_W = Math.round(297 * MM);
const CONTENT_W = Math.round(277 * MM);
const CONTENT_H = Math.round(186 * MM);
const GAP = 12;
const SAFETY = 14;
const FRAME_W = 1282;
const RAW_W = 1260;

const app = document.getElementById("app");

function measure(block) {
  const el = document.createElement("section");
  el.className = "blk " + block.kind;
  el.innerHTML = block.html;
  if (block.kind === "raw") {
    // phone rows: lay out at natural width (3 phones on one line), then scale the whole block to fit the sheet
    el.style.width = RAW_W + "px";
    app.appendChild(el);
    const h0 = el.offsetHeight;
    const z = Math.min(CONTENT_W / RAW_W, CONTENT_H / h0);
    el.style.zoom = z.toFixed(4);
    return { el, h: Math.round(h0 * z) };
  }
  el.style.width = CONTENT_W + "px";
  app.appendChild(el);
  const wraps = el.querySelectorAll(".wrap");
  let scale = 1;
  if (block.kind === "frame") {
    scale = CONTENT_W / FRAME_W;
    wraps.forEach((w) => (w.style.zoom = scale));
  }
  let h = el.offsetHeight;
  if (block.kind === "frame" && h > CONTENT_H) {
    const shrink = CONTENT_H / h;
    wraps.forEach((w) => (w.style.zoom = (scale * shrink).toFixed(4)));
    h = el.offsetHeight;
  }
  return { el, h };
}

function paginate() {
  app.innerHTML = "";
  const measured = blocks.map(measure);
  const sheets = [];
  let cur = null;
  let used = 0;
  measured.forEach(({ el, h }) => {
    if (!cur || used + h + (used ? GAP : 0) > CONTENT_H - SAFETY) {
      cur = document.createElement("div");
      cur.className = "a4";
      cur.innerHTML = '<div class="a4c"></div><div class="a4f"></div>';
      sheets.push(cur);
      used = 0;
    }
    cur.firstChild.appendChild(el);
    el.style.marginTop = used ? GAP + "px" : "0";
    used += h + (used ? GAP : 0);
  });
  app.innerHTML = "";
  sheets.forEach((s, i) => {
    s.lastChild.innerHTML = `<span>DivergenCIE Question Solver and Syllabus sketches</span><span>${i + 1} / ${sheets.length}</span>`;
    app.appendChild(s);
  });
  fitScreen();
}

function fitScreen() {
  const z = Math.min(1, (innerWidth - 32) / SHEET_W);
  app.style.zoom = z;
}
addEventListener("resize", fitScreen);

const ready = document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]) : Promise.resolve();
ready.then(paginate);
