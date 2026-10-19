#!/usr/bin/env python3
"""Record how many questions a multiple-choice worksheet should have, from the "Maximum Marks" printed on its branded cover (one mark per question).

  python3 scripts/ops/set_expected_questions.py <database.json> <out database.json> <folder of branded QP pdfs> [...]

Sets `expectedQuestions` on the records whose title matches a file "<title> QP.pdf". The map refresh lists such a worksheet only when it has exactly
that many questions (a parser that drops a question must not publish a short worksheet as a complete one). Other records are left alone."""
import json, os, re, sys
import fitz


def main():
    src, dst, *folders = sys.argv[1:]
    want = {}
    for folder in folders:
        for root, _, files in os.walk(folder):
            for f in files:
                if f.endswith(" QP.pdf"):
                    m = re.search(r"Maximum Marks:\s*(\d+)", fitz.open(os.path.join(root, f))[0].get_text())
                    if m:
                        want[f[: -len(" QP.pdf")]] = int(m.group(1))
    db = json.load(open(src))
    set_n = short = 0
    for r in db:
        n = want.get(r["title"])
        if n is not None:
            r["expectedQuestions"] = n; set_n += 1
            short += len(r["questions"]) != n
    json.dump(db, open(dst, "w"))
    print(f"expectedQuestions set on {set_n} records; {short} of them have a different number of questions")


if __name__ == "__main__":
    main()
