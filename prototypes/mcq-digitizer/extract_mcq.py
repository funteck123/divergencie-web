#!/usr/bin/env python3
# Parses a Multiple Choice Question Paper + its Mark Scheme (answer key)
# into a structured quiz -- NO LLM anywhere in this tool, and NO OCR
# either (explicit direction after real-world testing showed many real
# QP options are diagrams/tables, not plain text -- rather than guess at
# reading them, each question is rendered as a cropped PNG of exactly
# what's printed on the page, verbatim, at 2x zoom for readability).
#
# Real-world testing (a real CAIE IGCSE Biology Ch5 "Enzymes" MCQ
# worksheet, DivergenCIE's own Drive) found two genuine structural
# problems the first version of this tool didn't anticipate, both fixed
# here:
#   1. QP options are frequently diagrams, tables, or bare A/B/C/D labels
#      with the real content only visible as an image -- text extraction
#      cannot read these. Fix: each question becomes a cropped image of
#      its full stem+options block (whatever it actually contains),
#      never re-typeset text.
#   2. This real MS format never states "5. C" directly -- it reprints
#      the question, then gives a paragraph explanation and says which
#      letters are wrong ("B is incorrect...", "C and D are incorrect
#      as..."). The correct answer is only ever implied by elimination.
#      Fix: parse_ms scans each question's own MS block for every
#      eliminated letter and infers the answer as whichever option letter
#      is never eliminated -- but ONLY when exactly one letter remains;
#      anything else (0 or 2+ remaining) is reported as ambiguous rather
#      than guessed.
#
# A simpler MS format (a bare "5. C" per line, as in
# samples/sample-ms-original.pdf) is also supported directly, since the
# fast path (inline answer right after the question number) is checked
# before falling back to elimination parsing.
import sys
import re
import json
import base64
import fitz

QUESTION_KEYWORD_RE = re.compile(r'^Question\s+(\d{1,2})\.?\s*(.*)$', re.IGNORECASE)
# `\s*` (not `\s+`) deliberately -- a real question heading is often just
# "1." alone on its own line, with the question text starting on the next
# line entirely, not "1. <text>" on one line as first assumed.
# `(?!\d)` guards against a decimal topic/section number like "5.0
# Enzymes" (seen for real in this tool's own cover-page metadata) being
# mistaken for "question 5" -- a real question is never followed
# immediately by another digit.
QUESTION_NUM_RE = re.compile(r'^(\d{1,2})[\.\)]\s*(?!\d)(.*)$')
# A bare option-letter line: "A", "A.", "(A)" and nothing else -- used to
# both detect which option letters exist for a question (some real
# questions only have 3, not 4) and, in parse_ms, to find eliminated
# letters' siblings.
OPTION_LETTER_RE = re.compile(r'^\(?([A-D])\)?\.?$')
# "B is incorrect...", "C and D are incorrect...", "A, B and C are
# incorrect..." -- the real elimination-explanation format. Captures the
# whole letter-list prefix; individual letters are pulled out of it after
# matching, since a single regex group can't repeat a comma list cleanly.
ELIMINATION_RE = re.compile(
    r'^((?:[A-D](?:,\s*|\s+and\s+))*[A-D])\s+(?:is|are)\s+incorrect',
    re.IGNORECASE | re.MULTILINE,
)


