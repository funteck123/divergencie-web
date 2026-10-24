#!/usr/bin/env python3
"""Cut a strip round the green circle on each mark scheme page that a program cannot read for itself (TKT-0362, TKT-0363).

Some "model answer" mark schemes are one flat picture per question with the correct option circled in green. For the questions whose answer came from the weaker
"lightweight" reader, this tool finds the circle on the question's page and saves a full-width strip around it, a few strips to a sheet, each labelled with a number.
A person reads the circled letter from the sheet and writes it down (readings.json); compare_readings.py then compares those with what the solver holds.

  python3 scripts/ops/circled_crops.py <database.json> <pdf dir> [<pdf dir> ...] --out <dir> [--source lightweight] [--per-sheet 8]

Writes <dir>/sheet-001.png ..., <dir>/index.json ({id: {title, question, qpId, msId, page, current, found}})\n  --rows lw_rows.json --modes unclear,circle  makes strips only for the questions the colour reader could not settle and lists questions with no circle found.
"""
import argparse, collections, json, os, re, sys
import cv2
import fitz
import numpy as np
from PIL import Image, ImageDraw

DPI = 100
STRIP_PAD = 30        # pixels above and below the circle
SHEET_WIDTH = 900


def circle_box(rgb):
    """Bounding box (x0, y0, x1, y1) round everything the publisher coloured on the page: the green circle, or the green tick and the red crosses.
    None when the page has no colour marks. Small blobs of colour (under 25 pixels) are ignored."""
    r, g, b = [rgb[..., i].astype(int) for i in range(3)]
    mask = (((g > 120) & (g - r > 35) & (g - b > 15)) | ((r > 170) & (g < 120) & (b < 120) & (r - g > 70))).astype(np.uint8) * 255
    if mask.sum() == 0:
        return None
    mask = cv2.dilate(mask, np.ones((3, 3), np.uint8))
    n, _, stats, _ = cv2.connectedComponentsWithStats(mask)
    boxes = [(x, y, x + w, y + h) for x, y, w, h, area in stats[1:] if area >= 25]
    if not boxes:
        return None
    return (min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes))


def question_pages(doc):
    """{question number: [page index, ...]} from the "Question N" label on each page."""
    out = {}
    for i, pg in enumerate(doc):
        m = re.search(r"Question\s+(\d+)", pg.get_text())
        if m:
            out.setdefault(m.group(1), []).append(i)
    return out


def strip_for(doc, pages):
    """The first of the question's pages that has a circle: (strip image, page index) or (None, first page)."""
    for pi in pages:
        pix = doc[pi].get_pixmap(dpi=DPI, alpha=False)
        rgb = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)[:, :, :3]
        box = circle_box(rgb)
        if box:
            y0, y1 = max(0, box[1] - STRIP_PAD), min(pix.height, box[3] + STRIP_PAD)
            return Image.fromarray(rgb[y0:y1].copy()), pi
    return None, pages[0]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("db"); ap.add_argument("dirs", nargs="+"); ap.add_argument("--rows"); ap.add_argument("--modes")
    ap.add_argument("--out", required=True); ap.add_argument("--source", default="lightweight"); ap.add_argument("--per-sheet", type=int, default=8)
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    index, strips, missing = {}, [], []
    nid = 0
    if a.rows:
        todo = collections.OrderedDict()
        for x in json.load(open(a.rows)):
            if a.modes and x["mode"] not in a.modes.split(","):
                continue
            todo.setdefault((x["title"], x["msId"], x["qpId"]), []).append({"questionNumber": x["q"], "correctAnswer": x["current"]})
        records = [{"title": k[0], "msId": k[1], "qpId": k[2], "questions": v} for k, v in todo.items()]
    else:
        records = [{"title": r["title"], "msId": r["msId"], "qpId": r["qpId"], "questions": [q for q in r["questions"] if q.get("source") == a.source]} for r in json.load(open(a.db))]
    for r in records:
        wanted = r["questions"]
        if not wanted:
            continue
        path = next((os.path.join(d, r["msId"] + ".pdf") for d in a.dirs if os.path.exists(os.path.join(d, r["msId"] + ".pdf"))), None)
        if not path:
            missing += [(r["title"], q["questionNumber"], "mark scheme PDF not cached") for q in wanted]
            continue
        doc = fitz.open(path)
        pages = question_pages(doc)
        for q in wanted:
            n = q["questionNumber"]
            nid += 1
            key = f"{nid:03d}"
            index[key] = {"title": r["title"], "question": n, "qpId": r["qpId"], "msId": r["msId"], "current": q["correctAnswer"], "found": False, "page": None}
            if n not in pages:
                missing.append((r["title"], n, "no page labelled Question " + n)); continue
            img, pi = strip_for(doc, pages[n])
            index[key]["page"] = pi
            if img is None:
                missing.append((r["title"], n, "no colour marks found")); continue
            index[key]["found"] = True
            strips.append((key, img))
        doc.close()
    sheet, y, count = None, 0, 0
    for k, (key, img) in enumerate(strips):
        scale = min(1.0, SHEET_WIDTH / img.width)
        img = img.resize((max(1, int(img.width * scale)), max(1, int(img.height * scale))))
        if k % a.per_sheet == 0:
            if sheet:
                sheet.crop((0, 0, SHEET_WIDTH + 70, max(y, 50))).save(os.path.join(a.out, f"sheet-{count:03d}.png"))  # only as tall as its strips
            count += 1
            sheet = Image.new("RGB", (SHEET_WIDTH + 70, 2400), (255, 255, 255)); y = 0
        d = ImageDraw.Draw(sheet)
        d.rectangle([0, y, 64, y + 28], fill=(26, 60, 94)); d.text((6, y + 8), key, fill=(255, 255, 255))
        sheet.paste(img, (70, y)); y += img.height + 8
        d.line([0, y - 4, SHEET_WIDTH + 70, y - 4], fill=(200, 200, 200))
        if y > 2300:
            raise SystemExit("sheet overflow: lower --per-sheet")
    if sheet:
        sheet.crop((0, 0, SHEET_WIDTH + 70, max(y, 50))).save(os.path.join(a.out, f"sheet-{count:03d}.png"))
    json.dump(index, open(os.path.join(a.out, "index.json"), "w"), indent=1)
    print(f"{len(index)} questions, {len(strips)} strips on {count} sheets, {len(missing)} without a circle or page")
    json.dump(missing, open(os.path.join(a.out, "missing.json"), "w"), indent=1)


if __name__ == "__main__":
    main()
