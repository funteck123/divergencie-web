#!/usr/bin/env python3
"""Builds data/mcq-digitizer/full-library/database.json covering ALL 196
QP+MS pairs in the library (not just the 51 image-heavy MS files that
answer-cache/cache.json already covers). For each pair: downloads both
PDFs if not already local, parses the QP into per-question cropped
images (extract_mcq.parse_qp, unmodified), persists those images to disk
(previously only ever existed as ephemeral base64 in an API response),
and resolves each question's correct answer via the same chain used
throughout this project: MS text-parsing first (extract_mcq.parse_ms),
then the shared answer-cache (already has 305 answers for 23 files),
then a fresh lightweight icon-detection / Gemini 4-page-batch pass for
anything still unresolved -- writing any newly-resolved answers back
into the SAME cache file so it stays the one source of truth.

Resumable: skips a pair whose qpId already has a complete record in
database.json. Writes database.json after every paper (not batched) so
an interruption loses nothing already done.

Processes A Levels first (Chemistry/Physics resolve almost entirely via
plain MS text-parsing per earlier findings in this project -- zero LLM
calls needed, fast, real progress banked immediately) before IGCSE
(where the image-based MS files live and Gemini's free quota, already
mostly exhausted from earlier work today, is the real constraint).
"""
import sys
import os
import json
import re
import time
import base64
import difflib

HERE = os.path.dirname(os.path.abspath(__file__))
MCQ_DIR = os.path.dirname(HERE)
REPO_ROOT = os.path.dirname(os.path.dirname(MCQ_DIR))
sys.path.insert(0, MCQ_DIR)
sys.path.insert(0, HERE)

import extract_mcq as em
import lightweight_detect as lw
import llm_composite as llmc
import fitz
import requests

DRIVE_MAP_PATH = os.path.join(REPO_ROOT, "data/mcq-digitizer/drive-map/drive-map.json")
MS_AUDIT_PDFS = os.path.join(REPO_ROOT, "data/mcq-digitizer/ms-audit/pdfs")
FULL_LIB = os.path.join(REPO_ROOT, "data/mcq-digitizer/full-library")
PDFS_DIR = os.path.join(FULL_LIB, "pdfs")
IMAGES_DIR = os.path.join(FULL_LIB, "images")
DATABASE_PATH = os.path.join(FULL_LIB, "database.json")
CACHE_PATH = os.path.join(REPO_ROOT, "data/mcq-digitizer/answer-cache/cache.json")

os.makedirs(PDFS_DIR, exist_ok=True)
os.makedirs(IMAGES_DIR, exist_ok=True)

