#!/usr/bin/env python3
"""Fill the mark scheme pictures a worksheet is missing (TKT-0349).

A worksheet whose scheme has fewer pictures than the paper has questions shows no answer for the missing questions, even in practice mode. The
scheme PDF does hold them: the parser only missed the heading, usually a line like "10 6C4" or "1     f : x a 2x - 3" (the number, then maths).
For each question number the parser did not find, this looks for a line that
  - sits at the same left margin as the headings the parser did find,
  - starts with exactly that number, and
  - lies between the headings of the numbers just before and just after it.
A worksheet is accepted only when the headings then match the paper's question numbers exactly and every cut-out block shows at least one mark code
(M1, A1, B1, B2 ...). Accepted worksheets get every scheme picture cut again from the new headings; stored marks are kept by question number.

  python3 scripts/ops/fill_scheme_gaps.py [--title "<starts with>"] [--component "..."]            plan only, writes nothing
  python3 scripts/ops/fill_scheme_gaps.py --apply --only <qpId> [<qpId> ...]                         backs up database.json and the old pictures first
"""
import argparse, json, os, re, shutil, statistics, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, os.path.join(ROOT, "prototypes", "mcq-digitizer"))
import fitz
import extract_mcq as e

LIB = os.path.join(ROOT, "data", "mcq-digitizer", "structured-library")
MARK_CODE = re.compile(r"\b(?:[MAB]\d|SC\d|DM\d|DB\d|FT)\b|\bB\d\b|\d\s*marks?\b", re.IGNORECASE)
MARGIN = 10  # points either side of the usual heading margin
WIDE = 22  # a two-digit number sits further right than a one-digit one, and a long heading line starts "11       (a)"


def pos(s):
    return (s["page"], s["y0"])


def plan_worksheet(entry):
    """{"status": "fill"|"nothing to do"|"left alone", "why", "starts": [{number, page, y0}], "found": [numbers added]}"""
    want = [str(q["questionNumber"]) for q in entry["questions"]]
    have = [str(a["questionNumber"]) for a in entry["answers"]]
    if have == want:
        return {"status": "nothing to do", "why": "one scheme per question already"}
    if not all(w.isdigit() for w in want):
        return {"status": "left alone", "why": "question numbers are not plain numbers"}
    pdf = os.path.join(LIB, "pdfs", entry["msId"] + ".pdf")
    if not os.path.exists(pdf):
        return {"status": "left alone", "why": "no mark scheme PDF on disk"}
    doc = fitz.open(pdf)
    lines = e.extract_lines(doc)
    ordered = sorted(lines, key=lambda l: (l["page"], l["y0"]))
    base = e.find_ms_question_starts(lines)
    base = [s for s in base if s["number"] in want]
    if not base:
        return {"status": "left alone", "why": "the parser found no heading at all"}
    xs = [l["x0"] for s in base for l in ordered if l["page"] == s["page"] and l["y0"] == s["y0"] and l["text"].strip().startswith(s["number"])]
    if not xs:
        return {"status": "left alone", "why": "cannot measure the heading margin"}
    near = [x for x in xs if x < 100]  # a "heading" the parser took from a table cell (x0 140 to 200) must not pull the margin out of place
    margin_x = statistics.median(near or xs)
    def in_window(x0, n):
        return (margin_x - MARGIN) <= x0 <= margin_x + MARGIN + (WIDE if len(n) == 2 else 0)
    x_of = {(l["page"], l["y0"]): l["x0"] for l in ordered if re.match(r"^\d{1,2}(\s|$)", l["text"].strip())}
    # a parser heading outside that window is noise: drop it, and look for the real heading of that number like for any missing one
    starts, found = {s["number"]: s for s in base if in_window(x_of.get((s["page"], s["y0"]), margin_x), s["number"])}, []
    for n in want:
        if n in starts:
            continue
        before = [pos(s) for k, s in starts.items() if int(k) < int(n)]
        after = [pos(s) for k, s in starts.items() if int(k) > int(n)]
        lo, hi = (max(before) if before else (0, 0)), (min(after) if after else (10 ** 6, 0))
        pat = re.compile(rf"^{n}(\s+\S|$)")
        hits = [l for l in ordered if l["page"] > 0 and in_window(l["x0"], n) and pat.match(l["text"].strip()) and lo < (l["page"], l["y0"]) < hi]
        if not hits:
            return {"status": "left alone", "why": f"no heading line found for question {n} between its neighbours"}
        starts[n] = {"number": n, "page": hits[0]["page"], "y0": hits[0]["y0"]}
        found.append(n)
    ordered_starts = sorted(starts.values(), key=pos)
    if [s["number"] for s in ordered_starts] != want:
        return {"status": "left alone", "why": f"headings come out as {[s['number'] for s in ordered_starts]}, not {want}"}
    for i, s in enumerate(ordered_starts):
        end = ordered_starts[i + 1] if i + 1 < len(ordered_starts) else None
        text = e.extract_block_text(lines, s["page"], s["y0"], end["page"] if end else doc.page_count - 1, end["y0"] if end else None)
        if not MARK_CODE.search(text):
            return {"status": "left alone", "why": f"the block for question {s['number']} shows no mark code"}
    return {"status": "fill", "why": "", "starts": ordered_starts, "found": found}


