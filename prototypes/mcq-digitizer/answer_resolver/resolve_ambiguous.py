#!/usr/bin/env python3
"""Batch-resolves every ambiguous question in the 51 image-based MS
files (data/mcq-digitizer/ms-audit/report.json) using, in order:
  1. lightweight_detect.detect_answer (no LLM, no OCR -- icon-color
     detection). Confident only when greenCount==1 and plausible.
  2. llm_composite (Gemini, 4-page-batched) for whatever's left.
Writes results incrementally to data/mcq-digitizer/answer-cache/cache.json
as it goes, so a crash partway through loses nothing already resolved and
a rerun skips files/questions already in the cache.

Reuses extract_mcq.py's own boundary-detection (find_question_starts) to
map each ambiguous question number to the PDF page its MS explanation is
on -- parse_ms() doesn't expose page positions, so this reimplements just
the walk, not the elimination/correct-answer regex logic itself (that
stays untouched, out of scope for this script).
"""
import sys
import os
import json
import time

HERE = os.path.dirname(os.path.abspath(__file__))
MCQ_DIR = os.path.dirname(HERE)
REPO_ROOT = os.path.dirname(os.path.dirname(MCQ_DIR))
sys.path.insert(0, MCQ_DIR)
sys.path.insert(0, HERE)

import extract_mcq as em
import lightweight_detect as lw
import llm_composite as llmc
import fitz

REPORT_PATH = os.path.join(REPO_ROOT, "data/mcq-digitizer/ms-audit/report.json")
PDFS_DIR = os.path.join(REPO_ROOT, "data/mcq-digitizer/ms-audit/pdfs")
CACHE_PATH = os.path.join(REPO_ROOT, "data/mcq-digitizer/answer-cache/cache.json")


def load_cache():
    if os.path.exists(CACHE_PATH):
        return json.load(open(CACHE_PATH))
    return {}


def save_cache(cache):
    os.makedirs(os.path.dirname(CACHE_PATH), exist_ok=True)
    tmp = CACHE_PATH + ".tmp"
    json.dump(cache, open(tmp, "w"), indent=2)
    os.replace(tmp, CACHE_PATH)


def ambiguous_with_pages(pdf_path):
    """Reimplements parse_ms's walk but also returns each ambiguous
    question's (page, y0_start, page_end, y_bottom) for rendering --
    mirrors parse_qp's own page-bounding logic (same file) so the
    rendered region matches what a human would see as "this question's
    block", not the whole rest of the document."""
    doc = fitz.open(pdf_path)
    lines = em.extract_lines(doc)
    starts, _quasi = em.find_question_starts(lines)

    results = {}
    for i, s in enumerate(starts):
        import re
        m = re.match(r'^([A-Da-d])\.?$', s["inlineText"])
        if m:
            continue  # resolved directly, not ambiguous

        start_pos = em._pos(s["page"], s["y0"])
        end_pos = (
            em._pos(starts[i + 1]["page"], starts[i + 1]["y0"])
            if i + 1 < len(starts) else em._pos(doc.page_count, 0)
        )
        block_lines = [l for l in lines if start_pos <= em._pos(l["page"], l["y0"]) < end_pos]
        block_text = "\n".join(l["text"] for l in block_lines)
        option_letters = em.option_letters_in_block(lines, start_pos, end_pos) or {"A", "B", "C", "D"}

        correct_matches = {mm.group(1).upper() for mm in em.CORRECT_RE.finditer(block_text)}
        if len(correct_matches) == 1:
            continue
        eliminated = set()
        for emm in em.ELIMINATION_RE.finditer(block_text):
            eliminated.update(re.findall(r'[A-D]', emm.group(1)))
        remaining = option_letters - eliminated
        if len(remaining) == 1:
            continue

        pages_with_content = sorted(set(l["page"] for l in block_lines)) or [s["page"]]
        # Use the page with the MOST content as the representative page
        # to render -- usually where the actual explanation/graphic is,
        # not the page bearing just the heading.
        page_counts = {}
        for l in block_lines:
            page_counts[l["page"]] = page_counts.get(l["page"], 0) + len(l["text"])
        best_page = max(page_counts, key=page_counts.get) if page_counts else s["page"]
        results[s["number"]] = best_page

    doc.close()
    return results