# ---- Pairing (ported from server.mjs's buildLibrary, same normalization
# rules -- keep this identical to the live server's logic so the database
# and the live picker agree on the same pairs). This copy had drifted out
# of sync with server.mjs's own already-fixed version (confirmed real: 9
# of 196 real papers failed pairing here using the STALE rules below,
# even though server.mjs's own comments document these exact fixes
# already found and applied there -- this copy just never received them).
STOPWORDS = {
    "qp", "ms", "mcq", "unlocked", "ial", "cie", "worksheet", "paper",
    "mark", "scheme", "markscheme", "answer", "answers", "key", "level",
    "alevel", "igcse", "cambridge", "caie", "question", "questions", "pdf",
    # Pairing already happens within one subject's own category folder, so
    # the subject name is redundant for matching -- and a real MS file was
    # found that omits it from its own filename entirely while its QP
    # includes it ("12-Electrolysis...MS...pdf" has no "chemistry" in it
    # at all), which broke an exact token-set match for no real reason.
    "chemistry", "biology", "physics",
}
def normalize_title(name):
    # A real MS file was found versioned as "...MCQ_2-Unlocked.pdf" -- that
    # trailing digit is a version marker with no counterpart in its QP's
    # filename at all (not a duplicate of an existing chapter number, an
    # unrelated one), so plain "mcq" stopword removal still left a stray
    # "2" token breaking the match. Strip the whole "mcq_N"/"mcqN" unit
    # together, before tokenizing.
    name = re.sub(r'mcq[_\s]?\d+', ' mcq ', name, flags=re.IGNORECASE)
    tokens = re.sub(r'[^a-z0-9]+', ' ', name.lower()).split()
    tokens = [t for t in tokens if t and t not in STOPWORDS]
    # A lone "s" is an apostrophe artifact, not content -- real pairing bug
    # found on real data: one filename spells a chapter "hesss" (no
    # separator) while a DIFFERENT real file's MS counterpart spells it
    # "hess_s" (an underscore where the apostrophe was), splitting into two
    # tokens "hess"+"s" that never matched as one token either way.
    # Dropping the lone "s" fixes the "hess_s" side but NOT the "hesss"
    # side (a single squashed word, not decomposable to "hess"+"s") --
    # confirmed real, that specific pair still needs the fuzzy fallback
    # below even with this filter in place.
    tokens = [t for t in tokens if t != "s"]
    # A set, not the raw list -- an MS filename versioned as
    # "...MCQ_1-Unlocked.pdf" contributes an extra "1" token beyond what
    # its QP counterpart has (e.g. a chapter already numbered "25.1"), and
    # joining a sorted LIST (not a deduplicated set) produces a different
    # string for one "1" vs two, even though the extra one carries no real
    # content difference.
    return " ".join(sorted(set(tokens)))

def display_title_of(name):
    return re.sub(r'\s*[-_(]*\s*(QP|MS)\)?\s*\.pdf$', '', name, flags=re.IGNORECASE).strip()

# Real source-library naming inconsistencies confirmed by hand across a
# full audit of every "no matching MS" failure: the exact-match above
# requires the normalized token SET to match exactly, with zero tolerance
# for how two different people happened to type the same file's name.
# Two specific inconsistency classes recur:
#
# (1) A stray Google-Drive dedup suffix on just one of the pair's two
# files ("...MS-MCQ_1-Unlocked.pdf", confirmed real on 3+ files -- a
# re-upload that Drive auto-renamed to avoid a collision), or an
# apostrophe transliterated two different ways across the two files
# ("Hess's" -> "hesss" in one filename, "Hess_s" -> two separate tokens
# "hess"/"s" in the other). Both produce a near-miss: the two normalized
# strings are almost identical, off by one stray token. A fuzzy string
# ratio (not a token-set difference -- confirmed real that a token-set
# size-2 threshold was too loose for the apostrophe case's actual token
# count) reliably separates this from a genuinely different pair: every
# real near-miss confirmed above 0.85, the closest real distinct-pair
# collision found in this whole corpus (a same-chapter, different-
# worksheet-number file) scored 0.588.
#
# (2) The QP and MS were independently given a genuinely DIFFERENT topic
# word by whoever uploaded them (confirmed real: "11.1-redox" QP paired
# against a real "11.1-Electrochemistry" MS -- an upstream content-
# labeling inconsistency, not a typo). No string-similarity measure can
# safely tell this apart from a wrong pairing (it scores 0.667, closer to
# a genuine wrong-pair collision's 0.588 than to a real near-miss's
# 0.85+) -- confirmed real can only be resolved by falling back to the
# leading chapter-number prefix ("11.1") shared by both filenames, and
# only when exactly one MS in the same folder carries that same prefix
# (never picked when more than one candidate ties, to avoid guessing).
FUZZY_MATCH_THRESHOLD = 0.85

def _chapter_prefix(name):
    m = re.match(r'^(\d+(?:\.\d+)?)[\s._-]', name)
    return m.group(1) if m else None