def cut(entry, starts):
    """Cut every scheme picture again from the new headings. Returns the new answers list."""
    doc = fitz.open(os.path.join(LIB, "pdfs", entry["msId"] + ".pdf"))
    marks = {str(a["questionNumber"]): a.get("marks", 0) for a in entry["answers"]}
    extra = {str(a["questionNumber"]): {k: v for k, v in a.items() if k not in ("questionNumber", "imagePath", "marks")} for a in entry["answers"]}
    folder = os.path.join(LIB, "images", entry["qpId"])
    out = []
    for i, s in enumerate(starts):
        end = starts[i + 1] if i + 1 < len(starts) else None
        png = e.render_question_image(doc, s["page"], s["y0"], end["page"] if end else doc.page_count - 1, end["y0"] if end else None)
        path = os.path.join(folder, f"a{s['number']}.png")
        open(path, "wb").write(png)
        rec = {"questionNumber": s["number"], "imagePath": os.path.relpath(path, ROOT), "marks": marks.get(s["number"], 0)}
        rec.update(extra.get(s["number"], {}))
        out.append(rec)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--title"); ap.add_argument("--component"); ap.add_argument("--apply", action="store_true"); ap.add_argument("--only", nargs="+", default=[])
    ap.add_argument("--out")
    a = ap.parse_args()
    dbp = os.path.join(LIB, "database.json")
    db = json.load(open(dbp))
    picked = [p for p in db if (not a.title or p["title"].startswith(a.title)) and (not a.component or p.get("component") == a.component) and (not a.only or p["qpId"] in a.only)
              and len(p["answers"]) != len(p["questions"])]
    plans = {}
    for p in picked:
        plans[p["qpId"]] = r = plan_worksheet(p)
        print(f"{r['status']:13s} {p['qpId'][:10]} {p['title'][22:88]:66s} {('added ' + ','.join(r.get('found', []))) if r['status'] == 'fill' else r['why']}", flush=True)
    if a.out:
        json.dump({k: {kk: vv for kk, vv in v.items()} for k, v in plans.items()}, open(a.out, "w"))
    if not a.apply:
        return
    if not a.only:
        sys.exit("--apply needs --only <qpId ...>")
    refused = [q for q in a.only if plans.get(q, {}).get("status") != "fill"]
    if refused:
        sys.exit(f"STOP: not fillable, nothing written: {refused}")
    stamp = time.strftime("%Y%m%d-%H%M%S")
    bdir = os.path.join(ROOT, "backups", f"scheme-gap-{stamp}"); os.makedirs(bdir)
    shutil.copy(dbp, os.path.join(bdir, "database.json"))
    by = {p["qpId"]: p for p in db}
    for q in a.only:
        shutil.copytree(os.path.join(LIB, "images", q), os.path.join(bdir, "images", q))
        by[q]["answers"] = cut(by[q], plans[q]["starts"])
        print("filled", q, [x["questionNumber"] for x in by[q]["answers"]])
    tmp = dbp + ".tmp"  # write whole, then rename: the solver reloads this file when it changes and must never read half of it
    json.dump(db, open(tmp, "w"), ensure_ascii=False)
    os.replace(tmp, dbp)
    print("backup:", bdir)


if __name__ == "__main__":
    main()
