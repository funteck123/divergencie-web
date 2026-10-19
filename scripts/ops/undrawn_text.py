#!/usr/bin/env python3
"""Find, and redraw, text that is in a PDF's text layer but not drawn on the page (TKT-0299: question 1(a) of Physics Ch5 Worksheet 2 was a blank gap).

A line counts as undrawn when it has real words (at least 6 letters, not the Save My Exams banner) and the area of its box holds almost no ink. Dotted answer
lines have no letters and are never judged. repair() draws each such line again at its own position with a built-in font of the same family and size, so the
page reads again without needing the source file (the raw files on the E drive are other versions and are not a safe replacement).

  python3 scripts/ops/undrawn_text.py scan <folder or pdf> [...]        lists files with undrawn lines
  python3 scripts/ops/undrawn_text.py repair <in.pdf> <out.pdf> [text ...]       writes a repaired copy and prints what was redrawn
"""
import os, re, sys
import fitz
import numpy as np

BANNER = ("savemyexams", "homeofrevision", "moreawesome", "headto", "resources,visit", "gcseandalevel", "physicsandmathstutor")
INK_MAX = 0.02   # a drawn span of text has an ink share well above this inside its (shrunk) box


def _fontname(font, flags):
    f = font.lower()
    bold = "bold" in f or bool(flags & 16)
    ital = "italic" in f or "oblique" in f or bool(flags & 2)
    if "times" in f or "serif" in f and "sans" not in f:
        return "tibi" if bold and ital else "tibo" if bold else "tiit" if ital else "tiro"
    if "courier" in f or "mono" in f:
        return "cobo" if bold else "cour"
    return "hebi" if bold and ital else "hebo" if bold else "heit" if ital else "helv"


def undrawn_lines(page):
    """[(text, rect, span)] for spans of the page that are set to be drawn (normal fill, visible colour) but whose own box holds almost no ink: something
    painted over them. Judged per span (a contiguous run of characters), not per line, so a widely spaced heading is not mistaken for a hole."""
    out = []
    for t in page.get_texttrace():
        if t["type"] != 0 or t["opacity"] <= 0 or min(t["color"] or (0, 0, 0)) > 0.9:
            continue  # invisible (an OCR layer under a scan), or white text
        text = "".join(c[0] if isinstance(c[0], str) else chr(c[0]) for c in t["chars"]).replace("\xa0", " ").strip()
        squeezed = re.sub(r"\s+", "", text).lower()
        if len(re.findall(r"[A-Za-z]", text)) < 5 or any(k in squeezed for k in BANNER):
            continue
        r = fitz.Rect(t["bbox"])
        if r.width < 15 or r.height < 5 or r.y1 < 0 or r.y0 > page.rect.height:
            continue
        core = fitz.Rect(r.x0, r.y0 + r.height * 0.2, r.x1, r.y1 - r.height * 0.2) & page.rect
        if core.is_empty:
            continue
        pix = page.get_pixmap(clip=core, dpi=100, colorspace=fitz.csGRAY)
        ink = float((np.frombuffer(pix.samples, dtype=np.uint8) < 140).mean())
        if ink < INK_MAX:
            out.append((text, r, {"origin": (t["bbox"][0], t["bbox"][3] - t["size"] * 0.22), "font": t["font"], "flags": 16 if "bold" in t["font"].lower() else 0, "size": t["size"]}))
    return out


def scan_file(path):
    doc = fitz.open(path)
    return [(i, t[:60]) for i in range(1, min(doc.page_count, 60)) for t, _, _ in undrawn_lines(doc[i])]


def repair(src, dst, only=None):
    doc = fitz.open(src)
    fixed = []
    for i in range(1, doc.page_count):
        page = doc[i]
        for text, r, sp in undrawn_lines(page):
            if only and not any(o in text for o in only):
                continue  # the scan also flags text that overlaps a picture on purpose; redraw only what the caller confirmed as a hole
            page.insert_text((sp["origin"][0], sp["origin"][1]), text, fontname=_fontname(sp["font"], sp["flags"]), fontsize=sp["size"], color=(0, 0, 0))
            fixed.append((i, text[:60]))
    doc.save(dst, garbage=1, deflate=True)
    return fixed


def main():
    cmd = sys.argv[1]
    if cmd == "scan":
        total = 0
        for target in sys.argv[2:]:
            files = [target] if target.endswith(".pdf") else [os.path.join(target, f) for f in sorted(os.listdir(target)) if f.endswith(".pdf")]
            for f in files:
                try: hits = scan_file(f)
                except Exception: continue
                if hits:
                    total += 1; print(os.path.basename(f), hits[:3], flush=True)
        print("files with undrawn text:", total)
    elif cmd == "repair":
        for page, t in repair(sys.argv[2], sys.argv[3], sys.argv[4:] or None): print("redrew page", page, ":", t)


if __name__ == "__main__":
    main()