def resolve_file(ms_id, cache):
    if ms_id in cache and cache[ms_id].get("_done"):
        return 0, 0, 0  # already fully processed
    pdf_path = os.path.join(PDFS_DIR, f"{ms_id}.pdf")
    if not os.path.exists(pdf_path):
        return 0, 0, 0

    amb = ambiguous_with_pages(pdf_path)
    file_cache = cache.setdefault(ms_id, {})
    lw_resolved, gemini_queue = 0, []

    for qnum, page in amb.items():
        if qnum in file_cache:
            continue
        try:
            r = lw.detect_answer(pdf_path, page)
        except Exception:
            r = None
        if r and r["greenCount"] == 1 and r["plausible"]:
            idx = r["markOrder"].index("green")
            letter = chr(65 + idx)
            file_cache[qnum] = {"answer": letter, "source": "lightweight"}
            lw_resolved += 1
        else:
            gemini_queue.append((qnum, page))

    # Render pages for Gemini queue, batch 4 at a time.
    gemini_resolved = 0
    if gemini_queue:
        doc = fitz.open(pdf_path)
        for batch_start in range(0, len(gemini_queue), 4):
            batch = gemini_queue[batch_start:batch_start + 4]
            page_paths = []
            for qnum, page in batch:
                pix = doc[page].get_pixmap(matrix=fitz.Matrix(2, 2))
                tmp_path = f"/tmp/resolve_page_{ms_id}_{qnum}.png"
                pix.save(tmp_path)
                page_paths.append(tmp_path)
            labels = [f"Q{qnum}" for qnum, _ in batch]
            result = {"error": "not attempted"}
            for attempt in range(5):
                try:
                    result = llmc.call_gemini(llmc.composite(page_paths, labels), labels)
                except Exception as e:
                    result = {"error": str(e)}
                if "error" not in result:
                    break
                # Free tier is 5 requests/MINUTE, not/day -- a 429 here
                # means "wait", not "stop". A 503/UNAVAILABLE is Google's
                # own transient overload, same treatment -- confirmed
                # real on this account: the exact same request failed
                # with 503 twice in a row, then a plain rerun (no code
                # change) succeeded, so it genuinely is transient, not a
                # request this model can never serve. Back off and retry
                # rather than aborting the whole file on either.
                err_str = str(result["error"])
                if "RESOURCE_EXHAUSTED" in err_str or "429" in err_str or "UNAVAILABLE" in err_str or "503" in err_str:
                    print(f"  transient error, backing off (attempt {attempt+1}/5)...")
                    time.sleep(20 * (attempt + 1))
                    continue
                break
            for p in page_paths:
                os.remove(p)
            if "error" in result:
                doc.close()
                save_cache(cache)
                raise RuntimeError(f"Gemini error on {ms_id}: {result['error']}")
            for qnum, _ in batch:
                letter = result.get(f"Q{qnum}")
                if letter and letter in "ABCDE":
                    file_cache[qnum] = {"answer": letter, "source": "gemini-4page"}
                    gemini_resolved += 1
            time.sleep(13)
        doc.close()

    file_cache["_done"] = True
    save_cache(cache)
    return lw_resolved, gemini_resolved, len(amb)


def main():
    report = json.load(open(REPORT_PATH))
    cache = load_cache()
    total_lw = total_gemini = total_amb = 0
    files_done = 0
    skipped = []
    for entry in report:
        ms_id = entry["msId"]
        try:
            lwc, gc, ambc = resolve_file(ms_id, cache)
        except RuntimeError as e:
            # Already retried 5x with backoff inside resolve_file -- a
            # failure here is a genuinely persistent one for THIS file,
            # not a reason to abandon the other files. This file's
            # partial progress (whatever was cached before the error) is
            # already saved; it isn't marked _done, so a rerun retries
            # just its remaining questions, not the whole file.
            print(f"SKIPPED {entry['title']}: {e}")
            skipped.append(entry["title"])
            continue
        total_lw += lwc
        total_gemini += gc
        total_amb += ambc
        if ambc > 0 or lwc or gc:
            files_done += 1
        print(f"[{files_done}/51] {entry['title'][:60]:60s} lw={lwc} gemini={gc} total_ambiguous={ambc}")
    print(f"\nTOTALS: lightweight={total_lw} gemini={total_gemini} across {files_done} files touched")
    if skipped:
        print(f"SKIPPED {len(skipped)} file(s) after persistent errors (rerun to retry): {skipped}")


if __name__ == "__main__":
    main()
