import { part1, part2, part3, part4, part5 } from "./parts-a.js";
import { part6, part7, part8, part9, part10, part11, part12, part13 } from "./parts-b.js";

const parts = [part1, part2, part3, part4, part5, part6, part7, part8, part9, part10, part11, part12, part13].map((f) => f());

const head = `
<h1>Admin UI sketches</h1>
<p class="lead">Current layout kept. Structure, placement, sizing and spacing change. Pick one option per part.</p>
<h3 style="margin-top:24px">Measured on production, 1440 × 900</h3>
<div class="facts">
  <div><b>2,175 px</b>hidden sideways scroll, Student Accounts</div>
  <div><b>21</b>columns in one Student table</div>
  <div><b>1,104 px</b>content width on a 1,440 px screen</div>
  <div><b>6 screens</b>Accounts page height, 10 tables, 319 buttons</div>
  <div><b>0</b>pinned bars: header and tabs scroll away</div>
  <div><b>2 boxes</b>Enrollments: forms beside tables, tables clipped</div>
</div>
<h3>Personas</h3>
<div class="personas">
  <div><b>A · Ledger</b><span>One line per record. Dense, fast to scan, everything visible.</span></div>
  <div><b>B · Desk</b><span>Two lines per record. Larger targets, sheets and pages for detail.</span></div>
  <div><b>C · Console</b><span>Action first. Selection bars, menus, rail, floating create.</span></div>
</div>
<h3>Parts</h3>
<nav class="index">${parts.map((p) => `<a href="#${p.id}">${p.n} ${p.name.split(" (")[0]}</a>`).join("")}</nav>
<h3>Rules applied to every sketch</h3>
<div class="facts" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr))">
  <div>Top bar pinned. Only the list scrolls.</div>
  <div>Full width. No sideways scroll at 1280.</div>
  <div>One record, one row. Rest opens in place.</div>
  <div>Forms collapsed until needed. Data first.</div>
  <div>Every current button kept, new place and size.</div>
  <div>Dropdowns A to Z, searchable. Labels only, no sentences.</div>
</div>`;

const app = document.getElementById("app");
app.innerHTML = head + parts.map((p) => `<h2 id="${p.id}">${p.n} · ${p.name}</h2>${p.html}`).join("");

function fit() {
  const avail = Math.min(innerWidth - 48, 1290);
  document.querySelectorAll(".sk:not(.ph)").forEach((el) => {
    const z = Math.min(1, avail / 1282);
    el.style.zoom = z;
  });
}
addEventListener("resize", fit);
fit();
