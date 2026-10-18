#!/usr/bin/env python3
"""Make topical-worksheet records honest about grading.

The solver grades a theory question against the mark scheme block's own mark count. On Save My Exams worksheets that count is often misread
(for example 7 answers adding to 8 marks on a 44-mark worksheet), so Test mode would grade against a wrong denominator without saying so.
The library's rule for A Level Maths is "trust marks only when the paper adds up to its fixed total, else refuse". Worksheets have no fixed total in the
code, but each branded question paper prints its own on the cover ("Maximum Marks: 44"). So, per record:

  sum(answers[].marks) == the total on the cover   -> left as it is (gradable)
  otherwise                                         -> every answers[].marks is set to 0 and "marksUnreliable": true is added
                                                       (the solver then says the question's marks could not be read; Practice mode is unaffected)

  python3 scripts/ops/sanitise_worksheet_marks.py <database.json> <out database.json> <folder of branded QP pdfs> [<another folder> ...]

Never edits the input file. Prints a per-record summary.
"""
import json, os, re, sys
import fitz


def totals(folders):
    out = {}
    for folder in folders:
        for root, _, files in os.walk(folder):
            for f in files:
                if f.endswith(" QP.pdf"):
                    m = re.search(r"Maximum Marks:\s*(\d+)", fitz.open(os.path.join(root, f))[0].get_text())
                    if m:
                        out[f[: -len(" QP.pdf")]] = int(m.group(1))
    return out


def main():
    src, dst, *folders = sys.argv[1:]
    want = totals(folders)
    db = json.load(open(src))
    kept = zeroed = untouched = 0
    for r in db:
        total = want.get(r["title"])
        if total is None:
            untouched += 1; continue
        got = sum(int(x.get("marks") or 0) for x in r["answers"])
        if got == total and r["answers"] and all(int(x.get("marks") or 0) > 0 for x in r["answers"]):
            kept += 1
        else:
            for x in r["answers"]:
                x["marks"] = 0
            r["marksUnreliable"] = True
            zeroed += 1
    json.dump(db, open(dst, "w"))
    print(f"{kept} left gradable, {zeroed} set to practice-only, {untouched} records not in these folders (untouched)")


if __name__ == "__main__":
    main()
