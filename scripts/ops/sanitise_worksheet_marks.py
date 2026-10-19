#!/usr/bin/env python3
"""Make topical-worksheet records honest about grading.

The solver grades a theory question against the mark scheme block's own mark count (answers[].marks). On Save My Exams worksheets that count is often
misread (for example 7 answers adding to 8 marks on a 44-mark worksheet), so Test mode would grade against a wrong denominator without saying so.
The library's rule for full A Level Maths papers is "trust marks only when the paper adds up to its fixed total, else refuse". A worksheet's fixed total is
printed on its branded question paper cover ("Maximum Marks: 44"). Per record, in this order:

  1. the mark scheme marks add up to the cover total, every block > 0      -> kept as they are                      (marksSource "mark scheme")
  2. the "[N]" marks printed in the question paper add up to the cover
     total, every question > 0, and every answer block has a question     -> answers[].marks = that question's marks (marksSource "question paper")
  3. otherwise                                                              -> every answers[].marks = 0, "marksUnreliable": true
                                                                               (the solver says the mark allocation could not be read; Practice mode is unaffected)

  python3 scripts/ops/sanitise_worksheet_marks.py <database.json> <out database.json> <folder of branded QP pdfs> [<another folder> ...] [--per-question]

--per-question is for book chapters that have no printed total (the Computer Science books): a question keeps its mark scheme marks only where the marks read from
the question paper are the same number and above 0; every other question gets 0 (the solver then says that question's marks could not be read). The worksheet is
practice only when no question agrees.

Never edits the input file. Prints a summary.
"""
import json, os, re, sys
import fitz

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "prototypes", "mcq-digitizer"))
import extract_mcq as em


def branded_papers(folders):
    """{title: (pdf path, total marks on the cover)}"""
    out = {}
    for folder in folders:
        for root, _, files in os.walk(folder):
            for f in files:
                if f.endswith(" QP.pdf"):
                    path = os.path.join(root, f)
                    m = re.search(r"Maximum Marks:\s*(\d+)", fitz.open(path)[0].get_text())
                    if m:
                        out[f[: -len(" QP.pdf")]] = (path, int(m.group(1)))
    return out


def decide(record, total, qp_marks):
    """Returns (source, {questionNumber: marks} or None). source is 'mark scheme', 'question paper' or None."""
    answers = record["answers"]
    ms_sum = sum(int(x.get("marks") or 0) for x in answers)
    if answers and ms_sum == total and all(int(x.get("marks") or 0) > 0 for x in answers):
        return "mark scheme", None
    by_number = {}
    for number, marks in qp_marks:
        by_number.setdefault(number, []).append(marks)
    if (qp_marks and sum(m for _, m in qp_marks) == total and all(m > 0 for _, m in qp_marks)
            and all(len(v) == 1 for v in by_number.values())
            and answers and all(str(x["questionNumber"]) in by_number for x in answers)):
        return "question paper", {k: v[0] for k, v in by_number.items()}
    return None, None


def per_question(record, qp_marks):
    """Returns the number of questions that keep their marks."""
    paper = dict(qp_marks)
    kept = 0
    for x in record["answers"]:
        ms, qp = int(x.get("marks") or 0), paper.get(str(x["questionNumber"]), 0)
        if ms > 0 and ms == qp:
            kept += 1
        else:
            x["marks"] = 0
    return kept


def main():
    per_q = "--per-question" in sys.argv
    src, dst, *folders = [a for a in sys.argv[1:] if a != "--per-question"]
    papers = branded_papers(folders)
    db = json.load(open(src))
    counts = {"mark scheme": 0, "question paper": 0, "practice only": 0, "untouched": 0}
    for r in db:
        hit = papers.get(r["title"])
        if hit is None:
            counts["untouched"] += 1; continue
        path, total = hit
        if per_q:
            kept = per_question(r, em.qp_question_marks(path))
            if kept:
                r["marksSource"] = "per question"; r.pop("marksUnreliable", None); counts["per question"] = counts.get("per question", 0) + 1
            else:
                r["marksUnreliable"] = True; r.pop("marksSource", None); counts["practice only"] += 1
            continue
        source, marks = decide(r, total, em.qp_question_marks(path))
        if source == "mark scheme":
            r["marksSource"] = source; r.pop("marksUnreliable", None)
        elif source == "question paper":
            for x in r["answers"]:
                x["marks"] = marks[str(x["questionNumber"])]
            r["marksSource"] = source; r.pop("marksUnreliable", None)
        else:
            for x in r["answers"]:
                x["marks"] = 0
            r["marksUnreliable"] = True; r.pop("marksSource", None)
        counts[source or "practice only"] += 1
    json.dump(db, open(dst, "w"))
    print(counts)


if __name__ == "__main__":
    main()
