#!/usr/bin/env python3
"""Turn the owner's "DivergenCIE Topical Past Papers" books for AS Computer Science (Paper 1) into one worksheet per chapter: a question paper PDF and
a mark scheme PDF each, with the DC cover page, ready for the Question Solver.

Source: E:/CIE/A Levels/Computer Science/AS Level Computer Science Paper 1 Topical Booklet {QP,MS}.pdf. Each chapter starts at the page given by the book's
own index. Inside a chapter, the first part is vector text with a grey bar before each question ("Q4  2015-June, P12, Q1"); the rest of the chapter is scanned
exam pages (no text, no bars), which cannot be split without OCR and are left out. A chapter is built only when its question paper and mark scheme bars agree
(at least 85 percent of the question numbers of the paper have a mark scheme block).

The answers book contains mark schemes by a third party (Ahmed Thakur, 9608); the owner confirmed on 2026-10-19 that they may appear in the solver. The crops
show the answers only: his header and contact footer bands are cut off.

  python3 scripts/ops/split_cs_books.py plan                       prints each chapter's page range, bars and agreement; builds nothing
  python3 scripts/ops/split_cs_books.py build --logo <logo.jpg> --out <dir>
"""
import argparse, os, re, sys
import fitz

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, "..", "..", "prototypes", "mcq-digitizer"))
import format_worksheets as fw
import extract_mcq as em

BOOKS = "/mnt/e/CIE/A Levels/Computer Science/"
QP_BOOK = BOOKS + "AS Level Computer Science Paper 1 Topical Booklet QP.pdf"
MS_BOOK = BOOKS + "AS Level Computer Science Paper 1 Topical Booklet MS.pdf"
# chapter title -> (chapter number as in the index, name used in the file name). The page where each starts is read from the book's index page (page 2).
CHAPTERS = [("1 Information representation", "1", "Information Representation"), ("2 Communication", "2", "Communication"), ("3 Hardware", "3", "Hardware"),
            ("3.1 Logic Gates and Logic Circuits", "3.1", "Logic Gates and Logic Circuits"), ("4 Processor Fundamentals", "4", "Processor Fundamentals"),
            ("4.1 Assembly Language", "4.1", "Assembly Language"), ("5 System Software", "5", "System Software"),
            ("6 Security, privacy and data integrity", "6", "Security, Privacy and Data Integrity"), ("7 Ethics and Ownership", "7", "Ethics and Ownership"),
            ("8 Databases", "8", "Databases")]
MIN_AGREE = 0.85


def chapter_starts(doc):
    """{chapter title: first page index} from the book's index page."""
    txt = doc[1].get_text()
    out = {}
    for title, _, _ in CHAPTERS:
        m = re.search(re.escape(title) + r" (?:qp|ms)\s*\n\s*(\d+)", txt)
        if m:
            out[title] = int(m.group(1))
    return out


def vector_end(doc, first, stop):
    """Last page of the chapter that still holds text (the scanned pages after it have none), at or after the last bar."""
    starts = em.find_bar_question_starts(_slice(doc, first, stop))
    if not starts:
        return None
    last_bar_page = first + max(s["page"] for s in starts)
    end = last_bar_page
    for pg in range(last_bar_page + 1, stop):
        words = [w for w in doc[pg].get_text("words") if w[1] < em.BAR_BOTTOM]
        if len(words) < 25:
            break
        end = pg
    return end


def _slice(doc, a, b):
    out = fitz.open()
    out.insert_pdf(doc, from_page=a, to_page=b - 1)
    return out


def plan():
    q, m = fitz.open(QP_BOOK), fitz.open(MS_BOOK)
    qs, ms = chapter_starts(q), chapter_starts(m)
    rows = []
    for i, (title, num, name) in enumerate(CHAPTERS):
        if title not in qs or title not in ms:
            rows.append((title, "chapter not found in an index")); continue
        qa = qs[title]; qb = qs[CHAPTERS[i + 1][0]] if i + 1 < len(CHAPTERS) and CHAPTERS[i + 1][0] in qs else q.page_count
        ma = ms[title]; mb = ms[CHAPTERS[i + 1][0]] if i + 1 < len(CHAPTERS) and CHAPTERS[i + 1][0] in ms else m.page_count
        qe, me = vector_end(q, qa, qb), vector_end(m, ma, mb)
        if qe is None or me is None:
            rows.append((title, "no question bars in one of the books")); continue
        qn = [s["number"] for s in em.find_bar_question_starts(_slice(q, qa, qe + 1))]
        mn = [s["number"] for s in em.find_bar_question_starts(_slice(m, ma, me + 1))]
        agree = len(set(qn) & set(mn)) / max(1, len(qn))
        rows.append((title, dict(num=num, name=name, qp=(qa, qe), ms=(ma, me), qp_questions=len(qn), ms_questions=len(mn), agree=round(agree, 2), build=agree >= MIN_AGREE)))
    return rows


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("cmd", choices=["plan", "build"])
    ap.add_argument("--logo"); ap.add_argument("--out")
    a = ap.parse_args()
    rows = plan()
    for title, r in rows:
        print(title, "->", r)
    if a.cmd == "build":
        if not (a.logo and a.out):
            raise SystemExit("build needs --logo and --out")
        q, m = fitz.open(QP_BOOK), fitz.open(MS_BOOK)
        built = 0
        for title, r in rows:
            if not isinstance(r, dict) or not r["build"]:
                print("SKIPPED:", title); continue
            stem = f"CAIE AS Level Computer Science Ch{r['num']} {r['name']} (P1) Worksheet 1"
            pdfs = {}
            for label, book, (first, last) in (("QP", q, r["qp"]), ("MS", m, r["ms"])):
                body = fitz.open(); body.insert_pdf(book, from_page=first, to_page=last)
                path = os.path.join(a.out, label, f"{stem} {label}.pdf"); os.makedirs(os.path.dirname(path), exist_ok=True)
                body.save(path); pdfs[label] = path
            # the total printed on the cover is the sum of the marks printed in the question paper (a book chapter has no total of its own)
            total = sum(mk for _, mk in em.qp_question_marks(pdfs["QP"]))
            info = {"course_name": "AS Level Computer Science", "board": "CAIE", "subject_code": "9618", "instructor": fw.INSTRUCTOR, "time_allowed": "", "maximum_marks": str(total),
                    "grade_threshold": fw.GRADE, "chapter_num": r["num"], "chapter_name": fw.sentence_case(r["name"]), "version": fw.VERSION}
            for label in ("QP", "MS"):
                cover = fw.build_cover(dict(info, display_name=f"{stem} {label}"), a.logo, "Worksheet \u2013 Question Paper" if label == "QP" else "Worksheet \u2013 Mark Scheme")
                body = fitz.open(pdfs[label]); cover.insert_pdf(body); cover.save(pdfs[label] + ".tmp"); body.close(); os.replace(pdfs[label] + ".tmp", pdfs[label])
            print("BUILT:", stem, "| questions", r["qp_questions"], "| cover marks", total); built += 1
        print(built, "worksheets built")


if __name__ == "__main__":
    main()
