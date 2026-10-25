#!/usr/bin/env python3
"""Check stored MCQ answers against the circle on the mark scheme page (TKT-0362, TKT-0363).

Most Save My Exams mark scheme pages keep their text, and the right option is drawn with a coloured ellipse round the letter. The text layer
gives each option letter's position, the picture gives the ellipse, so the letter inside the ellipse is the answer. No model is used.
A page is "unread" when no circle, or more than one circle, holds exactly one option letter. Nothing is guessed.

  python3 scripts/ops/read_circled_letters.py <database.json> <pdf dir> [<pdf dir> ...] --out <result.json> [--source gemini-4page]
Writes {"read": {qpId|q: letter}, "differs": [...], "counts": {source: {...}}}. Run its "differs" list through a person's eyes before changing any answer.
"""
import argparse, collections, json, os, re
import cv2
import fitz
import numpy as np

DPI = 100
SCALE = 72.0 / DPI


def question_number(text):
    """The question a page belongs to, from how the page starts. A page can start with its own page number ("7" then "12 Ammonia..."), so a lone number followed by a numbered line is skipped."""
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    if not lines or lines[0].startswith("DivergenCIE"):
        return None
    first = re.match(r"^(\d+)\.?(\s|$)", lines[0])
    if first and re.fullmatch(r"\d+", lines[0]) and len(lines) > 1:
        second = re.match(r"^(\d+)\.?(\s|$)", lines[1])
        if second:
            return second.group(1)
    return first.group(1) if first else None


def ellipses(pg):
    pix = pg.get_pixmap(dpi=DPI, alpha=False)
    rgb = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)[:, :, :3]
    r, g, b = [rgb[..., i].astype(int) for i in range(3)]
    mask = (((g > 120) & (g - r > 35) & (g - b > 15)) | ((r > 170) & (g < 120) & (b < 120) & (r - g > 70))).astype(np.uint8) * 255
    # a wide dilation joins the two halves of an ellipse that text cuts in two
    n, _, stats, _ = cv2.connectedComponentsWithStats(cv2.dilate(mask, np.ones((9, 9), np.uint8)))
    return [(x * SCALE, y * SCALE, (x + w) * SCALE, (y + h) * SCALE) for x, y, w, h, a in stats[1:] if w >= 40 and 12 <= h <= 60 / SCALE and w / max(1, h) >= 1.2 and a >= 120]  # taller than 60 pt is the explanation box, not a circle


def read_page(pg):
    """The letter inside the one ellipse on the page, or None."""
    words = [w for w in pg.get_text("words") if w[4] in ("A", "B", "C", "D")]
    found = []
    for x0, y0, x1, y1 in ellipses(pg):
        inside = {w[4] for w in words if x0 - 3 <= (w[0] + w[2]) / 2 <= x1 + 3 and y0 - 3 <= (w[1] + w[3]) / 2 <= y1 + 3}
        if len(inside) == 1:
            found.append(inside.pop())
    return found[0] if len(found) == 1 else None


def read_pdf(path):
    doc = fitz.open(path)
    out = {}
    for pg in doc:
        qn = question_number(pg.get_text())
        if qn and qn not in out:
            letter = read_page(pg)
            if letter:
                out[qn] = letter
    doc.close()
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("db"); ap.add_argument("dirs", nargs="+"); ap.add_argument("--out", required=True); ap.add_argument("--source")
    a = ap.parse_args()
    db = json.load(open(a.db))
    counts = collections.defaultdict(collections.Counter)
    read, differs = {}, []
    for k, rec in enumerate(db):
        wanted = [q for q in rec["questions"] if not a.source or q.get("source") == a.source]
        path = next((os.path.join(d, rec["msId"] + ".pdf") for d in a.dirs if os.path.exists(os.path.join(d, rec["msId"] + ".pdf"))), None)
        if not wanted or not path:
            continue
        found = read_pdf(path)
        for q in wanted:
            src, n = q.get("source") or "none", q["questionNumber"]
            letter = found.get(n)
            if not letter:
                counts[src]["unread"] += 1
                continue
            read[f"{rec['qpId']}|{n}"] = letter
            if letter == q["correctAnswer"]:
                counts[src]["agrees"] += 1
            else:
                counts[src]["DIFFERS"] += 1
                differs.append({"title": rec["title"], "qpId": rec["qpId"], "msId": rec["msId"], "q": n, "current": q["correctAnswer"], "read": letter, "source": src})
        if k % 25 == 0:
            print(k, "of", len(db), {s: dict(c) for s, c in counts.items()}, flush=True)
    json.dump({"read": read, "differs": differs, "counts": {s: dict(c) for s, c in counts.items()}}, open(a.out, "w"), indent=1)
    print(json.dumps({s: dict(c) for s, c in counts.items()}))


if __name__ == "__main__":
    main()
