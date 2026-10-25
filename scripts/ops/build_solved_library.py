#!/usr/bin/env python3
"""Catalogue the SOLVED practical papers (A Level Chemistry and Physics, AS Paper 3 and A Level Paper 5) for the Question Solver (TKT-0379).

The Question Solver offers three kinds of paper: topical worksheets, yearly past papers, and these solved ones: worked solutions, compiled mark
schemes, Cambridge practical booklets and examiner comments. The list below is chosen by hand from the folders on the E: drive, because the
file names do not say what a file is. Only files that exist are listed. The manifest holds real paths for the server; the browser only ever sees ids.

  python3 scripts/ops/build_solved_library.py        writes data/mcq-digitizer/solved-library/solved-library.json and prints a summary
"""
import hashlib, json, os, re, sys
import fitz

ROOT = os.environ.get("CIE_ROOT", "/mnt/e/CIE/A Levels")
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data", "mcq-digitizer", "solved-library", "solved-library.json")
BOARD = "A Levels"
P3 = "Paper 3: Advanced Practical Skills (A Level)"
P5 = "Paper 5: Planning, Analysis and Evaluation (A Level)"

# (subject, component, kind, title, path under ROOT)
ITEMS = [
    ("Physics", P5, "Worked solutions", "Paper 5 worked solutions, all variants 2010 to 2016", "Physics/Past Papers/Paper 5 Yearly Worked Solutions.pdf"),
    ("Physics", P5, "Mark schemes", "Paper 5 mark schemes, all years (compiled)", "Physics/Past Papers/ms 5/9702 ms 5 all.pdf"),
    ("Physics", P5, "Question papers", "Paper 5 question papers, all years (compiled)", "Physics/Past Papers/qp 5/9702 qp 5 all.pdf"),
    ("Physics", P5, "Examiner comments", "Paper 5 examiner comments, question 1", "Physics/9702_iECRs (1)/Paper 5/IECRs A level Physics P5 Q1.pdf"),
    ("Physics", P5, "Examiner comments", "Paper 5 examiner comments, question 2", "Physics/9702_iECRs (1)/Paper 5/IECRs A level Physics P5 Q2.pdf"),
    ("Physics", P5, "Guide", "A2 Physics Paper 5 notes", "Physics/A2 Physics Paper 5 Notes.pdf"),
    ("Physics", P3, "Mark schemes", "Paper 3 mark schemes, all years (compiled)", "Physics/Past Papers/ms 3/9702 p3 ms all.pdf"),
    ("Physics", P3, "Question papers", "Paper 3 question papers, all years (compiled)", "Physics/Past Papers/qp 3/9702 p3 qp all.pdf"),
    ("Physics", P3, "Examiner comments", "Paper 3 consolidated examiner report", "Physics/Past Papers/ecr 9702/ECR_AS-AL_Physics_9702_P3_v1.pdf"),
    ("Physics", P3, "Guide", "AS practical (Paper 3) guide, Dulwich College", "Physics/Guide_to_AS_Practical_P3.pdf"),
    ("Physics", P3, "Guide", "AS Physics Practical Paper 3 notes, GCE Guide", "Physics/AS Level Physics Practical Paper 3 Notes - GCE Guide.pdf"),
    ("Physics", P3, "Guide", "Advanced Practical Skills", "Physics/Notes/Advanced Practical Skills.pdf"),
    ("Chemistry", P5, "Worked solutions", "Paper 5 worked solutions, all variants 2010 to 2017", "Chemistry/Past Papers/Paper_5_All_Variants_Yearly_worked_Solut.pdf"),
    ("Chemistry", P5, "Mark schemes", "Paper 5 mark schemes, all years (compiled)", "Chemistry/Past Papers/p5 ms/9701 P5 ms all.pdf"),
    ("Chemistry", P5, "Question papers", "Paper 5 question papers, all years (compiled)", "Chemistry/Past Papers/p5/9701 P5 qp all.pdf"),
    ("Chemistry", P5, "Examiner comments", "Paper 5 examiner comments, question 1", "Chemistry/9701_iECRs/IECRs ASA level Chemistry P52 Q1.pdf"),
    ("Chemistry", P5, "Examiner comments", "Paper 5 examiner comments, question 2", "Chemistry/9701_iECRs/IECRs ASA level Chemistry P52 Q2.pdf"),
    ("Chemistry", P3, "Examiner comments", "Paper 3 examiner comments, question 3(a)", "Chemistry/9701_iECRs/IECRs ASA level Chemistry P33 Q3a.pdf"),
    ("Chemistry", P3, "Guide", "AS tests: organic chemistry and qualitative analysis, complete list", "Chemistry/9701 AS Level Chemistry Tests Organic Chemistry and Qualitative Analysis Complete List.pdf"),
]


def booklet_items():
    """The twelve Cambridge Physics practical booklets; the title is read from each one's first page."""
    out = []
    for n in range(1, 13):
        rel = f"Physics/Notes/Practical Booklet {n:02d}.pdf"
        path = os.path.join(ROOT, rel)
        if not os.path.exists(path):
            continue
        text = " ".join(fitz.open(path)[0].get_text().split())
        m = re.search(r"Practical booklet\s+%d\s+(.+)" % n, text, re.I)
        out.append(("Physics", P3 if n <= 6 else P5, "Practical booklet", f"Practical booklet {n}: {(m.group(1) if m else '').strip()[:110]}".rstrip(": "), rel))
    return out


def main():
    lib, missing, total = {}, [], 0
    for subject, component, kind, title, rel in ITEMS + booklet_items():
        path = os.path.join(ROOT, rel)
        if not os.path.exists(path):
            missing.append(rel); continue
        try:
            pages = len(fitz.open(path))
        except Exception as e:  # a damaged file is left out rather than offered
            missing.append(f"{rel} (cannot open: {e})"); continue
        solved_id = "SOL-" + hashlib.sha1(rel.encode()).hexdigest()[:10]
        lib.setdefault(BOARD, {}).setdefault(subject, {}).setdefault(component, []).append({"solvedId": solved_id, "title": title, "kind": kind, "pages": pages, "path": path})
        total += 1
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(lib, open(OUT, "w"), indent=1)
    for subject, comps in lib[BOARD].items():
        for comp, items in comps.items():
            print(f"{subject:10s} {comp[:48]:48s} {len(items):2d} items, {sum(i['pages'] for i in items)} pages")
    print(total, "items written to", os.path.relpath(OUT), "| missing:", missing or "none")


if __name__ == "__main__":
    main()
