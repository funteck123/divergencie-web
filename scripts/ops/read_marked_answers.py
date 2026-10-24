#!/usr/bin/env python3
"""Read the correct option from picture-only "model answer" mark scheme pages (TKT-0362, TKT-0363).

These Save My Exams pages are one flat picture per question. The right option is shown in one of two ways, both drawn in colour:
  tick   each option has a mark after it: red crosses on the wrong ones, one green tick on the right one. The options run A, B, C, D in reading order
         (left to right, then down), so the answer is the position of the green tick among the four marks.
  circle one green ellipse is drawn round the right option. Which letter is inside cannot be told from the picture alone (no text to search), so this page is
         reported as "circle" with the circle's position, for a person to read (circled_crops.py makes the strips).

A page that fits neither (for example two ticks, or marks that do not add up to four) is reported as "unclear". Nothing is guessed.

  python3 scripts/ops/read_marked_answers.py <mark scheme pdf>                       prints {question: [mode, letter or None]}
  python3 scripts/ops/read_marked_answers.py --check <database.json> <pdf dir> ...   compares with the answers the solver holds, per source
"""
import json, os, re, sys, collections
import cv2
import fitz
import numpy as np

DPI = 100


def blobs(mask, min_area=25):
    m = cv2.dilate(mask.astype(np.uint8) * 255, np.ones((3, 3), np.uint8))
    n, _, stats, _ = cv2.connectedComponentsWithStats(m)
    return [(int(x), int(y), int(w), int(h)) for x, y, w, h, a in stats[1:] if a >= min_area]


def reading_order(boxes, row_gap=18):
    """Left to right within a row, rows top to bottom. Boxes whose vertical centres are within row_gap of the row's first belong to that row."""
    rows = []
    for b in sorted(boxes, key=lambda b: b[1] + b[3] / 2):
        cy = b[1] + b[3] / 2
        if rows and abs(cy - rows[-1][0]) <= row_gap:
            rows[-1][1].append(b)
        else:
            rows.append((cy, [b]))
    return [box for _, row in rows for box in sorted(row, key=lambda box: box[0])]


def read_page(pg):
    """(mode, letter): ("tick", "B"), ("circle", None), ("unclear", None), or (None, None) when the page has no colour marks at all."""
    pix = pg.get_pixmap(dpi=DPI, alpha=False)
    rgb = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)[:, :, :3]
    r, g, b = [rgb[..., i].astype(int) for i in range(3)]
    green = blobs((g > 120) & (g - r > 35) & (g - b > 15))
    red = blobs((r > 170) & (g < 120) & (b < 120) & (r - g > 70))
    ellipses = [x for x in green if x[2] >= 60 and x[2] / max(1, x[3]) >= 1.4]
    ticks = [x for x in green if x[2] <= 50 and x[3] <= 50]
    crosses = [x for x in red if x[2] <= 50 and x[3] <= 50]
    if len(ellipses) == 1 and not ticks:
        return "circle", None
    if len(ticks) == 1 and len(crosses) == 3:
        order = reading_order(ticks + crosses)
        return "tick", "ABCD"[order.index(ticks[0])]
    if not green and not red:
        return None, None
    return "unclear", None


def read_pdf(path):
    """{question number: (mode, letter)} for the picture-only pages (the ones with almost no text)."""
    doc = fitz.open(path)
    out = {}
    for pg in doc:
        text = pg.get_text()
        m = re.search(r"Question\s+(\d+)", text)
        if not m or len(text) > 400:
            continue
        mode, letter = read_page(pg)
        if mode and (m.group(1) not in out or out[m.group(1)][0] in (None, "unclear")):
            out[m.group(1)] = (mode, letter)
    doc.close()
    return out


def check(db_path, dirs, limit_per_source=None):
    db = json.load(open(db_path))
    stat = collections.defaultdict(lambda: collections.Counter())
    seen = collections.Counter()
    for r in db:
        path = next((os.path.join(d, r["msId"] + ".pdf") for d in dirs if os.path.exists(os.path.join(d, r["msId"] + ".pdf"))), None)
        if not path:
            continue
        wanted = [q for q in r["questions"] if not limit_per_source or seen[q.get("source")] < limit_per_source]
        if not wanted:
            continue
        found = read_pdf(path)
        for q in wanted:
            n, src = q["questionNumber"], q.get("source") or "none"
            if n not in found:
                continue
            seen[src] += 1
            mode, letter = found[n]
            if mode == "tick":
                stat[src]["tick agrees" if letter == q["correctAnswer"] else "tick DIFFERS"] += 1
            else:
                stat[src][f"{mode}"] += 1
    return stat


if __name__ == "__main__":
    if sys.argv[1] == "--check":
        lim = int(os.environ.get("LIMIT", "0")) or None
        for src, c in check(sys.argv[2], sys.argv[3:], lim).items():
            print(src, dict(c))
    else:
        print(json.dumps(read_pdf(sys.argv[1]), sort_keys=True))