def _find_ms_match(qp_name, ms_list, ms_by_key):
    """Exact normalized match first, then the two confirmed-real fallback
    strategies above, in order. Returns the matched ms dict or None."""
    exact = ms_by_key.get(normalize_title(qp_name))
    if exact:
        return exact

    qp_norm = normalize_title(qp_name)
    scored = sorted(
        ((difflib.SequenceMatcher(None, qp_norm, normalize_title(ms["name"])).ratio(), ms) for ms in ms_list),
        key=lambda pair: pair[0], reverse=True,
    )
    if scored and scored[0][0] >= FUZZY_MATCH_THRESHOLD:
        return scored[0][1]

    qp_prefix = _chapter_prefix(qp_name)
    if qp_prefix:
        prefix_matches = [ms for ms in ms_list if _chapter_prefix(ms["name"]) == qp_prefix]
        if len(prefix_matches) == 1:
            return prefix_matches[0]
    return None

def build_pairs():
    raw = json.load(open(DRIVE_MAP_PATH))
    pairs = []
    # A Levels first: resolves almost entirely via text-parsing, banks
    # fast real progress before the Gemini-hungry IGCSE files.
    board_order = ["A Levels", "IGCSE"]
    for board in board_order:
        if board not in raw:
            continue
        for subject, cats in raw[board].items():
            for category, files in cats.items():
                qp_list = files.get("QP", [])
                ms_list = files.get("MS", [])
                ms_by_key = {normalize_title(f["name"]): f for f in ms_list}
                for qp in qp_list:
                    ms = _find_ms_match(qp["name"], ms_list, ms_by_key)
                    pairs.append({
                        "board": board, "subject": subject, "category": category,
                        "title": display_title_of(qp["name"]),
                        "qpId": qp["id"], "qpName": qp["name"],
                        "msId": ms["id"] if ms else None,
                        "msName": ms["name"] if ms else None,
                    })
    return pairs


def download(file_id, dest_path):
    if os.path.exists(dest_path) and os.path.getsize(dest_path) > 0:
        return True
    r = requests.get(
        f"https://drive.google.com/uc?export=download&id={file_id}",
        headers={"User-Agent": "Mozilla/5.0"}, timeout=60,
    )
    if r.status_code != 200 or r.content[:5] != b"%PDF-":
        return False
    open(dest_path, "wb").write(r.content)
    return True


def resolve_pdf_path(file_id, prefer_dir=MS_AUDIT_PDFS):
    """MS files: reuse ms-audit/pdfs if already downloaded there;
    otherwise download into full-library/pdfs. QP files always go to
    full-library/pdfs (never downloaded anywhere before this script)."""
    existing = os.path.join(prefer_dir, f"{file_id}.pdf")
    if os.path.exists(existing) and os.path.getsize(existing) > 0:
        return existing
    dest = os.path.join(PDFS_DIR, f"{file_id}.pdf")
    return dest if download(file_id, dest) else None


def load_json(path, default):
    if os.path.exists(path):
        return json.load(open(path))
    return default