def extract_lines(doc):
    """Structured text with font size/weight AND position (page, y0/y1) --
    position is what makes image-cropping and MS block-segmentation
    possible, not just text content."""
    lines = []
    for page_num in range(doc.page_count):
        page = doc[page_num]
        d = page.get_text("dict")
        for block in d.get("blocks", []):
            for line in block.get("lines", []):
                spans = line.get("spans", [])
                text = "".join(s.get("text", "") for s in spans).strip()
                if not text:
                    continue
                size = max((s.get("size", 0) for s in spans), default=0)
                # Real file, real quirk: this source's decorative
                # sub-7pt footer/watermark line ("For more awesome
                # resources, visit us at...") renders anchored to the TOP
                # of the FOLLOWING page rather than the bottom of its own
                # page. Left in, it fooled every question into looking
                # like its content spilled onto the next page, forcing a
                # pointless second crop image for nearly all of them.
                # Real body text in this document runs >=10pt, so 7 is a
                # safe cut with margin either side, not a fudge for one
                # line.
                if size < 7:
                    continue
                bold = any("bold" in s.get("font", "").lower() for s in spans)
                bbox = line.get("bbox", [0, 0, 0, 0])
                lines.append({
                    "text": text, "size": size, "bold": bold,
                    "page": page_num, "y0": bbox[1], "y1": bbox[3],
                })
    return lines


def find_question_starts(lines):
    """Every detected question boundary, in document order: {number,
    inlineText (whatever followed the number on its own line, often
    empty), page, y0}."""
    starts = []
    for line in lines:
        m = QUESTION_KEYWORD_RE.match(line["text"])
        # >= 10.5, not 11: PyMuPDF reports a nominal 11pt heading as
        # 10.98-10.99 in real files (rounding in the PDF's own font
        # metrics, not a bug in this extraction) -- a strict >= 11 silently
        # dropped every heading that came in a hair under it. Real body
        # text tops out at 10.0 here, so 10.5 is a safe cut with margin
        # on both sides, not just a fudge to make one file pass.
        if not m and (line["bold"] or line["size"] >= 10.5):
            m = QUESTION_NUM_RE.match(line["text"])
        if m:
            starts.append({
                "number": m.group(1), "inlineText": (m.group(2) or "").strip(),
                "page": line["page"], "y0": line["y0"],
            })
    return starts


def _pos(page, y0):
    return (page, y0)


def option_letters_in_block(lines, start_pos, end_pos):
    letters = set()
    for line in lines:
        p = _pos(line["page"], line["y0"])
        if start_pos <= p < end_pos:
            m = OPTION_LETTER_RE.match(line["text"])
            if m:
                letters.add(m.group(1).upper())
    return letters


def render_question_images(doc, page_start, y_start, page_end, y_end):
    """Crops the question's stem+options exactly as printed, as one PNG
    per page it spans (almost always one; two only if a question's
    options run past a page break -- returned as a second image rather
    than stitched, since this tool has no image-compositing dependency)."""
    images = []
    if page_start == page_end:
        page = doc[page_start]
        top = max(0, y_start - 4)
        bottom = y_end - 4 if y_end is not None else page.rect.height
        rect = fitz.Rect(0, top, page.rect.width, max(bottom, top + 10))
        pix = page.get_pixmap(clip=rect, matrix=fitz.Matrix(2, 2))
        images.append(pix.tobytes("png"))
    else:
        first_page = doc[page_start]
        rect1 = fitz.Rect(0, max(0, y_start - 4), first_page.rect.width, first_page.rect.height)
        images.append(first_page.get_pixmap(clip=rect1, matrix=fitz.Matrix(2, 2)).tobytes("png"))
        for mid in range(page_start + 1, page_end):
            mid_page = doc[mid]
            images.append(mid_page.get_pixmap(matrix=fitz.Matrix(2, 2)).tobytes("png"))
        if y_end is not None and y_end > 4:
            last_page = doc[page_end]
            rect2 = fitz.Rect(0, 0, last_page.rect.width, y_end - 4)
            images.append(last_page.get_pixmap(clip=rect2, matrix=fitz.Matrix(2, 2)).tobytes("png"))
    return images


