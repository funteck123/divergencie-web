#!/usr/bin/env python3
"""Builds data/mcq-digitizer/structured-library/database.json -- the
on-disk cache for structured (non-MCQ) papers, kept entirely separate
from the MCQ full-library cache (full-library/database.json). Before
this script existed, every single open of a structured paper (Math's
Paper 2/Paper 4, currently the only subject that's structured start to
finish) re-downloaded both PDFs from Drive AND re-ran the PyMuPDF
splitter live, on every student, every time -- this pre-builds it once,
the same way build_full_database.py already does for MCQ papers.

Record shape is deliberately different from the MCQ database's (which
has one crop + optionLetters + correctAnswer per question): a structured
record has a QUESTION crop and a separate ANSWER crop per number, since
there's no letter-option grading here at all, just "show me this
question's own real mark-scheme working."

Resumable: skips a (qpId, msId) pair whose complete record is already in
database.json. Writes database.json after every paper (not batched), so
an interrupted run loses nothing already done. Downloaded PDFs are
cached under structured-library/pdfs/ and reused on a re-run.

Usage: python3 build_structured_database.py [board] [subject]
  no args           -> every board/subject/component combo in TARGETS below
  board, subject     -> just that one subject's structured components

The server (server.mjs's own SUBJECT_COMPONENTS) currently marks EVERY
non-mcqComponent component of EVERY subject as "structured" -- but only
Mathematics' two components (Paper 2, Paper 4) have been confirmed this
session to actually use the "Question N" heading template
extract_mcq.py's splitter recognizes (verified via a full 391-paper
atomicity audit + fix, 2026-09-05). TARGETS below is deliberately scoped
to just those two, proven-working components -- extend it once another
subject's structured component has been confirmed the same way, rather
than guessing it'll just work.
"""
import sys
import os
import json
import base64
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
MCQ_DIR = os.path.dirname(HERE)
REPO_ROOT = os.path.dirname(os.path.dirname(MCQ_DIR))
sys.path.insert(0, MCQ_DIR)

import extract_mcq as em

LIBRARY_URL = "http://localhost:5178/api/library"
STRUCTURED_LIB = os.path.join(REPO_ROOT, "data/mcq-digitizer/structured-library")
PDFS_DIR = os.path.join(STRUCTURED_LIB, "pdfs")
IMAGES_DIR = os.path.join(STRUCTURED_LIB, "images")
DATABASE_PATH = os.path.join(STRUCTURED_LIB, "database.json")
FAILURES_PATH = os.path.join(STRUCTURED_LIB, "failures.json")

os.makedirs(PDFS_DIR, exist_ok=True)
os.makedirs(IMAGES_DIR, exist_ok=True)

TARGETS = [
    ("IGCSE", "Mathematics", "Paper 2: Non-calculator (Extended)"),
    ("IGCSE", "Mathematics", "Paper 4: Calculator (Extended)"),
]


def load_json(path, default):
    if os.path.exists(path):
        return json.load(open(path))
    return default


def save_json_atomic(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + ".tmp"
    json.dump(data, open(tmp, "w"), indent=2)
    os.replace(tmp, path)


def fetch_library():
    with urllib.request.urlopen(LIBRARY_URL, timeout=30) as r:
        return json.loads(r.read())


def download_pdf(file_id):
    dest = os.path.join(PDFS_DIR, f"{file_id}.pdf")
    if os.path.exists(dest) and os.path.getsize(dest) > 0:
        return dest
    req = urllib.request.Request(
        f"https://drive.google.com/uc?export=download&id={file_id}",
        headers={"User-Agent": "Mozilla/5.0"},
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        buf = r.read()
    if buf[:5] != b"%PDF-":
        raise RuntimeError(f"file {file_id} did not download as a PDF")
    open(dest, "wb").write(buf)
    return dest


def save_crops(qp_id, prefix, blocks, include_text):
    # include_text=True for the MS side only -- its text is confirmed
    # clean (restates the question, gives the full worked solution, and
    # carries the real [N] mark allocation), unlike the QP side, whose
    # embedded font has real, unfixable per-glyph advance-width
    # corruption that makes its extracted text unusable prose (confirmed
    # via a real word-boundary test, not assumed) -- see extract_mcq.py's
    # parse_structured docstring. Test-mode grading is built entirely
    # from the MS block's text for this reason; the QP side only ever
    # needs its (correct, unaffected) rendered image.
    img_dir = os.path.join(IMAGES_DIR, qp_id)
    os.makedirs(img_dir, exist_ok=True)
    saved = []
    for b in blocks:
        b64 = b["image"].split(",", 1)[1]
        rel_path = f"data/mcq-digitizer/structured-library/images/{qp_id}/{prefix}{b['questionNumber']}.png"
        abs_path = os.path.join(REPO_ROOT, rel_path)
        open(abs_path, "wb").write(base64.b64decode(b64))
        entry = {"questionNumber": b["questionNumber"], "imagePath": rel_path}
        if include_text:
            entry["text"] = b["text"]
            entry["marks"] = b["marks"]
            entry["corrupted"] = b["corrupted"]
        saved.append(entry)
    return saved


def main():
    targets = TARGETS
    if len(sys.argv) == 3:
        board, subject = sys.argv[1], sys.argv[2]
        targets = [t for t in TARGETS if t[0] == board and t[1] == subject]
        if not targets:
            print(f"No TARGETS entry for {board}/{subject} -- add it to TARGETS first.", file=sys.stderr)
            sys.exit(1)

    library = fetch_library()
    db = load_json(DATABASE_PATH, [])
    by_key = {(r["qpId"], r["msId"]): r for r in db}
    failures = load_json(FAILURES_PATH, [])

    papers = []
    for board, subject, component in targets:
        comp_papers = library.get(board, {}).get(subject, {}).get(component, [])
        for p in comp_papers:
            papers.append({**p, "board": board, "subject": subject, "component": component})

    total = len(papers)
    print(f"{total} papers across {len(targets)} component(s)")
    done = 0
    for p in papers:
        done += 1
        key = (p["qpId"], p["msId"])
        if key in by_key:
            continue
        try:
            qp_path = download_pdf(p["qpId"])
            ms_path = download_pdf(p["msId"])
            questions = em.parse_structured(qp_path)
            answers = em.parse_structured(ms_path)
            record = {
                "board": p["board"],
                "subject": p["subject"],
                "component": p["component"],
                "title": p["title"],
                "qpId": p["qpId"],
                "msId": p["msId"],
                "questions": save_crops(p["qpId"], "q", questions, include_text=False),
                "answers": save_crops(p["qpId"], "a", answers, include_text=True),
            }
            db.append(record)
            by_key[key] = record
            save_json_atomic(DATABASE_PATH, db)
            failures = [f for f in failures if f.get("qpId") != p["qpId"]]
        except Exception as e:
            print(f"  FAILED: {p['title']} -> {e}", file=sys.stderr)
            failures = [f for f in failures if f.get("qpId") != p["qpId"]]
            failures.append({"qpId": p["qpId"], "msId": p["msId"], "title": p["title"], "error": str(e)})
            save_json_atomic(FAILURES_PATH, failures)
            continue
        if done % 20 == 0 or done == total:
            print(f"progress {done}/{total}", file=sys.stderr)

    save_json_atomic(FAILURES_PATH, failures)
    print(f"done. {len(db)} papers cached, {len(failures)} failures.")


if __name__ == "__main__":
    main()