def save_json_atomic(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + ".tmp"
    json.dump(data, open(tmp, "w"), indent=2)
    os.replace(tmp, path)


def save_question_images(qp_id, questions):
    # extract_mcq.parse_qp returns ONE stitched image per question under
    # "image" (singular) -- this used to be a list under "images" before
    # this session's crop-stitching consolidation, a schema this function
    # never got updated for; calling it as written would KeyError the
    # instant a real rebuild ran. Also drops the old "skip if the file
    # already exists" check -- appropriate for an incremental patch run,
    # but wrong for a full rebuild meant to replace every crop with this
    # session's fixed version: an existing file at this path is exactly
    # the STALE pre-fix image a rebuild exists to replace, not a reason
    # to keep it.
    img_dir = os.path.join(IMAGES_DIR, qp_id)
    os.makedirs(img_dir, exist_ok=True)
    for q in questions:
        b64 = q["image"].split(",", 1)[1]
        rel_path = f"data/mcq-digitizer/full-library/images/{qp_id}/q{q['questionNumber']}.png"
        abs_path = os.path.join(REPO_ROOT, rel_path)
        open(abs_path, "wb").write(base64.b64decode(b64))
        q["imagePaths"] = [rel_path]
        del q["image"]
    return questions


def ambiguous_with_pages(pdf_path):
    """Same logic as answer_resolver/resolve_ambiguous.py's function of
    the same name -- duplicated here (not imported) because that
    module's version is hardwired to the 51-file report/PDFS_DIR context;
    this one just needs the pure page-mapping given any MS pdf path."""
    doc = fitz.open(pdf_path)
    lines = em.extract_lines(doc)
    starts, _quasi = em.find_question_starts(lines, doc)
    results = {}
    for i, s in enumerate(starts):
        m = re.match(r'^([A-Da-d])\.?$', s["inlineText"])
        if m:
            continue
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
        page_counts = {}
        for l in block_lines:
            page_counts[l["page"]] = page_counts.get(l["page"], 0) + len(l["text"])
        best_page = max(page_counts, key=page_counts.get) if page_counts else s["page"]
        results[s["number"]] = best_page
    doc.close()
    return results


def resolve_remaining(ms_id, ms_path, needed_qnums, cache):
    """needed_qnums: question numbers with no text-parsing answer and no
    existing cache entry. Tries lightweight per-question, then Gemini in
    4-page batches for whatever's left. Same retry/backoff pattern as
    resolve_ambiguous.py. Returns nothing -- mutates cache in place and
    saves it."""
    if not needed_qnums:
        return
    amb_pages = ambiguous_with_pages(ms_path)
    file_cache = cache.setdefault(ms_id, {})
    gemini_queue = []
    for qnum in needed_qnums:
        page = amb_pages.get(qnum)
        if page is None:
            continue  # MS has no block for this question number at all
        try:
            r = lw.detect_answer(ms_path, page)
        except Exception:
            r = None
        # idx < 4 is a hard second gate, not redundant with r["plausible"]
        # -- this tool only ever supports A-D, and a real bug (an
        # out-of-bounds "E" answer) already reached the database once
        # through this exact path despite lightweight_detect.py's own
        # bound being intended to prevent it. Never trust a single layer
        # for a value that flows straight into a graded answer.
        if r and r["greenCount"] == 1 and r["plausible"] and r["markOrder"].index("green") < 4:
            idx = r["markOrder"].index("green")
            file_cache[qnum] = {"answer": chr(65 + idx), "source": "lightweight"}
        else:
            gemini_queue.append((qnum, page))
    save_json_atomic(CACHE_PATH, cache)

    if gemini_queue:
        doc = fitz.open(ms_path)
        for batch_start in range(0, len(gemini_queue), 4):
            batch = gemini_queue[batch_start:batch_start + 4]
            page_paths = []
            for qnum, page in batch:
                pix = doc[page].get_pixmap(matrix=fitz.Matrix(2, 2))
                tmp_path = f"/tmp/fulldb_page_{ms_id}_{qnum}.png"
                pix.save(tmp_path)
                page_paths.append(tmp_path)
            labels = [f"Q{qnum}" for qnum, _ in batch]
            result = {"error": "not attempted"}
            for attempt in range(4):
                try:
                    result = llmc.call_gemini(llmc.composite(page_paths, labels), labels)
                except Exception as e:
                    result = {"error": str(e)}
                if "error" not in result:
                    break
                err_str = str(result["error"])
                if any(x in err_str for x in ("RESOURCE_EXHAUSTED", "429", "UNAVAILABLE", "503")):
                    time.sleep(15 * (attempt + 1))
                    continue
                break
            for p in page_paths:
                os.remove(p)
            if "error" not in result:
                for qnum, _ in batch:
                    letter = result.get(f"Q{qnum}")
                    if letter and letter in "ABCDE":
                        file_cache[qnum] = {"answer": letter, "source": "gemini-4page"}
                save_json_atomic(CACHE_PATH, cache)
                time.sleep(10)
            else:
                doc.close()
                raise RuntimeError(f"Gemini persistent error on {ms_id}: {result['error']}")
        doc.close()


def main(defer_llm=False):
    pairs = build_pairs()
    # defer_llm=True: another process (resolve_ambiguous.py) is
    # concurrently reading/writing answer-cache/cache.json for the
    # original 51-file set -- a read-modify-write race on that file
    # would silently lose one process's progress. In this mode we never
    # touch cache.json at all (not even a read): anything not resolved
    # by MS text-parsing alone is left unresolved for now and patched in
    # later by patch_unresolved() once the other process has exited.
    cache = {} if defer_llm else load_json(CACHE_PATH, {})
    db = load_json(DATABASE_PATH, [])
    done_qp_ids = {p["qpId"] for p in db}

    stats = {"papers_done": 0, "questions": 0, "images": 0,
              "text-parsing": 0, "lightweight": 0, "gemini-4page": 0, "unresolved": 0}
    failures = []
    gemini_dead = False  # once True, stop attempting Gemini for the rest of the run

    for pair in pairs:
        qp_id, ms_id, title = pair["qpId"], pair["msId"], pair["title"]
        if qp_id in done_qp_ids:
            continue
        if not ms_id:
            failures.append({"title": title, "qpId": qp_id, "reason": "no matching MS"})
            continue

        qp_path = resolve_pdf_path(qp_id, prefer_dir=PDFS_DIR)
        if not qp_path:
            failures.append({"title": title, "qpId": qp_id, "reason": "QP download failed"})
            continue
        ms_path = resolve_pdf_path(ms_id, prefer_dir=MS_AUDIT_PDFS)
        if not ms_path:
            failures.append({"title": title, "qpId": qp_id, "msId": ms_id, "reason": "MS download failed"})
            continue

        try:
            questions = em.parse_qp(qp_path)
            ms_answers, ms_ambiguous = em.parse_ms(ms_path)
        except Exception as e:
            failures.append({"title": title, "qpId": qp_id, "reason": f"parse error: {e}"})
            continue

        # What still needs resolving after text-parsing + existing cache.
        file_cache = cache.get(ms_id, {})
        needed = [
            q["questionNumber"] for q in questions
            if q["questionNumber"] not in ms_answers and q["questionNumber"] not in file_cache
        ]
        if needed and not gemini_dead and not defer_llm:
            try:
                resolve_remaining(ms_id, ms_path, needed, cache)
            except RuntimeError as e:
                print(f"  Gemini exhausted/failing persistently ({e}) -- continuing with lightweight+text-parsing only for remaining papers")
                gemini_dead = True
            file_cache = cache.get(ms_id, {})

        for q in questions:
            qnum = q["questionNumber"]
            if qnum in ms_answers:
                q["correctAnswer"] = ms_answers[qnum]
                q["source"] = "text-parsing"
            elif qnum in file_cache:
                q["correctAnswer"] = file_cache[qnum]["answer"]
                q["source"] = file_cache[qnum]["source"]
            else:
                q["correctAnswer"] = None
                q["source"] = None
            stats[q["source"] or "unresolved"] += 1
            stats["questions"] += 1

        questions = save_question_images(qp_id, questions)
        stats["images"] += sum(len(q["imagePaths"]) for q in questions)

        db.append({
            "qpId": qp_id, "msId": ms_id, "board": pair["board"], "subject": pair["subject"],
            "title": title, "questions": questions,
        })
        save_json_atomic(DATABASE_PATH, db)
        stats["papers_done"] += 1
        print(f"[{stats['papers_done']}] {pair['board']}/{pair['subject']}: {title[:55]:55s} "
              f"({len(questions)}q, gemini_dead={gemini_dead})")

    save_json_atomic(os.path.join(FULL_LIB, "failures.json"), failures)
    readme = f"""# Full mcq-digitizer library database

Built {time.strftime('%Y-%m-%d')}. Covers all {len(pairs)} QP+MS pairs found
in data/mcq-digitizer/drive-map/drive-map.json (Worksheets/MCQ only, per
the project's established scope).

## Progress
- Papers fully processed: {stats['papers_done']} / {len(pairs)}
- Total questions: {stats['questions']}
- Total images saved: {stats['images']}
- Resolution source breakdown:
  - text-parsing (MS states/implies the answer directly, no LLM/image work): {stats['text-parsing']}
  - lightweight (no-LLM icon-color detection): {stats['lightweight']}
  - gemini-4page (LLM fallback, batched 4 pages/call): {stats['gemini-4page']}
  - unresolved (none of the above could determine an answer): {stats['unresolved']}
- Failures (download/parse/no-matching-MS): {len(failures)} -- see failures.json

## Files
- `database.json` -- array of `{{qpId, msId, board, subject, title, questions: [{{questionNumber, optionLetters, imagePaths, correctAnswer, source}}]}}`
- `images/<qpId>/q<N>_<i>.png` -- each question's cropped page image(s), persisted to disk (previously only ever existed as ephemeral base64 in an API response)
- `pdfs/<id>.pdf` -- downloaded QP/MS PDFs not already present in ms-audit/pdfs/
- `failures.json` -- papers that couldn't be processed and why
"""
    open(os.path.join(FULL_LIB, "README.md"), "w").write(readme)
    print("\n" + readme)


def patch_unresolved():
    """Phase 2: run once resolve_ambiguous.py (the other process sharing
    cache.json) has exited. Walks database.json for any question left
    with source=None from a defer_llm=True Phase 1 run, resolves it via
    the shared cache / lightweight / Gemini chain, and patches the
    record in place -- does NOT re-parse the QP or re-save images, only
    fills in answers, so it's fast regardless of how many papers Phase 1
    already wrote."""
    db = load_json(DATABASE_PATH, [])
    cache = load_json(CACHE_PATH, {})
    gemini_dead = False
    patched = {"lightweight": 0, "gemini-4page": 0, "still-unresolved": 0}

    for paper in db:
        ms_id = paper["msId"]
        unresolved_qnums = [q["questionNumber"] for q in paper["questions"] if q["source"] is None]
        if not unresolved_qnums:
            continue
        ms_path = os.path.join(MS_AUDIT_PDFS, f"{ms_id}.pdf")
        if not os.path.exists(ms_path):
            ms_path = os.path.join(PDFS_DIR, f"{ms_id}.pdf")
        if not os.path.exists(ms_path):
            patched["still-unresolved"] += len(unresolved_qnums)
            continue

        file_cache = cache.get(ms_id, {})
        still_needed = [q for q in unresolved_qnums if q not in file_cache]
        if still_needed and not gemini_dead:
            try:
                resolve_remaining(ms_id, ms_path, still_needed, cache)
            except RuntimeError as e:
                print(f"  Gemini exhausted/failing persistently ({e}) -- stopping Gemini fallback for remaining papers")
                gemini_dead = True
            file_cache = cache.get(ms_id, {})

        changed = False
        for q in paper["questions"]:
            if q["source"] is not None:
                continue
            entry = file_cache.get(q["questionNumber"])
            if entry:
                q["correctAnswer"] = entry["answer"]
                q["source"] = entry["source"]
                patched[entry["source"]] = patched.get(entry["source"], 0) + 1
                changed = True
            else:
                patched["still-unresolved"] += 1
        if changed:
            save_json_atomic(DATABASE_PATH, db)
        print(f"patched {paper['title'][:55]:55s} still_unresolved_in_file={sum(1 for q in paper['questions'] if q['source'] is None)}")

    print(f"\nPATCH TOTALS: {patched}")


if __name__ == "__main__":
    if "--patch" in sys.argv:
        patch_unresolved()
    else:
        main(defer_llm="--defer-llm" in sys.argv)
