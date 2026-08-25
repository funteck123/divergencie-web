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
import io
import fitz
from PIL import Image

QUESTION_KEYWORD_RE = re.compile(r'^Question\s+(\d{1,2})\.?\s*(.*)$', re.IGNORECASE)
# `\s*` (not `\s+`) deliberately -- a real question heading is often just
# "1." alone on its own line, with the question text starting on the next
# line entirely, not "1. <text>" on one line as first assumed.
# `(?!\d)` guards against a decimal topic/section number like "5.0
# Enzymes" (seen for real in this tool's own cover-page metadata) being
# mistaken for "question 5" -- a real question is never followed
# immediately by another digit.
QUESTION_NUM_RE = re.compile(r'^(\d{1,2})[\.\)]\s*(?!\d)(.*)$')
# A heading with NO punctuation at all after the number ("1 For each atom
# of carbon...") -- confirmed real (a savemyexams-sourced MS format).
# Requiring the char right after the number to be an uppercase letter or
# "(" was tried more permissively once (accepting a digit too, for a real
# "32 0.200 mol of a hydrocarbon..." case) and reverted: on a real file
# full of temperature/data-table values ("37 degC", "40 degC", "65 degC"
# etc, each followed somewhere nearby by table-column letters that look
# just like option letters), that broader version matched dozens of
# spurious "questions", corrupting a paper that parsed perfectly before.
# Only ~1 known real case needs the broader form; many real files break
# under it -- not a trade worth making. find_question_starts also
# requires option letters nearby afterward (see the validation pass
# there) as a second layer, but the character class here is doing real
# work too, not just belt-and-suspenders.
QUESTION_BARE_RE = re.compile(r'^(\d{1,2})\s+([A-Z(].*)$')
# The same bare form, but for the rarer real case where the content
# starts with a digit ("32 0.200 mol of a hydrocarbon..."). Kept
# separate from QUESTION_BARE_RE and gated much harder in
# find_question_starts (a length + word-count floor on the captured
# content) -- a plain digit-starting variant of the pattern above matched
# dozens of short numeric table fragments on a different real file.
QUESTION_BARE_DIGIT_RE = re.compile(r'^(\d{1,2})\s+(\d.*)$')
# The number completely ALONE on its own line, with the real question
# text starting on the NEXT line entirely (confirmed real and, after a
# broad sweep of the whole real library, common -- not a rare edge case:
# "2" alone, then "The diagram shows how the molecules..." on the next
# line, was silently merging most of a 27-question paper into question
# 1's block). Gated hard: the line immediately following (not just
# "somewhere nearby") must itself look like the start of a real sentence
# -- confirmed on real false-positive data (a temperature table's bare
# "37" is followed by a stray "C" or another bare digit, never a
# capitalized multi-word sentence).
QUESTION_BARE_ALONE_RE = re.compile(r'^(\d{1,2})$')
# `[A-Z(]` plus common opening-quote characters -- a real question was
# found starting with a curly quote ("'Particles moving very slowly...'"
# -- U+2018) which plain ASCII didn't allow for.
SENTENCE_START_RE = re.compile(r'^[A-Z(‘“"\'].{19,}$')
# Some real papers switch to a genuinely different question format partway
# through ("Section B: ... one or more of the three numbered statements 1
# to 3 may be correct") -- a real, different multiple-response style this
# tool doesn't parse (no plain A-D single answer), already out of scope.
# The problem this alone causes: without a boundary marker of its own,
# the LAST detected Section-A question's crop silently swallowed the
# entire rest of the document, several pages, since nothing told the
# crop logic where Section A's real content actually ends.
SECTION_BREAK_RE = re.compile(r'^Section\s+[A-Z]\b', re.IGNORECASE)
# A bare option-letter line: "A", "A.", "(A)" and nothing else -- used to
# both detect which option letters exist for a question (some real
# questions only have 3, not 4) and, in parse_ms, to find eliminated
# letters' siblings.
OPTION_LETTER_RE = re.compile(r'^\(?([A-D])\)?\.?$')
# Publisher branding/copyright boilerplate seen across multiple real
# source files ("Save My Exams! - The Home of Revision", "Model answers
# are copyright...", "Head to savemyexams.co.uk...", "For more awesome
# resources, visit us at www.savemyexams.co.uk/") -- when a question's
# content spills onto a second page and that page turns out to be ONLY
# this kind of noise (confirmed real: a whole trailing page that's
# nothing but this plus a bare page number), it gets dropped entirely
# rather than stitched in, per explicit direction.
BRANDING_RE = re.compile(
    r'savemyexams|save my exams|model answers are copyright|home of revision',
    re.IGNORECASE,
)
# "B is incorrect...", "C and D are incorrect...", "A, B and C are
# incorrect...", "Answer B is incorrect...", "Hence, answer B is
# incorrect..." -- real MS's use a bare form, an "Answer "-prefixed form,
# and a mid-sentence form with a connector word before it (confirmed on
# two different real subjects: Biology's is always bare and sentence-
# initial, Physics always includes "Answer" and is often preceded by
# "Hence" or similar). `\b` instead of `^` deliberately -- it must match
# wherever in the sentence the letter-clause starts, not just line start.
# Captures the whole letter-list prefix; individual letters are pulled out
# of it after matching, since a single regex group can't repeat a comma
# list cleanly.
ELIMINATION_RE = re.compile(
    r'\b(?:Answer\s+)?((?:[A-D](?:,\s*|\s+and\s+))*[A-D])\s+(?:is|are)\s+(?:therefore\s+)?(?:the\s+)?incorrect',
    re.IGNORECASE,
)
# "Answer B is correct...", "B is correct...", "Hence answer B is
# correct...", "C is the correct answer..." -- a direct positive
# statement, seen for real (Physics MS uses "Answer X is correct",
# Chemistry MS uses "X is the correct answer") alongside elimination
# sentences for the wrong options. Checked first when present: more
# direct than inferring by elimination.
CORRECT_RE = re.compile(
    r'\b(?:Answer\s+)?([A-D])\s+is\s+(?:the\s+correct\s+answer|correct)\b',
    re.IGNORECASE,
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
                    # This document's own raw stream order -- kept
                    # because it's what actually preserves a wrapped
                    # paragraph's own line order correctly (confirmed
                    # real: one file's own y0 coordinates put a
                    # sentence's SECOND wrapped line before its first),
                    # even on the same real files where headings
                    # themselves come out of (page, y0) order and need
                    # position-sorting instead. Different bugs, different
                    # fixes -- this tag lets find_question_starts use
                    # whichever order is actually right for a given check.
                    "raw_idx": len(lines),
                })
    return lines


