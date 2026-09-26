# TKT-0271 world map mockups

Three candidate replacements for the homepage "Worldwide reach" map
(components/GlobalReach.tsx), drawn on the Equal Earth projection with real
Natural Earth country shapes. `before-current.png` is the current map.

- a-callouts: site-style square markers, leader lines for the crowded clusters
- b-filled-legend: countries filled, no text on the map, region legend below
- c-halftone-groups: halftone dot map with regional callout boxes

Open the .html files in a browser (standalone, no build). `generate-mockups.mjs`
rebuilt them from `world-atlas`, `topojson-client` and `d3-geo` (not repo
dependencies; the chosen design gets its paths precomputed into the component).

UN wording (checked against press.un.org/en/2026/ga12779.doc.htm): on
4 September 2026 the General Assembly adopted A/80/L.104, 164-1-6, calling for
wider use of equal-area projections "particularly the Equal Earth projection".
It is a recommendation, not a designated "official UN map".

## What shipped

Variant C went live in `components/GlobalReach.tsx` (2026-09-27). Two changes
from the mockup: the "new UN map" note box (a white card with a gold bar) was
replaced by one plain caption line with a link to the UN press release, and
the regional callout boxes are hidden below the `sm` breakpoint (their text
would be unreadable on a phone; the country list under the map covers it).

The map geometry is generated, not hand-written:
`generate-global-reach-data.mjs` writes `components/globalReachMapData.ts`.
Run it from a scratch folder that has the three packages installed:

    npm i world-atlas@2 topojson-client d3-geo
    node generate-global-reach-data.mjs <repo>/components/globalReachMapData.ts

To add or move a country, edit the `C` list (real lon/lat) or the box
positions in that script and re-run it. `generate-mockups.mjs` is the older
script that produced the three comparison pages and is kept only for reference.
