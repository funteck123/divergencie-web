#!/usr/bin/env python3
"""Stack each question's paper picture (top) and its mark scheme picture (bottom) into one labelled image, so a reader (a person or a vision model)
can check in one look that the scheme belongs to the question and read both mark totals (TKT-0349).

  python3 scripts/ops/make_pair_images.py <database.json> --out <dir> (--title "<starts with>" | --qpid <id> ...) [--width 1000]
Writes <dir>/<qpId>/q<N>.png and <dir>/<qpId>/index.json {title, questions: [{n, file, qLabel, sLabel}]}.
Pairing is by question NUMBER first. When a scheme carries the number twice or not at all, the stored position is used and the label says so.
"""
import argparse, json, os
from PIL import Image, ImageDraw


def scaled(path, width):
    im = Image.open(path).convert("RGB")
    return im.resize((width, max(24, round(im.height * width / im.width))))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("db"); ap.add_argument("--out", required=True); ap.add_argument("--title"); ap.add_argument("--qpid", nargs="*", default=[]); ap.add_argument("--width", type=int, default=1000)
    a = ap.parse_args()
    db = json.load(open(a.db))
    picked = [p for p in db if (a.title and p["title"].startswith(a.title)) or p["qpId"] in a.qpid]
    for p in picked:
        folder = os.path.join(a.out, p["qpId"]); os.makedirs(folder, exist_ok=True)
        by_number = {}
        for x in p["answers"]:
            by_number.setdefault(x["questionNumber"], []).append(x)
        index = []
        for i, q in enumerate(p["questions"]):
            n = q["questionNumber"]
            hits = by_number.get(n, [])
            if len(hits) == 1:
                s, how = hits[0], "by number"
            elif i < len(p["answers"]):
                s, how = p["answers"][i], f"by position ({'number repeated' if len(hits) > 1 else 'no scheme with this number'})"
            else:
                s, how = None, "NO SCHEME"
            top = scaled(q["imagePath"], a.width)
            bottom = scaled(s["imagePath"], a.width) if s else Image.new("RGB", (a.width, 40), "white")
            canvas = Image.new("RGB", (a.width, top.height + bottom.height + 74), "white"); d = ImageDraw.Draw(canvas)
            d.rectangle([0, 0, a.width, 22], fill=(26, 60, 94)); d.text((6, 5), f"QUESTION PICTURE, question {n}", fill="white"); canvas.paste(top, (0, 24))
            y = top.height + 28; d.rectangle([0, y, a.width, y + 22], fill=(150, 40, 40)); d.text((6, y + 5), f"MARK SCHEME PICTURE, labelled {s['questionNumber'] if s else '-'}, paired {how}", fill="white"); canvas.paste(bottom, (0, y + 24))
            f = os.path.join(folder, f"q{n}.png"); canvas.save(f)
            index.append({"n": n, "file": f, "qLabel": n, "sLabel": s["questionNumber"] if s else None, "how": how})
        json.dump({"title": p["title"], "qpId": p["qpId"], "questions": index}, open(os.path.join(folder, "index.json"), "w"), indent=1)
        print(p["qpId"], p["title"][:60], len(index), "pairs")


if __name__ == "__main__":
    main()
