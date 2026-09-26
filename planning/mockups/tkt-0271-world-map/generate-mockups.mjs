import fs from "fs";
import { geoEqualEarth, geoPath, geoContains } from "d3-geo";
import { feature, merge } from "topojson-client";

const t50 = JSON.parse(fs.readFileSync("node_modules/world-atlas/countries-50m.json"));
const t110 = JSON.parse(fs.readFileSync("node_modules/world-atlas/countries-110m.json"));
const c50 = feature(t50, t50.objects.countries).features.filter((f) => f.properties.name !== "Antarctica");
const c110 = feature(t110, t110.objects.countries).features.filter((f) => f.properties.name !== "Antarctica");
const proj = geoEqualEarth().fitExtent([[10, 24], [990, 520]], { type: "FeatureCollection", features: c50 });
const path = geoPath(proj).digits(1);

// 21 real countries (TKT-0221). anchor = real lon/lat. natural = Natural Earth name.
const C = [
  { name: "UK", ne: "United Kingdom", lon: -1.5, lat: 53, hq: true, region: "EUROPE" },
  { name: "US", ne: "United States of America", lon: -98.5, lat: 39.5, region: "AMERICAS" },
  { name: "Cayman Islands", ne: "Cayman Is.", lon: -81.25, lat: 19.3, region: "AMERICAS", tiny: true },
  { name: "Egypt", ne: "Egypt", lon: 30, lat: 26.5, region: "AFRICA" },
  { name: "Sudan", ne: "Sudan", lon: 30, lat: 15.5, region: "AFRICA" },
  { name: "Nigeria", ne: "Nigeria", lon: 8, lat: 9.5, region: "AFRICA" },
  { name: "Tanzania", ne: "Tanzania", lon: 34.8, lat: -6.3, region: "AFRICA" },
  { name: "South Africa", ne: "South Africa", lon: 24.5, lat: -29, region: "AFRICA" },
  { name: "Seychelles", ne: "Seychelles", lon: 55.5, lat: -4.6, region: "AFRICA", tiny: true },
  { name: "Turkey", ne: "Turkey", lon: 35.2, lat: 39, region: "EUROPE" },
  { name: "Saudi Arabia", ne: "Saudi Arabia", lon: 44, lat: 24, region: "GULF" },
  { name: "Qatar", ne: "Qatar", lon: 51.2, lat: 25.3, region: "GULF", tiny: true },
  { name: "UAE", ne: "United Arab Emirates", lon: 54.3, lat: 24.2, region: "GULF", tiny: true },
  { name: "Pakistan", ne: "Pakistan", lon: 69.4, lat: 30, region: "SOUTH ASIA" },
  { name: "India", ne: "India", lon: 78.9, lat: 22, region: "SOUTH ASIA" },
  { name: "Bangladesh", ne: "Bangladesh", lon: 90.3, lat: 23.7, region: "SOUTH ASIA", tiny: true },
  { name: "Sri Lanka", ne: "Sri Lanka", lon: 80.7, lat: 7.8, region: "SOUTH ASIA", tiny: true },
  { name: "Malaysia", ne: "Malaysia", lon: 102, lat: 4.2, region: "SOUTH-EAST ASIA" },
  { name: "Singapore", ne: "Singapore", lon: 103.85, lat: 1.35, region: "SOUTH-EAST ASIA", tiny: true },
  { name: "Indonesia", ne: "Indonesia", lon: 113.9, lat: -0.8, region: "SOUTH-EAST ASIA" },
  { name: "Australia", ne: "Australia", lon: 134, lat: -25.5, region: "OCEANIA" },
];
for (const c of C) { [c.x, c.y] = proj([c.lon, c.lat]); }
const hiNames = new Set(C.map((c) => c.ne));
const landPaths = c110.filter((f) => !hiNames.has(f.properties.name)).map((f) => path(f)).filter(Boolean);
const hiPaths = Object.fromEntries(c50.filter((f) => hiNames.has(f.properties.name)).map((f) => [f.properties.name, path(f)]));
const VB = "0 52 1000 452";