def parse_qp(pdf_path):
    doc = fitz.open(pdf_path)
    lines = extract_lines(doc)
    starts = find_question_starts(lines)

    questions = []
    for i, s in enumerate(starts):
        start_pos = _pos(s["page"], s["y0"])
        end_pos = (
            _pos(starts[i + 1]["page"], starts[i + 1]["y0"])
            if i + 1 < len(starts) else _pos(doc.page_count, 0)
        )

        block_lines = [l for l in lines if start_pos <= _pos(l["page"], l["y0"]) < end_pos]
        letters = {
            m.group(1).upper() for l in block_lines
            if (m := OPTION_LETTER_RE.match(l["text"]))
        }

        # Crop to where this question's OWN content actually ends, not to
        # the next question's start position -- a question is very often
        # the last one on its page, and the next question's y0 can be a
        # page or more away with nothing of this question's actually on
        # it. Using that boundary blindly produced a pointless blank
        # trailing image for every such question.
        pages_with_content = sorted(set(l["page"] for l in block_lines)) or [s["page"]]
        page_end = pages_with_content[-1]
        if page_end == s["page"]:
            y_bottom = max((l["y1"] for l in block_lines), default=s["y0"] + 20) + 10
        else:
            y_bottom = max(
                (l["y1"] for l in block_lines if l["page"] == page_end), default=None
            )
            if y_bottom is not None:
                y_bottom += 10

        images = render_question_images(doc, s["page"], s["y0"], page_end, y_bottom)
        images_b64 = [
            "data:image/png;base64," + base64.b64encode(img).decode("ascii")
            for img in images
        ]

        questions.append({
            "questionNumber": s["number"],
            "optionLetters": sorted(letters) if letters else ["A", "B", "C", "D"],
            "images": images_b64,
        })
    doc.close()
    return questions


def parse_ms(pdf_path):
    """Returns (answers: {questionNumber: letter}, ambiguous: [questionNumber]).
    Tries the simple direct-answer format first (a bare letter right after
    the question number, e.g. "5. C"); falls back to elimination parsing
    (real CAIE-style MS with "X is incorrect" explanations) when that
    isn't present. Never guesses when more than one letter -- or zero --
    remain after elimination; those question numbers come back in
    `ambiguous` instead of a wrong answer."""
    doc = fitz.open(pdf_path)
    lines = extract_lines(doc)
    starts = find_question_starts(lines)

    answers = {}
    ambiguous = []
    for i, s in enumerate(starts):
        m = re.match(r'^([A-Da-d])\.?$', s["inlineText"])
        if m:
            answers[s["number"]] = m.group(1).upper()
            continue

        start_pos = _pos(s["page"], s["y0"])
        end_pos = (
            _pos(starts[i + 1]["page"], starts[i + 1]["y0"])
            if i + 1 < len(starts) else _pos(doc.page_count, 0)
        )
        block_lines = [
            l["text"] for l in lines
            if start_pos <= _pos(l["page"], l["y0"]) < end_pos
        ]
        option_letters = option_letters_in_block(lines, start_pos, end_pos) or {"A", "B", "C", "D"}

        eliminated = set()
        block_text = "\n".join(block_lines)
        for em in ELIMINATION_RE.finditer(block_text):
            eliminated.update(re.findall(r'[A-D]', em.group(1)))

        remaining = option_letters - eliminated
        if len(remaining) == 1:
            answers[s["number"]] = remaining.pop()
        else:
            ambiguous.append(s["number"])

    doc.close()
    return answers, ambiguous


def main():
    if len(sys.argv) != 3:
        print("usage: extract_mcq.py <qp_pdf_path> <ms_pdf_path>", file=sys.stderr)
        sys.exit(1)
    qp_path, ms_path = sys.argv[1], sys.argv[2]
    questions = parse_qp(qp_path)
    answers, ambiguous_answers = parse_ms(ms_path)

    result = []
    unmatched = []
    for q in questions:
        correct = answers.get(q["questionNumber"])
        if correct is None:
            unmatched.append(q["questionNumber"])
        result.append({**q, "correctAnswer": correct})

    print(json.dumps({
        "questions": result,
        "unmatchedAnswerKey": unmatched,
        "ambiguousAnswerKey": ambiguous_answers,
    }))


if __name__ == "__main__":
    main()
