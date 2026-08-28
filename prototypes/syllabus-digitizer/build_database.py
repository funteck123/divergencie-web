#!/usr/bin/env python3
# Pre-builds every syllabus's topic outline once, up front, into a single
# database.json -- same pattern as mcq-digitizer's full-library database
# (data/mcq-digitizer/full-library/database.json): the server should load
# a finished result straight off disk, not shell out to Python and
# re-parse a PDF on every click. Run this after adding new PDFs to
# ../syllabus-library/pdfs/; the server picks up changes automatically by
# checking the database file's own mtime (see server.mjs).
import os
import re
import json
import sys
import time
import shutil

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from extract_syllabus import find_subject_content_range, extract_lines, build_outline, build_tree, safe_filename
import fitz

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PDFS_DIR = os.path.join(REPO_ROOT, "prototypes", "syllabus-library", "pdfs")
OUT_PATH = os.path.join(REPO_ROOT, "data", "syllabus-digitizer", "database.json")
IMAGES_DIR = os.path.join(REPO_ROOT, "data", "syllabus-digitizer", "images")

FILENAME_RE = re.compile(r'^(igcse|a-level)-(.+?)-(\d{4})-(.+)\.pdf$')


def title_case(slug):
    words = slug.split("-")
    out = []
    for w in words:
        if w in ("and",):
            out.append(w)
        elif len(w) <= 3:
            out.append(w.upper())
        else:
            out.append(w[0].upper() + w[1:])
    title = " ".join(out)
    title = title.replace("Ict", "ICT").replace("Esl", "ESL")
    return title


def parse_filename(filename):
    m = FILENAME_RE.match(filename)
    if not m:
        return {"level": "unknown", "subject": filename, "code": "", "cycle": ""}
    level, subject_slug, code, cycle = m.groups()
    return {
        "level": "IGCSE" if level == "igcse" else "A Level",
        "subject": title_case(subject_slug),
        "code": code,
        "cycle": cycle,
    }


def extract_one(pdf_path, subject_rel_path):
    doc = fitz.open(pdf_path)
    result = {"pageCount": doc.page_count, "sectionGuessed": False, "topics": []}
    rng = find_subject_content_range(doc)
    if rng is None:
        result["error"] = "Could not locate a Contents page with numbered chapters -- this PDF may not follow the standard Cambridge syllabus template."
        return result
    start_idx, end_idx, guessed = rng
    result["sectionGuessed"] = guessed
    result["sectionPageRange"] = [start_idx + 1, end_idx]
    lines = extract_lines(doc, start_idx, end_idx)
    result["topics"] = build_outline(
        lines, doc=doc, section_end_idx=end_idx,
        images_dir=IMAGES_DIR, subject_rel_path=subject_rel_path,
    )
    result["tree"] = build_tree(result["topics"])
    return result


def count_images(topics):
    count = 0
    for t in topics:
        if t.get("image"):
            count += 1
        count += count_images(t.get("children", []))
    return count


def main():
    # Rebuilt from scratch every run rather than patched in place -- a
    # subject whose chapter titles changed (a newer syllabus cycle) would
    # otherwise leave that chapter's old image folder behind under its
    # stale name alongside the new one.
    if os.path.isdir(IMAGES_DIR):
        shutil.rmtree(IMAGES_DIR)

    filenames = sorted(f for f in os.listdir(PDFS_DIR) if f.endswith(".pdf"))
    subjects = {}
    errors = []
    for filename in filenames:
        pdf_path = os.path.join(PDFS_DIR, filename)
        meta = parse_filename(filename)
        level_folder = safe_filename(None, meta["level"])
        subject_folder = safe_filename(None, meta["subject"])
        subject_rel_path = f"{level_folder}/{subject_folder}"
        try:
            extracted = extract_one(pdf_path, subject_rel_path)
        except Exception as e:
            errors.append({"filename": filename, "error": str(e)})
            print(f"FAILED {filename}: {e}", file=sys.stderr)
            continue
        subjects[filename] = {**meta, "filename": filename, **extracted}
        topic_count = len(extracted.get("topics", []))
        image_count = count_images(extracted.get("tree", []))
        flag = " (guessed section)" if extracted.get("sectionGuessed") else ""
        image_flag = f", {image_count} image(s)" if image_count else ""
        print(f"OK {filename}: {topic_count} topics{image_flag}{flag}")

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    database = {
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "subjectCount": len(subjects),
        "errors": errors,
        "subjects": subjects,
    }
    with open(OUT_PATH, "w") as f:
        json.dump(database, f, indent=2)
    print(f"\nWrote {len(subjects)} subjects ({len(errors)} failed) to {OUT_PATH}")


if __name__ == "__main__":
    main()