const CSS = `
:root{--navy:#1a3c5e;--gold:#e8a832;--sky:#4a9fd4;--soft:#f4f4f4;--muted:#666}
*{box-sizing:border-box}body{margin:0;background:var(--soft);font-family:Inter,system-ui,Segoe UI,Helvetica,Arial,sans-serif;color:var(--navy)}
.wrap{max-width:1400px;margin:0 auto;padding:56px 24px 48px;text-align:center}
.eyebrow{color:var(--gold);font-weight:900;letter-spacing:.3em;font-size:12px;text-transform:uppercase;margin:0 0 14px}
h2{font-size:64px;line-height:.92;font-weight:900;margin:0 0 18px;text-transform:uppercase}h2 span{color:var(--gold)}
.sub{font-size:13px;font-weight:900;letter-spacing:.2em;color:var(--muted);text-transform:uppercase;margin:0 0 28px}
svg{width:100%;height:auto;display:block}
.chips{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;max-width:900px;margin:18px auto 0}
.chip{background:#fff;border:1px solid rgba(0,0,0,.08);padding:6px 12px;font-size:11px;font-weight:700;letter-spacing:.08em;color:var(--muted);text-transform:uppercase}
.note{max-width:760px;margin:26px auto 0;background:#fff;border:1px solid rgba(0,0,0,.08);border-left:4px solid var(--gold);padding:14px 18px;text-align:left;font-size:13px;line-height:1.5;color:#333}
.note b{color:var(--navy)}
.tag{position:absolute;top:10px;left:10px;background:var(--navy);color:#fff;font-size:11px;font-weight:800;letter-spacing:.15em;padding:5px 9px}
@keyframes ping{0%{transform:scale(1);opacity:.55}80%,100%{transform:scale(2.6);opacity:0}}
.ping{transform-box:fill-box;transform-origin:center;animation:ping 2.4s ease-out infinite}
text{font-family:inherit}
`;
const NOTE = `<div class="note"><b>The new UN map.</b> In September 2026 the UN General Assembly backed the <b>Equal Earth</b> projection, which draws every country at its true relative size. Africa is no longer shrunk the way the old Mercator map shrinks it. This map uses it. <span style="color:#777">(Adopted 4 September 2026, resolution A/80/L.104, 164 in favour.)</span></div>`;
const head = (label) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>TKT-0271 mockup ${label}</title><style>${CSS}</style></head><body><div class="wrap">
<p class="eyebrow">Worldwide reach</p><h2>DivergenCIE<br>goes <span>global.</span></h2><p class="sub">Students from 21 countries. One standard: exceptional.</p>`;
const chips = `<div class="chips">${C.map((c) => `<span class="chip">${c.name}</span>`).join("")}</div>`;
const foot = `${NOTE}</div></body></html>`;
const sq = (c, size, fill, ping = true) => `<g transform="translate(${c.x.toFixed(1)},${c.y.toFixed(1)})">${ping ? `<rect class="ping" x="${-size}" y="${-size}" width="${size * 2}" height="${size * 2}" fill="${fill}" opacity=".5"/>` : ""}<rect x="${-size / 2}" y="${-size / 2}" width="${size}" height="${size}" fill="${fill}" stroke="#fff" stroke-width="1"/></g>`;

// ---------- A: square markers + leader-line labels ----------
const PL = { // [x, y, anchor, leaderTarget?]
  "UK": [486, 116, "end"], "US": [257, 172, "middle"], "Cayman Islands": [290, 226, "start"],
  "Egypt": [570, 201, "end"], "Sudan": [574, 240, "end"], "Nigeria": [514, 262, "end"], "Tanzania": [588, 321, "end"],
  "South Africa": [556, 404, "end"], "Seychelles": [664, 315, "start"], "Turkey": [587, 140, "middle", [587, 143]],
  "Saudi Arabia": [604, 268, "middle", [610, 258]], "Qatar": [622, 178, "end", [624, 174]], "UAE": [670, 250, "start", [667, 246]],
  "Pakistan": [678, 168, "middle", [679, 172]], "India": [750, 240, "start", [746, 236]], "Bangladesh": [772, 182, "start", [768, 186]],
  "Sri Lanka": [733, 269, "start"], "Malaysia": [866, 250, "start", [862, 246]], "Singapore": [772, 350, "middle", [776, 340]],
  "Indonesia": [826, 301, "start"], "Australia": [854, 408, "middle"],
};
function variantA() {
  const svg = `<svg viewBox="${VB}" role="img" aria-label="Equal Earth world map showing DivergenCIE student locations">
  <g fill="#dfe4ea" stroke="#fff" stroke-width=".5">${landPaths.map((d) => `<path d="${d}"/>`).join("")}</g>
  <g fill="#b9d8ee" stroke="#fff" stroke-width=".5">${C.map((c) => `<path d="${hiPaths[c.ne] || ""}"${c.hq ? ' fill="#f6d792"' : ""}/>`).join("")}</g>
  ${C.map((c) => { const p = PL[c.name]; const lead = p[3] ? `<line x1="${c.x.toFixed(1)}" y1="${c.y.toFixed(1)}" x2="${p[3][0]}" y2="${p[3][1]}" stroke="#1a3c5e" stroke-opacity=".45" stroke-width=".8"/>` : ""; return lead + sq(c, c.hq ? 10 : 7, c.hq ? "#e8a832" : "#4a9fd4") + `<text x="${p[0]}" y="${p[1]}" text-anchor="${p[2]}" font-size="11" font-weight="800" letter-spacing=".04em" fill="#1a3c5e">${c.name.toUpperCase()}${c.hq ? " · HQ" : ""}</text>`; }).join("")}
  </svg>`;
  return head("A") + svg + chips + foot;
}
// ---------- B: filled countries, no map text, numbered legend ----------
function variantB() {
  const num = (c, i) => `<g transform="translate(${c.x.toFixed(1)},${c.y.toFixed(1)})"><circle r="${c.tiny ? 9 : 0}" fill="none" stroke="#e8a832" stroke-width="2"/>${c.tiny ? "" : ""}</g>`;
  const svg = `<svg viewBox="${VB}" role="img" aria-label="Equal Earth world map; the 21 countries with DivergenCIE students are filled">
  <g fill="#e3e7ec" stroke="#fff" stroke-width=".5">${landPaths.map((d) => `<path d="${d}"/>`).join("")}</g>
  <g stroke="#fff" stroke-width=".6">${C.map((c) => `<path d="${hiPaths[c.ne] || ""}" fill="${c.hq ? "#e8a832" : "#1a3c5e"}"/>`).join("")}</g>
  ${C.filter((c) => c.tiny || c.hq).map((c) => `<g transform="translate(${c.x.toFixed(1)},${c.y.toFixed(1)})"><circle r="8" fill="none" stroke="#e8a832" stroke-width="2"/><circle r="2.4" fill="#e8a832"/></g>`).join("")}
  </svg>`;
  const legend = `<div style="max-width:1000px;margin:22px auto 0;display:grid;grid-template-columns:repeat(4,1fr);gap:14px 24px;text-align:left">${["EUROPE", "AFRICA", "GULF", "SOUTH ASIA", "SOUTH-EAST ASIA", "AMERICAS", "OCEANIA"].map((r) => { const cs = C.filter((c) => c.region === r); return `<div style="border-top:2px solid #1a3c5e;padding-top:6px"><div style="font-size:10px;font-weight:900;letter-spacing:.2em;color:#e8a832">${r}</div><div style="font-size:13px;font-weight:700;color:#1a3c5e;line-height:1.5">${cs.map((c) => `${c.name}${c.hq ? " (HQ)" : ""}`).join(" · ")}</div></div>`; }).join("")}</div>`;
  const key = `<p style="font-size:11px;color:#666;margin:14px 0 0;letter-spacing:.06em"><span style="color:#1a3c5e">■</span> COUNTRY WITH DIVERGENCIE STUDENTS &nbsp; <span style="color:#e8a832">■</span> UK: HQ &nbsp; <span style="color:#e8a832">◯</span> RING MARKS A SMALL COUNTRY OR THE UK</p>`;
  return head("B") + svg + key + legend + foot;
}
// ---------- C: halftone dots + regional group callouts ----------
function variantC() {
  const land110 = merge(t110, t110.objects.countries.geometries.filter((g) => g.properties.name !== "Antarctica"));
  const hi110 = c110.filter((f) => hiNames.has(f.properties.name));
  const dots = []; const step = 6.4;
  for (let y = 26; y < 500; y += step) for (let x = 12; x < 990; x += step) {
    const ll = proj.invert([x, y]); if (!ll || !isFinite(ll[0])) continue;
    if (!geoContains(land110, ll)) continue;
    const hi = hi110.some((f) => geoContains(f, ll));
    dots.push([x, y, hi]);
  }
  const byR = (r) => C.filter((c) => c.region === r).map((c) => c.name.toUpperCase() + (c.hq ? " (HQ)" : ""));
  const box = (title, x, y) => { const lines = byR(title); const w = Math.max(title.length * 9.4, ...lines.map((l) => l.length * 7.9)) + 18; const h = 22 + lines.length * 13.5; return { title, lines, x, y, w, h }; };
  const boxes = { EUROPE: box("EUROPE", 372, 62), AMERICAS: box("AMERICAS", 40, 236), AFRICA: box("AFRICA", 396, 318), GULF: box("GULF", 596, 96), "SOUTH ASIA": box("SOUTH ASIA", 664, 326), "SOUTH-EAST ASIA": box("SOUTH-EAST ASIA", 828, 226), OCEANIA: box("OCEANIA", 884, 402) };
  const attach = { EUROPE: [1, 0.5], AMERICAS: [1, 0.5], AFRICA: [1, 0.35], GULF: [0.5, 1], "SOUTH ASIA": [0.5, 0], "SOUTH-EAST ASIA": [0, 0.5], OCEANIA: [0, 0.5] };
  const leaders = C.map((c) => { const b = boxes[c.region]; const [ax, ay] = attach[c.region]; return `<line x1="${c.x.toFixed(1)}" y1="${c.y.toFixed(1)}" x2="${(b.x + b.w * ax).toFixed(1)}" y2="${(b.y + b.h * ay).toFixed(1)}" stroke="#1a3c5e" stroke-opacity=".55" stroke-width=".9"/>`; }).join("");
  const boxSvg = Object.values(boxes).map((b) => `<g><rect x="${b.x}" y="${b.y}" width="${b.w.toFixed(1)}" height="${b.h}" fill="#fff" stroke="#1a3c5e" stroke-width=".8"/><rect x="${b.x}" y="${b.y}" width="3" height="${b.h}" fill="#e8a832"/><text x="${b.x + 10}" y="${b.y + 14}" font-size="9.5" font-weight="900" letter-spacing=".18em" fill="#e8a832">${b.title}</text>${b.lines.map((l, i) => `<text x="${b.x + 10}" y="${b.y + 28 + i * 13.5}" font-size="11" font-weight="800" fill="#1a3c5e">${l}</text>`).join("")}</g>`).join("");
  const svg = `<svg viewBox="${VB}" role="img" aria-label="Halftone Equal Earth world map showing DivergenCIE student locations grouped by region">
  <g>${dots.map(([x, y, hi]) => `<rect x="${(x - 1.7).toFixed(1)}" y="${(y - 1.7).toFixed(1)}" width="3.4" height="3.4" fill="${hi ? "#4a9fd4" : "#cfd6de"}"/>`).join("")}</g>
  ${leaders}
  ${C.map((c) => sq(c, c.hq ? 10 : 6.5, c.hq ? "#e8a832" : "#1a3c5e", false)).join("")}
  ${boxSvg}
  </svg>`;
  return head("C") + svg + chips + foot;
}
fs.mkdirSync("out", { recursive: true });
fs.writeFileSync("out/a-callouts.html", variantA());
fs.writeFileSync("out/b-filled-legend.html", variantB());
fs.writeFileSync("out/c-halftone-groups.html", variantC());
console.log(C.map((c) => `${c.name}:${c.x.toFixed(0)},${c.y.toFixed(0)}`).join(" "));
