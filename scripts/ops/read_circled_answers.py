#!/usr/bin/env python3
"""Read the answer letter from "model answer" style multiple-choice mark schemes, where the correct option is circled by a green drawing (TKT-0362, TKT-0363).

On these Save My Exams worksheets the mark scheme page shows the question, its options A to D, and a green ellipse drawn round the right option. There is no typed
answer line, so a text parser has to guess. This reader uses the drawing: the answer is the option letter whose centre lies inside the green ellipse.

Per page: the question number comes from the "Question N" label on the page, the ellipse is the stroked drawing in the green used by the publisher (RGB 0, 0.69, 0.31),
and the letter is the A to D (or "A." to "D.") word with its centre inside the ellipse rectangle. A page with no ellipse, or with letters from two options inside it,
gives no answer (the caller keeps the old answer and reports the question).

  python3 scripts/ops/read_circled_answers.py <mark scheme pdf>                      prints {question: letter}
  python3 scripts/ops/read_circled_answers.py --check <database.json> <pdf dir...>   compares with the answers already in the database, per source
"""
import json, os, re, sys
import fitz

GREEN = (0.0, 0.69, 0.31)
LETTERS = {"A", "B", "C", "D", "A.", "B.", "C.", "D."}


def is_green(color):
    return color is not None and len(color) == 3 and all(abs(a - b) < 0.03 for a, b in zip(color, GREEN))


def read_pdf(path):
    """Returns ({question number: letter}, [question numbers on a page with no readable circle])."""
    doc = fitz.open(path)
    found, unreadable = {}, []
    for pg in doc:
        text = pg.get_text()
        m = re.search(r"Question\s+(\d+)", text)
        if not m:
            continue
        number = m.group(1)
        rings = [d["rect"] for d in pg.get_drawings() if is_green(d.get("color")) and d["rect"].width > 20 and d["rect"].height > 8]
        if not rings:
            continue  # a continuation page, or no circle
        words = [w for w in pg.get_text("words") if w[4] in LETTERS]
        hits = set()
        for ring in rings:
            r = fitz.Rect(ring.x0 - 2, ring.y0 - 2, ring.x1 + 2, ring.y1 + 2)
            for w in words:
                cx, cy = (w[0] + w[2]) / 2, (w[1] + w[3]) / 2
                if r.contains(fitz.Point(cx, cy)):
                    hits.add(w[4][0])
        if len(hits) == 1:
            found[number] = hits.pop()
        else:
            unreadable.append(number)
    doc.close()
    return found, unreadable


def check(db_path, dirs):
    db = json.load(open(db_path))
    stats = {}
    for r in db:
        path = next((os.path.join(d, r["msId"] + ".pdf") for d in dirs if os.path.exists(os.path.join(d, r["msId"] + ".pdf"))), None)
        if not path:
            stats.setdefault("no pdf cached", [0, 0])[0] += len(r["questions"]); continue
        found, _ = read_pdf(path)
        for q in r["questions"]:
            s = q.get("source") or "none"
            row = stats.setdefault(s, [0, 0, 0])  # compared, agree, circle not read
            if q["questionNumber"] not in found:
                row[2] += 1; continue
            row[0] += 1; row[1] += int(found[q["questionNumber"]] == q["correctAnswer"])
    return stats


if __name__ == "__main__":
    if sys.argv[1] == "--check":
        for src, v in check(sys.argv[2], sys.argv[3:]).items():
            print(src, v)
    else:
        found, bad = read_pdf(sys.argv[1])
        print(json.dumps(found, sort_keys=True), "unreadable:", bad)
