# Rotated canvas labels clip on two axes, not one

A `-45deg`-rotated, right-aligned `ctx.fillText()` label (the mistake
chart's chapter-name axis labels) grows away from its anchor point in
**both** x and y at once — its front end is the point farthest from the
anchor in both directions simultaneously, not just the one you're
capping.

The first fix here (`truncateToWidth`, capping `maxWidth` against
`anchorX - 4` so the label can't run past the canvas's left edge) only
solved the horizontal half. It still let a long label's front silently
clip off the canvas's **bottom** edge, because the vertical drop of a
120px-wide rotated label (`120 * sin(45deg)` ≈ 85px) can exceed the
`padB` reserved below the anchor, and nothing capped that.

Found by actually rendering the real long case ("1.5 F-ma & Resultant
Forces") and looking at the screenshot: the visible result was "a &
Resultant Fo…" — front missing, trailing ellipsis present — which reads
exactly like the vertical clip, not the horizontal one, since the front
(farthest point) is what falls off first.

Fix: compute the width budget from *both* axes and take the smaller —
`maxWidthFromX = anchorX - 4`, `maxWidthFromY = (H - anchorY - 4) /
sin(45deg)` — then cap the flat ceiling against `min` of both, not just
one.

General lesson: for any rotated text-clipping bug, check both axes the
rotation actually touches before assuming the first fix that "looks
right" in one screenshot has actually covered every case — a 3-bar chart
with 3 different label lengths was needed to expose this; a chart with
only short labels would never have shown it.
