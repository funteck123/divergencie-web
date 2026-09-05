#!/usr/bin/env python3
"""Builds Theory-format papers into the SAME
data/mcq-digitizer/structured-library/database.json Math's structured
papers already live in -- the record shape is compatible (a question
crop + an answer crop + marks per number), so this is one shared
database, not a second file, even though the underlying PDF format and
splitter (extract_mcq.parse_theory_qp/parse_theory_ms) are completely
different from Math's "Question N" template. Records carry
`"format": "theory"` so a future consumer can tell which splitter/schema
quirks apply without re-deriving it from board/subject.

KNOWN, DISCLOSED LIMITATION (not fixed, not hidden): the MS-side
find_ms_total_markers only recognizes two of at least three real
phrasings for a question's total marks, confirmed via a live 15-pair
audit to exactly match only 3/15 papers' question count. Every record
built here still gets its QP-side crops (validated clean, 15/15,
Practice mode always works), but many papers will have fewer answer
entries than questions -- those questions simply have no `answers` match
and the existing "No mark scheme was found for this question" UI
fallback (built for Math) handles it the same way. This is intentional:
ship the QP side for real Practice-mode value now rather than block
digitization on a full MS-parsing fix, but never silently mark a
missing MS block as gradable.

Input: a JSON file of {board, subject, component, title, qpId, msId}
records (this repo's convention is to build that pairing list from a
real Drive folder crawl -- see study/agent-notes/09-google-drive-
without-mcp-method.md -- since Theory content isn't in drive-map.json's
stale crawl at all yet). Pass its path as the one CLI argument.

Resumable: skips a (qpId, msId) pair whose record is already in
database.json. Writes database.json after every paper (not batched).
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

STRUCTURED_LIB = os.path.join(REPO_ROOT, "data/mcq-digitizer/structured-library")
PDFS_DIR = os.path.join(STRUCTURED_LIB, "pdfs")
IMAGES_DIR = os.path.join(STRUCTURED_LIB, "images")
DATABASE_PATH = os.path.join(STRUCTURED_LIB, "database.json")
FAILURES_PATH = os.path.join(STRUCTURED_LIB, "theory_failures.json")

os.makedirs(PDFS_DIR, exist_ok=True)
os.makedirs(IMAGES_DIR, exist_ok=True)


def load_json(path, default):
    if os.path.exists(path):
        return json.load(open(path))
    return default


def save_json_atomic(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + ".tmp"
    json.dump(data, open(tmp, "w"), indent=2)
    os.replace(tmp, path)


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


def save_crops(qp_id, prefix, blocks, include_marks):
    img_dir = os.path.join(IMAGES_DIR, qp_id)
    os.makedirs(img_dir, exist_ok=True)
    saved = []
    for b in blocks:
        b64 = b["image"].split(",", 1)[1]
        rel_path = f"data/mcq-digitizer/structured-library/images/{qp_id}/{prefix}{b['questionNumber']}.png"
        abs_path = os.path.join(REPO_ROOT, rel_path)
        open(abs_path, "wb").write(base64.b64decode(b64))
        entry = {"questionNumber": b["questionNumber"], "imagePath": rel_path}
        if include_marks:
            entry["marks"] = b["marks"]
        saved.append(entry)
    return saved


def main():
    if len(sys.argv) != 2:
        print("usage: build_theory_database.py <pairs.json>", file=sys.stderr)
        sys.exit(1)
    papers = json.load(open(sys.argv[1]))

    db = load_json(DATABASE_PATH, [])
    by_key = {(r["qpId"], r["msId"]): r for r in db}
    failures = load_json(FAILURES_PATH, [])

    total = len(papers)
    print(f"{total} theory papers to process")
    done = 0
    for p in papers:
        done += 1
        key = (p["qpId"], p["msId"])
        if key in by_key:
            continue
        try:
            qp_path = download_pdf(p["qpId"])
            ms_path = download_pdf(p["msId"])
            questions = em.parse_theory_qp(qp_path)
            answers = em.parse_theory_ms(ms_path)
            record = {
                "format": "theory",
                "board": p["board"],
                "subject": p["subject"],
                "component": p["component"],
                "title": p["title"],
                "qpId": p["qpId"],
                "msId": p["msId"],
                "questions": save_crops(p["qpId"], "q", questions, include_marks=False),
                "answers": save_crops(p["qpId"], "a", answers, include_marks=True),
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
    print(f"done. {len(db)} total records in database.json, {len(failures)} theory failures.")


if __name__ == "__main__":
    main()
