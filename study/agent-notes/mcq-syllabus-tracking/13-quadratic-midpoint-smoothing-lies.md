# Quadratic-midpoint chart smoothing looks good and is wrong

**Commits:** `4d7cb69`, `cfb5bf5`. **Reported by the user** ("make the graph
smooth can you?") — the bug was found by actually rendering and looking at
the first attempt, not assumed from the code.

First implementation smoothed the progress-chart polyline with the classic
"curve through the midpoint of each consecutive pair" technique:

```js
for (let i = 1; i < pts.length - 1; i++) {
  const midX = (pts[i].x + pts[i+1].x) / 2, midY = (pts[i].y + pts[i+1].y) / 2;
  ctx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
}
```

This only anchors the **first and last** point exactly — every interior
point is a control point the curve bends *toward*, not a point it passes
*through*. Rendered against real varying scores (30/90/40/80/60%), the 90%
and 40% dots visibly floated off the line entirely. For a chart of real
student scores, a curve that visually disagrees with its own data points at
every interior point is actively misleading, not just imperfect —
"smooth" is not more important than "accurate" here.

Replaced with a Catmull-Rom spline (converted to per-segment cubic
Beziers, tension 1/6) which passes through every point exactly:

```js
const cp1x = p1.x + (p2.x - p0.x) / 6, cp1y = p1.y + (p2.y - p0.y) / 6;
const cp2x = p2.x - (p3.x - p1.x) / 6, cp2y = p2.y - (p3.y - p1.y) / 6;
ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
```

Tradeoff: Catmull-Rom can briefly overshoot a pair's own min/max between two
points (unlike the midpoint method, which can't). Contained by clipping the
stroke to the plot rectangle (`ctx.clip()`) rather than fighting it in the
curve math — an overshoot past 0%/100% just gets visually cut off at the
axis line instead of spilling past it.

**General lesson**: "smooth this chart" has more than one correct-looking
answer; always render the result against real varied data (not a
straight/monotonic test sequence, which hides this exact bug) and check
that data points visually sit on the line before considering a smoothing
implementation done.
