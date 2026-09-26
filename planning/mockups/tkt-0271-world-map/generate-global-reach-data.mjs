// Generates components/globalReachMapData.ts for the homepage "Worldwide reach"
// map (TKT-0271, variant C: halftone dots + regional callout boxes).
//
// Needs (not repo dependencies, install in a scratch folder):
//   npm i world-atlas@2 topojson-client d3-geo
// Run from that folder:  node gen-data.mjs <path-to-repo>/components/globalReachMapData.ts
//
// The 21 countries are the real list from TKT-0221 (see GlobalReach.tsx).
// Real Natural Earth shapes, Equal Earth projection (the one the UN General
// Assembly backed on 4 September 2026, A/80/L.104).
import fs from "fs";
import { geoEqualEarth, geoContains } from "d3-geo";
import { feature, merge } from "topojson-client";

const out = process.argv[2];
if (!out) throw new Error("usage: node gen-data.mjs <output .ts path>");
const t110 = JSON.parse(fs.readFileSync("node_modules/world-atlas/countries-110m.json"));
const c110 = feature(t110, t110.objects.countries).features.filter((f) => f.properties.name !== "Antarctica");
const t50 = JSON.parse(fs.readFileSync("node_modules/world-atlas/countries-50m.json"));
const c50 = feature(t50, t50.objects.countries).features.filter((f) => f.properties.name !== "Antarctica");
const proj = geoEqualEarth().fitExtent([[10, 24], [990, 520]], { type: "FeatureCollection", features: c50 });

const C = [
  { name: "UK", ne: "United Kingdom", lon: -1.5, lat: 53, region: "EUROPE" },
  { name: "US", ne: "United States of America", lon: -98.5, lat: 39.5, region: "AMERICAS" },
  { name: "Cayman Islands", ne: "Cayman Is.", lon: -81.25, lat: 19.3, region: "AMERICAS" },
  { name: "Egypt", ne: "Egypt", lon: 30, lat: 26.5, region: "AFRICA" },
  { name: "Sudan", ne: "Sudan", lon: 30, lat: 15.5, region: "AFRICA" },
  { name: "Nigeria", ne: "Nigeria", lon: 8, lat: 9.5, region: "AFRICA" },
  { name: "Tanzania", ne: "Tanzania", lon: 34.8, lat: -6.3, region: "AFRICA" },
  { name: "South Africa", ne: "South Africa", lon: 24.5, lat: -29, region: "AFRICA" },
  { name: "Seychelles", ne: "Seychelles", lon: 55.5, lat: -4.6, region: "AFRICA" },
  { name: "Turkey", ne: "Turkey", lon: 35.2, lat: 39, region: "EUROPE" },
  { name: "Saudi Arabia", ne: "Saudi Arabia", lon: 44, lat: 24, region: "GULF" },
  { name: "Qatar", ne: "Qatar", lon: 51.2, lat: 25.3, region: "GULF" },
  { name: "UAE", ne: "United Arab Emirates", lon: 54.3, lat: 24.2, region: "GULF" },
  { name: "Pakistan", ne: "Pakistan", lon: 69.4, lat: 30, region: "SOUTH ASIA" },
  { name: "India", ne: "India", lon: 78.9, lat: 22, hq: true, region: "SOUTH ASIA" },
  { name: "Bangladesh", ne: "Bangladesh", lon: 90.3, lat: 23.7, region: "SOUTH ASIA" },
  { name: "Sri Lanka", ne: "Sri Lanka", lon: 80.7, lat: 7.8, region: "SOUTH ASIA" },
  { name: "Malaysia", ne: "Malaysia", lon: 102, lat: 4.2, region: "SOUTH-EAST ASIA" },
  { name: "Singapore", ne: "Singapore", lon: 103.85, lat: 1.35, region: "SOUTH-EAST ASIA" },
  { name: "Indonesia", ne: "Indonesia", lon: 113.9, lat: -0.8, region: "SOUTH-EAST ASIA" },
  { name: "Australia", ne: "Australia", lon: 134, lat: -25.5, region: "OCEANIA" },
];
for (const c of C) [c.x, c.y] = proj([c.lon, c.lat]);
const hiNames = new Set(C.map((c) => c.ne));
const hi110 = c110.filter((f) => hiNames.has(f.properties.name));
const land110 = merge(t110, t110.objects.countries.geometries.filter((g) => g.properties.name !== "Antarctica"));