def find_question_starts(lines):
    """Every detected question boundary, in document order: {number,
    inlineText (whatever followed the number on its own line, often
    empty), page, y0}.

    Font size/bold was tried as the gate for the punctuated "N." form and
    dropped: real files disagree with each other about whether a heading
    is bigger, equal to, or (once, for real) SMALLER than its own body
    text, so no fixed threshold generalizes. The punctuation itself
    ("N." or "N)" at a line's start, never followed by another digit) is
    tight enough on its own -- confirmed across every real file sampled
    so far, no false positives found from dropping the gate.

    Iterates a POSITION-sorted copy of `lines`, not the raw list order --
    confirmed real and serious on one file: PyMuPDF's own block traversal
    order can be completely scrambled relative to visual position (a
    heading number at the true top of a page appeared in list order
    right before a LATER page's content, with that page's own real
    question numbers interleaved out of sequence). The option-letter
    proximity check relies on this position order. But a DIFFERENT real
    file showed the opposite problem for a DIFFERENT check: a long
    question stem's own wrapped second line had a smaller y0 than its
    first line, so position order broke the "is the next line a real
    sentence" check for a bare heading, while raw stream order (which
    reliably preserves a paragraph's own internal line sequence) got it
    right. Each line keeps its original `raw_idx` from extract_lines
    specifically so a check can use whichever order is actually correct
    for it, not just whichever this function iterates in."""
    raw_by_idx = lines
    lines = sorted(lines, key=lambda l: (l["page"], l["y0"]))
    starts = []
    for idx, line in enumerate(lines):
        m = QUESTION_KEYWORD_RE.match(line["text"])
        if not m:
            m = QUESTION_NUM_RE.match(line["text"])
        if m:
            starts.append({
                "number": m.group(1), "inlineText": (m.group(2) or "").strip(),
                "page": line["page"], "y0": line["y0"],
            })
            continue
        # The bare "N text" form (no punctuation at all) is real but
        # riskier -- a body sentence can coincidentally start a line with
        # a number. Only accepted if an option-letter line (A/B/C/D alone)
        # shows up within the next 30 lines, which a coincidental digit
        # never has. (30, not the original 20: a real question's own
        # option letter came in at position 21 -- a complex diagram with
        # a labeled numbered-correspondence table between the stem and
        # its actual A/B/C/D options -- missing detection by one line.)
        m = QUESTION_BARE_RE.match(line["text"])
        # "0" is never a real question number in this corpus (numbering
        # starts at 1) -- excluded here because it's a real, confirmed
        # false-positive source on its own: a graph's y-axis origin label
        # ("0" alone on its own line, repeated once per mini-graph),
        # which coincidentally sits right next to that question's real
        # A/B/C/D sub-graph labels and would otherwise pass the
        # nearby-option-letter check below completely legitimately.
        if m and m.group(1) != "0":
            nearby = lines[idx + 1: idx + 31]
            if any(OPTION_LETTER_RE.match(l["text"]) for l in nearby):
                starts.append({
                    "number": m.group(1), "inlineText": (m.group(2) or "").strip(),
                    "page": line["page"], "y0": line["y0"],
                })
            continue
        # A digit-starting bare heading ("32 0.200 mol of a hydrocarbon
        # undergo complete combustion...") is real too, but MUCH riskier
        # than the letter-starting form -- confirmed on a different real
        # file full of short numeric table fragments ("37 degC", "40
        # degC", "48 minutes") that match the same shape. The
        # distinguishing signal that survived testing: a real question
        # stem is a long, multi-word sentence; a data-table fragment
        # never is. Both a length floor and a word-count floor, not just
        # one -- a short sentence could clear a length-only bar, and a
        # long single "word" (a run-on chemical formula) could clear a
        # word-count-only bar.
        m = QUESTION_BARE_DIGIT_RE.match(line["text"])
        if m:
            content = m.group(2)
            if len(content) >= 25 and len(content.split()) >= 5:
                nearby = lines[idx + 1: idx + 31]
                if any(OPTION_LETTER_RE.match(l["text"]) for l in nearby):
                    starts.append({
                        "number": m.group(1), "inlineText": content.strip(),
                        "page": line["page"], "y0": line["y0"],
                    })
            continue
        m = QUESTION_BARE_ALONE_RE.match(line["text"])
        # A page-footer number is real, dense MS-explanation-text noise
        # this exact bare-alone-digit pattern is defenseless against on
        # its own -- confirmed real: a footer "41" on page 41 of a real
        # 47-page MS sits right next to substantial real prose either
        # way you order lines, so the sentence check alone passed it,
        # silently corrupting the answer key with 6 fake trailing
        # "questions". The general size/bold gate was deliberately
        # dropped earlier for the punctuated form (real files disagree
        # too much about heading-vs-body relative size for one threshold
        # to work) -- but a page-footer number's size has been a
        # consistent 8.0pt across every real file seen in this whole
        # investigation, clearly below any real heading's ~11pt, so a
        # floor specifically here (the riskiest, least-constrained
        # pattern) is a different, narrower, safe bet.
        if m and m.group(1) != "0" and line["size"] >= 9:
            # Two real files disagreed about which "next line" ordering
            # is correct for THIS check: one needs raw stream order (a
            # wrapped sentence's own lines came out of position order);
            # a different one needs position order (this file's heading
            # numbers are their own out-of-stream-order layer, same
            # reason the whole function sorts by position at all). No
            # single ordering satisfies both, so both are tried -- still
            # gated by the same strict sentence check either way, so this
            # doesn't loosen what counts as "looks like a real question
            # start", only which candidate line gets checked against it.
            raw_idx = line["raw_idx"]
            next_in_raw_order = raw_by_idx[raw_idx + 1] if raw_idx + 1 < len(raw_by_idx) else None
            next_in_position_order = lines[idx + 1] if idx + 1 < len(lines) else None
            candidates = [c for c in (next_in_raw_order, next_in_position_order) if c]
            if any(SENTENCE_START_RE.match(c["text"]) for c in candidates):
                nearby = lines[idx + 1: idx + 31]
                if any(OPTION_LETTER_RE.match(l["text"]) for l in nearby):
                    starts.append({
                        "number": m.group(1), "inlineText": "",
                        "page": line["page"], "y0": line["y0"],
                    })

    # Real papers number their questions strictly increasingly (1, 2,
    # 3...). Confirmed a real false-positive class from the bare-number
    # form even with the nearby-option-letter check: a cover page's "Time
    # Allowed: 69 minutes" and a numeric answer choice like "60 cm3" each
    # coincidentally had an option-letter-shaped line within 20 lines.
    # A plain greedy left-to-right "keep if bigger than the last kept"
    # scan is NOT safe here -- confirmed on real data: the cover-page
    # "69" comes before every real question in the document, so a greedy
    # scan locks onto it first and then rejects all 44 real questions
    # (1-44) for being "smaller than 69". Fixed by taking the actual
    # LONGEST strictly-increasing subsequence (standard O(n^2) DP, n is
    # at most a few dozen candidates) -- the real 44-long run of genuine
    # questions correctly outweighs a 2-long run of stray high numbers.
    starts.sort(key=lambda s: (s["page"], s["y0"]))
    n = len(starts)
    lengths = [1] * n
    prev = [-1] * n
    nums = [int(s["number"]) for s in starts]
    for i in range(n):
        for j in range(i):
            # A real MS was found with a real 1-11 sequence, then one
            # stray "85" (a genuine answer VALUE at heading-like size and
            # font, in a spot the earlier page-footer size gate can't
            # touch) tacked onto the end -- LIS without a gap cap has no
            # reason to reject it (11 -> 85 still "increasing"), even
            # though no real paper jumps by dozens between consecutive
            # questions. Capping the allowed step at 20 rejects that
            # specific class without needing a character-level check on
            # what's clearly plausible, heading-shaped text.
            if nums[j] < nums[i] and nums[i] - nums[j] <= 20 and lengths[j] + 1 > lengths[i]:
                lengths[i] = lengths[j] + 1
                prev[i] = j
    if n == 0:
        return []
    best = max(range(n), key=lambda i: lengths[i])
    seq_idx = []
    i = best
    while i != -1:
        seq_idx.append(i)
        i = prev[i]
    seq_idx.reverse()
    return [starts[i] for i in seq_idx]


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


