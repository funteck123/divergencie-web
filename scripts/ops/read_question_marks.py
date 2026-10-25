#!/usr/bin/env python3
"""Fill in the marks of structured worksheet questions that have none, reading them off the question pictures (TKT-0349).

Some booklets have 0 marks stored for a question (the grader then refuses it: "mark allocation couldn't be reliably read") because the numbers sit
inside the pictures, not in a text layer. The paper prints each part's marks at the end of the part, "[5]" "[3]". This tool reads them with OCR
and accepts a worksheet ONLY when the marks add up to the "Maximum Marks" on its cover page, the same rule as TKT-0301:
  - every question of the worksheet has marks (stored ones are kept, missing ones are read), and
  - their sum equals the cover's Maximum Marks.
One sum over many numbers matching an independent number is hard to get right by accident. Otherwise the worksheet is left alone and the reason is listed.

  python3 scripts/ops/read_question_marks.py <database.json> <pdf dir> --title "<starts with>" [--component "..."] [--out result.json]   read only
  ... --set <qpId>:<question>=<marks>   a mark read by eye where OCR found none (still checked against the cover total)
  python3 scripts/ops/read_question_marks.py <database.json> <pdf dir> --component "Paper 3: Pure Mathematics 3" --apply --only <qpId> [<qpId> ...]
        backs up <database.json> first, then writes the marks of exactly the named, accepted worksheets (nothing else changes).
"""
import argparse, json, os, re, shutil, sys, time
import fitz
import numpy as np
from PIL import Image
from rapidocr_onnxruntime import RapidOCR

_ocr = RapidOCR()
MIN_HEIGHT = 640  # the OCR detector finds nothing on very wide, thin pictures (a one-line question); padding with white fixes that


def read_brackets(path):
    """The [N] marks printed on a question picture, top to bottom."""
    im = Image.open(path).convert("RGB")
    if im.height < MIN_HEIGHT:
        canvas = Image.new("RGB", (im.width, MIN_HEIGHT), "white"); canvas.paste(im, (0, (MIN_HEIGHT - im.height) // 2)); im = canvas
    result, _ = _ocr(np.array(im))
    found = []
    for pts, text, _score in result or []:
        m = re.fullmatch(r"\[\s*(\d{1,2})\s*\]", str(text).replace(" ", ""))
        if m:
            found.append((sum(p[1] for p in pts) / 4, int(m.group(1))))
    return [v for _, v in sorted(found)]


def cover_total(pdf_path):
    """The cover page's "Maximum Marks", or None."""
    if not os.path.exists(pdf_path):
        return None
    m = re.search(r"Maximum Marks:?\s*(\d+)", fitz.open(pdf_path)[0].get_text())
    return int(m.group(1)) if m else None


def read_worksheet(entry, pdf_dir, manual=None):
    """{"status": "accepted"|"left alone"|"nothing to do", "why", "cover", "questions": {n: {"stored", "read": [brackets], "marks"}}}"""
    total = cover_total(os.path.join(pdf_dir, entry["qpId"] + ".pdf"))
    qs, missing = {}, 0
    scheme = {a["questionNumber"]: a for a in entry["answers"]}  # paired by question number, never by position
    for q in entry["questions"]:
        n = q["questionNumber"]
        a = scheme.get(n)
        if a is None:
            qs[n] = {"stored": 0, "read": [], "marks": 0, "noScheme": True}
            missing += 1
            continue
        stored = int(a.get("marks") or 0)
        rec = {"stored": stored, "read": [], "marks": stored}
        if not stored:
            missing += 1
            if os.path.exists(q["imagePath"]):
                rec["read"] = read_brackets(q["imagePath"])
                if not rec["read"] and manual and (entry["qpId"], n) in manual:
                    rec["read"] = [manual[(entry["qpId"], n)]]  # a person read this [N] off the picture
                rec["marks"] = sum(rec["read"])
        qs[n] = rec
    out = {"qpId": entry["qpId"], "msId": entry["msId"], "title": entry["title"], "cover": total, "questions": qs}
    if not missing:
        return {**out, "status": "nothing to do", "why": "every question already has marks"}
    if [a["questionNumber"] for a in entry["answers"]] != [q["questionNumber"] for q in entry["questions"]]:
        return {**out, "status": "left alone", "why": "scheme picture numbers do not match the questions one to one, in order (check with make_pair_images.py, fix with relabel_schemes_by_position.py)"}
    noscheme = [n for n, r in qs.items() if r.get("noScheme")]
    if noscheme:
        return {**out, "status": "left alone", "why": f"no mark scheme picture for question(s) {', '.join(noscheme)}"}
    unread = [n for n, r in qs.items() if r["marks"] == 0]
    if total is None:
        return {**out, "status": "left alone", "why": "no Maximum Marks on the cover"}
    if unread:
        return {**out, "status": "left alone", "why": f"no marks read for question(s) {', '.join(unread)}"}
    got = sum(r["marks"] for r in qs.values())
    if got != total:
        return {**out, "status": "left alone", "why": f"marks add up to {got}, the cover says {total}"}
    return {**out, "status": "accepted", "why": ""}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("db"); ap.add_argument("pdfdir"); ap.add_argument("--title"); ap.add_argument("--component"); ap.add_argument("--out")
    ap.add_argument("--set", nargs="+", default=[], help="qpId:question=marks, a [N] a person read off the picture that OCR missed; the cover-total rule still applies")
    ap.add_argument("--apply", action="store_true"); ap.add_argument("--only", nargs="+", default=[])
    a = ap.parse_args()
    db = json.load(open(a.db))
    picked = [p for p in db if (not a.title or p["title"].startswith(a.title)) and (not a.component or p.get("component") == a.component) and (not a.only or p["qpId"] in a.only)]
    manual = {(k.split(":")[0], k.split(":")[1].split("=")[0]): int(k.split("=")[1]) for k in a.set}
    results = []
    for p in picked:
        r = read_worksheet(p, a.pdfdir, manual)
        results.append(r)
        got = sum(v["marks"] for v in r["questions"].values())
        print(f"{r['status']:13s} {p['title'][:66]:66s} marks {got}/{r['cover']} {r['why']}", flush=True)
    if a.out:
        json.dump(results, open(a.out, "w"), indent=1)
    if not a.apply:
        return
    if not a.only:
        sys.exit("--apply needs --only <qpId ...>: name the worksheets to change")
    accepted = [r for r in results if r["status"] == "accepted"]
    refused = [r["qpId"] for r in results if r["status"] != "accepted"]
    if refused:
        sys.exit(f"STOP: not accepted, nothing written: {refused}")
    backup = f"{a.db}.bak-{time.strftime('%Y%m%d-%H%M%S')}"
    shutil.copy(a.db, backup); print("backup:", backup)
    by = {p["qpId"]: p for p in db}
    changed = 0
    for r in accepted:
        for ans in by[r["qpId"]]["answers"]:
            rec = r["questions"].get(ans["questionNumber"])
            if rec is None:
                continue
            if not int(ans.get("marks") or 0):
                ans["marks"] = rec["marks"]; ans["marksSource"] = "paper-brackets-checked-against-cover"; changed += 1
    json.dump(db, open(a.db, "w"), ensure_ascii=False)
    print(f"wrote marks for {changed} questions in {len(accepted)} worksheets")


if __name__ == "__main__":
    main()