const STEP = 6.4;
const grey = [], blue = [];
for (let y = 26; y < 500; y += STEP) for (let x = 12; x < 990; x += STEP) {
  const ll = proj.invert([x, y]);
  if (!ll || !isFinite(ll[0]) || !geoContains(land110, ll)) continue;
  (hi110.some((f) => geoContains(f, ll)) ? blue : grey).push([x, y]);
}
const sqPath = (pts) => pts.map(([x, y]) => `M${(x - 1.7).toFixed(1)} ${(y - 1.7).toFixed(1)}h3.4v3.4h-3.4z`).join("");

const REGION_ORDER = ["EUROPE", "AMERICAS", "AFRICA", "GULF", "SOUTH ASIA", "SOUTH-EAST ASIA", "OCEANIA"];
const POS = { EUROPE: [372, 62], AMERICAS: [40, 236], AFRICA: [396, 318], GULF: [596, 96], "SOUTH ASIA": [664, 326], "SOUTH-EAST ASIA": [828, 226], OCEANIA: [884, 402] };
const ATTACH = { EUROPE: [1, 0.5], AMERICAS: [1, 0.5], AFRICA: [1, 0.35], GULF: [0.5, 1], "SOUTH ASIA": [0.5, 0], "SOUTH-EAST ASIA": [0, 0.5], OCEANIA: [0, 0.5] };
const boxes = REGION_ORDER.map((title) => {
  const lines = C.filter((c) => c.region === title).map((c) => c.name.toUpperCase() + (c.hq ? " (HQ)" : ""));
  const w = Math.max(title.length * 9.4, ...lines.map((l) => l.length * 7.9)) + 18;
  const h = 22 + lines.length * 13.5;
  return { title, lines, x: POS[title][0], y: POS[title][1], w: +w.toFixed(1), h };
});
const leaders = C.map((c) => {
  const b = boxes.find((bx) => bx.title === c.region); const [ax, ay] = ATTACH[c.region];
  return { x1: +c.x.toFixed(1), y1: +c.y.toFixed(1), x2: +(b.x + b.w * ax).toFixed(1), y2: +(b.y + b.h * ay).toFixed(1) };
});
const markers = C.map((c) => ({ name: c.name, x: +c.x.toFixed(1), y: +c.y.toFixed(1), hq: !!c.hq }));

const ts = `// GENERATED FILE. Do not edit by hand.
// Source: planning/mockups/tkt-0271-world-map/generate-global-reach-data.mjs
// Equal Earth projection, Natural Earth shapes (world-atlas), halftone dots on a
// ${STEP}px grid. ${grey.length + blue.length} dots: ${blue.length} sit inside the 21 student countries.

export const MAP_VIEWBOX = "0 52 1000 452";
export const DOT_SIZE = 3.4;

/** Every land dot outside the 21 countries, as one SVG path of small squares. */
export const LAND_DOTS = ${JSON.stringify(sqPath(grey))};

/** Dots inside the 21 student countries. */
export const HIGHLIGHT_DOTS = ${JSON.stringify(sqPath(blue))};

export type MapMarker = { name: string; x: number; y: number; hq: boolean };
export const MARKERS: MapMarker[] = ${JSON.stringify(markers)};

export type MapBox = { title: string; lines: string[]; x: number; y: number; w: number; h: number };
export const REGION_BOXES: MapBox[] = ${JSON.stringify(boxes)};

export type MapLeader = { x1: number; y1: number; x2: number; y2: number };
export const LEADERS: MapLeader[] = ${JSON.stringify(leaders)};
`;
fs.writeFileSync(out, ts);
console.log("wrote", out, ts.length, "bytes;", grey.length, "grey +", blue.length, "blue dots");
