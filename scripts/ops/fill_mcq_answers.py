#!/usr/bin/env python3
"""Fill unresolved multiple-choice answers from plain answer keys ("N. X" lines) with extract_mcq.parse_ms_answer_list.

  python3 scripts/ops/fill_mcq_answers.py <database.json> <out database.json>

Only fills a question that has no answer; never changes one that has (a different letter is reported, not written). Prints a summary."""
import json, os, sys
import fitz
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
sys.path.insert(0, os.path.join(ROOT, "prototypes", "mcq-digitizer"))
import extract_mcq as em


def ms_pdf(ms_id):
    for d in ("data/mcq-digitizer/full-library/pdfs", "data/mcq-digitizer/ms-audit/pdfs"):
        p = os.path.join(ROOT, d, ms_id + ".pdf")
        if os.path.exists(p):
            return p


def main():
    src, dst = sys.argv[1:3]
    db = json.load(open(src))
    filled = conflicts = 0
    for r in db:
        p = ms_pdf(r["msId"]) if r.get("msId") else None
        if not p:
            continue
        doc = fitz.open(p); lines = em.extract_lines(doc); doc.close()
        answers, ok = em.parse_ms_answer_list(lines)
        if not ok:
            continue
        for q in r["questions"]:
            new, old = answers.get(q["questionNumber"]), q.get("correctAnswer")
            if new and not old:
                q["correctAnswer"] = new; q["source"] = "text-parsing"; filled += 1
            elif new and old and new != old:
                conflicts += 1; print("CONFLICT", r["title"][-40:], q["questionNumber"], old, new)
    json.dump(db, open(dst, "w"))
    print(f"filled {filled} unresolved answers; {conflicts} conflicts left untouched")


if __name__ == "__main__":
    main()