def is_branding_only(page_lines):
    """True when every non-empty line on this page (within a question's
    own block) is either publisher branding/copyright boilerplate or a
    bare page number -- i.e. a trailing page that spilled over with
    nothing a student actually needs to see."""
    if not page_lines:
        return True
    for l in page_lines:
        text = l["text"].strip()
        if not text:
            continue
        if BRANDING_RE.search(text):
            continue
        if re.fullmatch(r'\d{1,3}', text):
            continue
        return False
    return True


def content_lines_excluding_trailing_branding(page_lines):
    """A page can have genuine content followed immediately by publisher
    branding/copyright boilerplate BEFORE the next question starts
    (confirmed real: a question's own content, then the branding banner,
    then a page number, all on the one page) -- is_branding_only() only
    catches a page that's NOTHING but that; this trims just the trailing
    run of it so a crop's bottom edge lands at the real content's own
    last line, not the banner below it. Only trims from the true end
    inward -- if a branding line is followed by more real content (a
    separate, disclosed limitation: that only happens when an in-between
    question's own heading wasn't detected, not something this trim can
    fix), nothing here is touched, since this is not that line's problem
    to solve."""
    ordered = sorted(page_lines, key=lambda l: l["y0"])
    end = len(ordered)
    while end > 0:
        text = ordered[end - 1]["text"].strip()
        if not text or BRANDING_RE.search(text) or re.fullmatch(r'\d{1,3}', text):
            end -= 1
        else:
            break
    return ordered[:end]


