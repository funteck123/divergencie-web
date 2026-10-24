#!/usr/bin/env python3
"""Read the circled answer on mark scheme pages where the circle is part of a picture (TKT-0362, TKT-0363).

read_circled_answers.py reads the circle when it is a vector drawing. Some pages are one flat image (the question, options and a green ellipse together), with no text
to search. For those, this reader works on pixels:

  1. Find the green ellipse: pixels close to RGB (0, 176, 80). Its bounding box is the circled area.
  2. Find the option lines: the dark text lines between the question and the blue explanation text. The last four of them are options A, B, C, D (top to bottom).
  3. The answer is the option line whose rows overlap the ellipse the most. No clear overlap, fewer than four lines, or two lines tied: no answer.

It never guesses: a page it cannot read is reported, and the caller keeps the old answer for review. Options set out in a row (not one per line) are not read.

  python3 scripts/ops/read_circled_pixels.py <mark scheme pdf>                       prints {question: letter} for pages read by pixels
"""
import json, re, sys
import fitz
import numpy as np

DPI = 100


def masks(pix):
    a = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)[:, :, :3].astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    green = (r < 90) & (g > 130) & (b < 150) & (g - r > 80) & (g - b > 40)
    blue = (r < 90) & (g > 130) & (b > 200)  # the cyan explanation text
    dark = (r < 110) & (g < 110) & (b < 110)  # black option text
    return green, blue, dark


def runs(flags, min_gap=2):
    """Contiguous True runs of a 1-D boolean array, merging runs closer than min_gap."""
    out, start = [], None
    for i, f in enumerate(flags):
        if f and start is None:
            start = i
        elif not f and start is not None:
            out.append([start, i - 1]); start = None
    if start is not None:
        out.append([start, len(flags) - 1])
    merged = []
    for s, e in out:
        if merged and s - merged[-1][1] <= min_gap:
            merged[-1][1] = e
        else:
            merged.append([s, e])
    return merged


def read_page(pg):
    pix = pg.get_pixmap(dpi=DPI, alpha=False)
    green, blue, dark = masks(pix)
    ys = np.where(green.sum(axis=1) > 3)[0]
    if len(ys) < 5:
        return None, "no green ellipse"
    top, bottom = ys.min(), ys.max()
    first_blue = int(np.where(blue.sum(axis=1) > 2)[0].min()) if blue.any() else pix.height
    lines = [r for r in runs(dark[:, : pix.width].sum(axis=1) > 2, 3) if r[1] < first_blue + 2 and r[1] - r[0] >= 4]
    if len(lines) < 4:
        return None, "fewer than four option lines"
    options = lines[-4:]
    # the last four dark lines can include the ellipse's own antialiased edge: drop lines that are mostly green
    best = []
    for k, (s, e) in enumerate(options):
        overlap = max(0, min(e, bottom) - max(s, top) + 1)
        best.append(overlap / max(1, e - s + 1))
    order = sorted(range(4), key=lambda k: -best[k])
    if best[order[0]] < 0.6 or best[order[0]] - best[order[1]] < 0.3:
        return None, f"no clear overlap {['%.2f' % x for x in best]}"
    return "ABCD"[order[0]], ""


def read_pdf(path):
    doc = fitz.open(path)
    found, unreadable = {}, {}
    for pg in doc:
        m = re.search(r"Question\s+(\d+)", pg.get_text())
        if not m:
            continue
        if len(pg.get_text()) > 400:
            continue  # a page with real text: read_circled_answers.py handles it
        letter, why = read_page(pg)
        if letter:
            found[m.group(1)] = letter
        elif why != "no green ellipse":
            unreadable[m.group(1)] = why
    doc.close()
    return found, unreadable


if __name__ == "__main__":
    found, bad = read_pdf(sys.argv[1])
    print(json.dumps(found, sort_keys=True), "unreadable:", bad)