def stitch_images_vertically(png_bytes_list, padding=24):
    """Combines multiple page-crop PNGs into ONE image, stacked top to
    bottom in the same order given (document reading order -- the
    earliest page's content first), with a plain white padding gap
    between each so a page-break join never looks like it ran two
    unrelated crops together with no visual separation."""
    if len(png_bytes_list) == 1:
        return png_bytes_list[0]
    imgs = [Image.open(io.BytesIO(b)).convert("RGB") for b in png_bytes_list]
    max_w = max(im.width for im in imgs)
    total_h = sum(im.height for im in imgs) + padding * (len(imgs) - 1)
    canvas = Image.new("RGB", (max_w, total_h), "white")
    y = 0
    for i, im in enumerate(imgs):
        canvas.paste(im, (0, y))
        y += im.height
        if i < len(imgs) - 1:
            y += padding
    buf = io.BytesIO()
    canvas.save(buf, format="PNG")
    return buf.getvalue()


def render_question_image(doc, page_start, y_start, page_end, y_end):
    """Crops the question's stem+options exactly as printed. Almost
    always one page; when a question's own content spans a page break,
    each page's crop is rendered separately (so nothing before y_start
    on the first page or after y_end on the last page leaks in) and then
    combined into a SINGLE image via stitch_images_vertically -- one
    image per question, always, never a list the caller has to know how
    to join itself."""
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
    return stitch_images_vertically(images)


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
        # A "Section B"-style break (a genuinely different question format,
        # already out of scope) has no boundary marker of its own, so
        # without this the LAST Section-A question's block silently ran
        # to the end of the document -- confirmed real, several pages'
        # worth on a real file. Cut the block off at (not including)
        # wherever the FIRST such marker sits, by position rather than
        # whole-page, in case a marker ever shares a page with real
        # content that comes before it.
        section_break_lines = [l for l in block_lines if SECTION_BREAK_RE.match(l["text"])]
        if section_break_lines:
            cutoff_pos = min(_pos(l["page"], l["y0"]) for l in section_break_lines)
            block_lines = [l for l in block_lines if _pos(l["page"], l["y0"]) < cutoff_pos]
            pages_with_content = sorted(set(l["page"] for l in block_lines)) or [s["page"]]
        # Drop trailing pages that turn out to be nothing but publisher
        # branding/copyright boilerplate (confirmed real: a question's
        # content spills onto the next page only because of a footer like
        # "Save My Exams! - The Home of Revision", not real content) --
        # per explicit direction, delete rather than stitch that in.
        while len(pages_with_content) > 1 and is_branding_only(
            [l for l in block_lines if l["page"] == pages_with_content[-1]]
        ):
            pages_with_content = pages_with_content[:-1]
        page_end = pages_with_content[-1]
        last_page_content = content_lines_excluding_trailing_branding(
            [l for l in block_lines if l["page"] == page_end]
        )
        if page_end == s["page"]:
            y_bottom = max((l["y1"] for l in last_page_content), default=s["y0"] + 20) + 10
        else:
            y_bottom = max((l["y1"] for l in last_page_content), default=None)
            if y_bottom is not None:
                y_bottom += 10

        image_bytes = render_question_image(doc, s["page"], s["y0"], page_end, y_bottom)
        image_b64 = "data:image/png;base64," + base64.b64encode(image_bytes).decode("ascii")

        questions.append({
            "questionNumber": s["number"],
            "optionLetters": sorted(letters) if letters else ["A", "B", "C", "D"],
            "image": image_b64,
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
        block_text = "\n".join(block_lines)

        # A direct "X is correct" statement is the strongest signal when
        # present -- use it over elimination inference. Still only trusted
        # when exactly one such statement appears in the block (a second,
        # contradicting one is a real ambiguity, not a coin flip).
        correct_matches = {m.group(1).upper() for m in CORRECT_RE.finditer(block_text)}
        if len(correct_matches) == 1:
            answers[s["number"]] = correct_matches.pop()
            continue

        eliminated = set()
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
