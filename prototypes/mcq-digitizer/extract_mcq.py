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
from PIL import Image, ImageDraw, ImageFont

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
# Greek letters included alongside A-Z/( -- confirmed real, TKT-0238: a
# genuine question stem can start with one ("11 β-carotene is
# responsible for..."), which the plain A-Z class rejected outright,
# dropping the whole question (its own real A-D options were later in
# its own scope, never even reached because this line never registered
# as a candidate start at all). Common exam Greek letters (α-particle,
# β-decay, γ-ray, Δ for a change in quantity) are real, not
# a hypothetical -- the ranges below cover the full Greek alphabet rather
# than an enumerated subset, since any of them is equally plausible at
# the start of a real stem and there's no safe way to predict which
# subset a future real paper will use.
QUESTION_BARE_RE = re.compile(r'^(\d{1,2})\s+([A-Z(Α-Ωα-ω].*)$')
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
# A narrower sibling of SENTENCE_START_RE, capital letters ONLY -- used
# solely by _stem_with_continuation to decide whether a candidate's next
# line is someone ELSE's real sentence rather than its own continuation.
# The broader class above deliberately allows "(" as a real sentence's own
# opening character, but that turned out wrong for THIS specific check:
# confirmed real, a genuine continuation line can itself be a chemical
# equation that happens to start with "(" ("(CH3)3SiCl + C2H5O- -> ..."),
# which isn't a fresh sentence at all -- using the broader class here
# wrongly blocked a real recovery (CAIE IAL Chemistry "20.2 Intro to
# Organic Chemistry" Q42). A real, unrelated question's stem starting
# immediately after a short label is reliably capital-letter prose, not
# formula notation, so narrowing to capitals only is what actually
# distinguishes "someone else's real sentence" from "my own equation".
NEW_SENTENCE_CAPITAL_RE = re.compile(r'^[A-Z].{19,}$')
# Marks the transition into a real CAIE "Section B" (statement-format,
# see _has_statement_markers) block. Without a boundary marker of its
# own, the LAST detected Section-A question's crop silently swallowed
# several pages of the following section, since nothing told the crop
# logic where Section A's real content actually ends. Anchored to match
# the WHOLE line, not just its prefix -- confirmed real and reported
# live by a user: "Section X of dam" and "Section Y of dam" (ordinary
# physics diagram labels, nothing to do with exam sections at all) are
# a genuine, coincidental collision with a prefix-only match, and
# silently truncated that question's own crop right there. A real
# section marker's own line is ALWAYS just "Section A"/"Section B" and
# nothing else (confirmed against real source PDFs); a full-line anchor
# is what actually distinguishes the two, not the prefix.
SECTION_BREAK_RE = re.compile(r'^Section\s+[A-Z]$', re.IGNORECASE)
# A bare option-letter line: "A", "A.", "(A)" and nothing else -- used to
# both detect which option letters exist for a question (some real
# questions only have 3, not 4) and, in parse_ms, to find eliminated
# letters' siblings.
OPTION_LETTER_RE = re.compile(r'^\(?([A-D])\)?\.?$')
# Some real files put the option letter and its text on ONE merged line
# ("A X has a larger thermal capacity than Y.") instead of the letter
# alone on its own line -- confirmed real on CAIE IGCSE Physics Ch2.2 Q17,
# where OPTION_LETTER_RE alone silently produced optionLetters=['D'] even
# though the crop clearly shows options A-D, so the quiz UI rendered only
# a single clickable "D" button for a question with 4 real choices. Used
# only inside option_letters_in_block's strict-sequence scan below, never
# standalone, since a bare "letter + whitespace" match would otherwise
# false-positive on any ordinary sentence starting with the word "A ".
OPTION_LETTER_MERGED_RE = re.compile(r'^\(?([A-D])\)?[.):]?\s+\S')
# A different real zigzag layout: each option's own VALUE line ends with
# the NEXT option's letter trailing at the end ("0.5 %           B",
# "0.8 %           C", ...), not the letter's own line at all -- confirmed
# real on CAIE A Level Physics Ch1 "Measurement Techniques" Q44, where
# only the first, isolated "A" ever matched and B/C/D were silently
# dropped even though the crop clearly shows all 4 options on their own
# visual row. Requires a wide (>=3 space) gap before the letter -- this
# is physics content, where a real measurement is very often followed by
# a genuine single-letter UNIT symbol with a single natural space ("50
# A" for amps, similarly N/V/W/J...); the real column-alignment gap
# measured on the confirmed case above is 11 spaces, nothing like a
# natural unit separator, so a wide-gap floor is what actually
# distinguishes the two rather than banning trailing letters outright.
OPTION_LETTER_TRAILING_RE = re.compile(r'\S\s{3,}([A-D])$')
# Any single uppercase letter alone on its own line, not just A-D -- used
# as a noise signal (see option_letters_in_block).
SINGLE_LETTER_RE = re.compile(r'^\(?([A-Z])\)?\.?$')
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
# list cleanly. Also accepts "X is NOT correct" as an equivalent phrasing
# to "X is incorrect" (confirmed real, same word choice used
# interchangeably across different worksheets of the same source: "A is
# not correct as methane is a gas...").
ELIMINATION_RE = re.compile(
    r'\b(?:Answer\s+)?((?:[A-D](?:,\s*|\s+and\s+))*[A-D])\s+(?:is|are)\s+(?:therefore\s+)?'
    r'(?:not\s+correct|(?:the\s+)?incorrect)',
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
# "Cell A can be recognized as a palisade mesophyll cell..." -- a real,
# explicit, unambiguous positive statement (often prefixed with a checkmark
# bullet) that CORRECT_RE's "is correct"/"is the correct answer" phrasing
# doesn't cover. Confirmed real: CAIE IGCSE Biology "Plant Nutrition"
# Worksheet 1 Q12 states exactly this and nothing else, and was left
# unresolved despite the answer being right there in the text.
RECOGNIZED_RE = re.compile(
    r'\b([A-D])\s+can\s+be\s+recognized\s+as\b',
    re.IGNORECASE,
)
# A question stem phrased as "Which statement is NOT correct?" (or "...is
# NOT true?") flips which polarity of explanation sentence actually names
# the MCQ's own answer. For a normal "which is correct" question, an MS
# explains each WRONG option as "X is incorrect" (elimination, leaving the
# one right answer) and may directly state "X is correct" for the right
# one. For a "which is NOT correct" question, the MS instead fact-checks
# each option's own claim -- "Statement D is correct [as a fact]" for
# every option that's a TRUE statement, and "A is the incorrect statement"
# for the one that's false -- and it's the FALSE one, explicitly labeled
# "incorrect", that is the actual MCQ answer. Confirmed real and
# confidently WRONG without this check: a real MS says outright "A is the
# incorrect statement as methane is a gas and not a liquid", i.e. the MS
# itself names A as the answer in plain language, yet naively matching
# CORRECT_RE's "X is correct" against the SAME block also matches
# "Statement D is correct" (a fact-check of D's own claim, not the MCQ
# answer) and returns D with false confidence, silently overriding the
# MS's own explicit statement of the real answer (CAIE IGCSE Chemistry
# "Ch10 Carbon Dioxide & Methane" Worksheet 1 Q3, and confirmed to recur
# on at least 2 more worksheet-1/13/20 style repeats of the exact same
# question format in the same MS).
NEGATED_QUESTION_RE = re.compile(r'\bnot\s+correct\b|\bnot\s+true\b', re.IGNORECASE)
# A decorative bullet glyph a mark scheme's own PDF font renders before
# each explanation line -- sometimes maps to a real Unicode checkmark
# (U+2713/U+2714), sometimes to a raw Private-Use-Area codepoint the font's
# cmap never resolved (U+E000-U+F8FF, confirmed real: U+F0FC in a Wingdings-
# style embedded font). Purely decorative either way, but confirmed real
# and severe when it's glued directly onto a REAL question number with no
# separating space ("2.  The diagram shows..."): every heading regex
# in this file requires the line to START with a digit, so the leading
# glyph silently defeated every one of them and the whole question became
# invisible to boundary detection, not just unresolved (CAIE IGCSE Biology
# "Human Nutrition" Worksheet 1 Q2).
LEADING_DECORATIVE_GLYPH_RE = re.compile(r'^[•✓✔-]+')


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
                text = LEADING_DECORATIVE_GLYPH_RE.sub("", text)
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
                x0, y0, x1, y1 = bbox
                if page.rotation != 0:
                    # get_text("dict") returns bbox coordinates in the
                    # PRE-rotation (raw mediabox) frame, not the rotated
                    # frame page.rect describes -- confirmed real on a
                    # rotation=270 Practical-paper MS where a heading's
                    # raw x0 (74.8, "left margin") actually sits near the
                    # visual RIGHT edge once rotation is applied, and a
                    # raw y0 (777) exceeded the page's own rotated height
                    # (595) entirely. Any position heuristic (x0<100 for
                    # "left margin", y0 ordering for reading order) is
                    # meaningless without correcting for this first.
                    m = page.rotation_matrix
                    corners = [fitz.Point(x0, y0) * m, fitz.Point(x1, y1) * m,
                               fitz.Point(x0, y1) * m, fitz.Point(x1, y0) * m]
                    xs = [p.x for p in corners]
                    ys = [p.y for p in corners]
                    x0, y0, x1, y1 = min(xs), min(ys), max(xs), max(ys)
                lines.append({
                    "text": text, "size": size, "bold": bold,
                    "page": page_num, "y0": y0, "y1": y1, "x0": x0,
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


def _stem_with_continuation(lines, idx, content, max_lines=8):
    """Extends a bare heading's own first-line `content` with however many
    of its immediately following lines are plainly the same sentence
    wrapping onward rather than a new candidate of their own -- confirmed
    real and, once looked for, common: isotope/nuclide notation ("The
    1H3+ ion...", where the superscript "3" and subscript "1" render as
    their own tiny fragment) and ordinary word-wrap alike can leave a real
    question's OWN first line far short of the 20/25-char length floors
    below, even though the full stem clearly clears them once enough of
    its own following lines are included. A single extra line covers most
    real cases ("42 The 1H3" + "+ ion was first characterised..." --
    confirmed real, CAIE IAL Chemistry "2.1 Atomic Structure" Q42) but not
    all: heavier nuclide notation can wrap across many short fragments in
    a row ("7  The isotope" / "Rn" / "decays in a sequence of emissions to
    form the isotope" / "Pb." / "At each stage" / "of the decay
    sequence..." -- confirmed real, CAIE A Level Physics "Ch11 Particle
    Physics" Worksheet 1 Q7, silently dropped entirely by a one-line
    extension). Bounded at `max_lines` so a genuinely broken heading can't
    merge indefinitely into unrelated later content.

    Stops merging, line by line, the moment a line doesn't itself look
    like a heading, a bare digit, or an option letter -- a real short
    table-fragment's own next line is reliably ANOTHER short fragment or
    a stray letter, never a full sentence, so this doesn't relax what the
    floor is actually filtering for.

    Also stops the moment a line reads as the START of a brand new,
    complete, capitalized sentence (NEW_SENTENCE_CAPITAL_RE) -- confirmed
    real and severe without this guard: merging past it once reintroduced
    the EXACT original false positive this whole length floor exists to
    prevent (CAIE A Level Physics Ch4 "Moments" Q42's own force-diagram
    label "45 N", content="N"). There, the very next line is a genuine
    new sentence belonging to a DIFFERENT, already-open question's own
    body text ("Which of the following describes the resultant force..."),
    not a continuation of "N" at all. A real wrapped continuation reads as
    the tail of the SAME clause and essentially never starts a fresh
    capitalized sentence of its own (it starts mid-clause: "+ ion was
    first characterised...", "always involved in...", "P" alone, "Rn") --
    that grammatical shape, not just line length, is what actually
    separates a real split stem from a coincidental short label followed
    by someone else's real content."""
    for j in range(idx + 1, min(idx + 1 + max_lines, len(lines))):
        nxt = lines[j]["text"]
        if (
            QUESTION_KEYWORD_RE.match(nxt) or QUESTION_NUM_RE.match(nxt)
            or QUESTION_BARE_RE.match(nxt) or QUESTION_BARE_DIGIT_RE.match(nxt)
            or QUESTION_BARE_ALONE_RE.match(nxt) or OPTION_LETTER_RE.match(nxt)
            or NEW_SENTENCE_CAPITAL_RE.match(nxt)
            # A "Field:" label -- confirmed real and severe without this
            # guard: multi-line merging otherwise chained together several
            # short cover-page metadata labels ("MS" + "Level:" + "A
            # Level" + "Subject:"...), none individually long enough or
            # capitalized-sentence-shaped enough to trip the other guards,
            # until their combined length coincidentally cleared the
            # floor -- inventing a phantom "question 1" pointing at this
            # tool's own DivergenCIE cover page (CAIE A Level Physics
            # "Ch1 Measurement Techniques" Worksheet 1's own MS, where the
            # title itself wraps as "...Worksheet" / "1 MS"). A real
            # question's own wrapped continuation is never a bare
            # "Label:" field on its own line.
            or nxt.rstrip().endswith(":")
        ):
            break
        content = (content + " " + nxt).strip()
    return content


def _is_tick_row(lines, idx, tolerance=3, min_siblings=2):
    """True when 2+ OTHER bare 1-2 digit lines sit within `tolerance`
    y-points of this one, on the same page -- a ruler/table tick-mark
    row (e.g. a "1  2  3" cm scale), not a real question-number heading.
    Confirmed real, high-severity bug: a ruler diagram's own "2" cm-mark
    label (18pt -- comfortably clearing the existing size>=9 floor,
    which only ever guarded against the OPPOSITE direction, a small
    footer number) got accepted as a genuine second question start,
    splitting one real question (a feather-length reading question) into
    two broken fragments -- the first truncated right at the ruler with
    no options at all, the second re-showing part of the ruler followed
    by the real options that should have belonged to the first. `lines`
    is position-sorted, so real siblings of a tick-row candidate sit
    within a few index positions of it; a small window is enough."""
    cur = lines[idx]
    siblings = 0
    for j in range(max(0, idx - 10), min(len(lines), idx + 11)):
        if j == idx:
            continue
        other = lines[j]
        if other["page"] != cur["page"]:
            continue
        if abs(other["y0"] - cur["y0"]) > tolerance:
            continue
        if re.match(r'^\d{1,2}$', other["text"]):
            siblings += 1
            if siblings >= min_siblings:
                return True
    return False


def _is_table_value_row(lines, idx, tolerance=3):
    """True when a real OPTION_LETTER_RE line ("A", "B"...) sits within
    `tolerance` y-points of this bare 1-2 digit candidate, on the same
    page -- a real option's own data-table row ("A | 160 | 60 | 80"),
    not a new question-number heading. Confirmed real, high-severity:
    unlike _is_tick_row's ruler-tick shape (2+ OTHER bare digits at the
    same y), this one only needs ONE sibling, because that sibling being
    specifically an A-D option letter is already unambiguous on its own
    -- a real question heading never shares its own row with an option
    letter. Found via a real regression: a resistor-values MCQ's own
    table ("A  160  60  80") put bare "60" and "80" on the SAME row as
    option letter "A", and since real A-D letters genuinely existed
    further down the SAME table (belonging to this question, not a new
    one), an earlier fix's "scope to the next heading" fallback wrongly
    accepted both as new question starts -- inventing two phantom
    questions ("60", "80") between the real Q48 and Q49 on a live paper
    (CAIE A Level Physics "Ch9 Resistance & Resistivity" Worksheet 1)."""
    cur = lines[idx]
    for j in range(max(0, idx - 10), min(len(lines), idx + 11)):
        if j == idx:
            continue
        other = lines[j]
        if other["page"] != cur["page"]:
            continue
        if abs(other["y0"] - cur["y0"]) > tolerance:
            continue
        if OPTION_LETTER_RE.match(other["text"]):
            return True
    return False


def _is_tick_column(lines, idx, x_tolerance=8, min_siblings=2, index_window=40):
    """True when 2+ OTHER bare 1-2 digit lines sit within `x_tolerance`
    x-points of this one, WITH NO REAL QUESTION CONTENT IN BETWEEN -- a
    graph's own Y-AXIS tick label column (e.g. "20"/"15"/"10"/"5"/"0"
    stacked at DIFFERENT y-values but the same x-position), not a real
    question-number heading. _is_tick_row already catches the horizontal
    case (siblings at the same y, different x -- an X-axis or ruler
    scale); this is its vertical mirror, needed because a Y-axis label
    column is the exact opposite shape and slips straight through that
    check. Confirmed real and severe: a bare "20" -- the top tick of a
    graph's y-axis, right after the real question's own stem and before
    its graph and options -- got accepted as a genuine "Q20" start,
    truncating the real question's crop down to its bare two-line stem
    with no graph and no options at all (CAIE IGCSE Biology "Ch12
    Respiration" Worksheet 1 Q19).

    A plain INDEX-DISTANCE bound is not the right gate on its own --
    confirmed real and severe both ways. An unbounded page-wide scan
    broke catastrophically across dozens of unrelated papers (one
    file's count dropped from 22 real questions to 4), because real
    question numbers on a page are almost always left-aligned at the
    SAME x-position as each other -- the exact same shape this check is
    built to catch. But a tight index window (6) ALSO produced a false
    positive of its own: three real, consecutive question headings
    ("7", "8", "9") on the same page in CAIE IGCSE Chemistry "Ch3
    Stoichiometry" Worksheet 2 share the same left-margin x0 and sit
    within 4-5 line-indices of each other (each question is short), so
    "7" and "9" were wrongly counted as tick-column siblings of "8".

    The actual distinguishing feature isn't index distance at all: a
    real axis label column's siblings have NOTHING but other bare
    numbers between them; two real question headings always have that
    question's own stem/option/statement content in between. So instead
    of bounding by index proximity, disqualify any candidate sibling
    that has real content (a sentence-like line or an option letter)
    sitting between it and `cur` -- that's what actually separates the
    two shapes, independent of how close together they happen to sit."""
    cur = lines[idx]
    siblings = 0
    for j in range(max(0, idx - index_window), min(len(lines), idx + index_window + 1)):
        if j == idx:
            continue
        other = lines[j]
        if other["page"] != cur["page"]:
            continue
        if abs(other.get("x0", 0) - cur.get("x0", 0)) > x_tolerance:
            continue
        if not re.match(r'^\d{1,2}$', other["text"]):
            continue
        lo, hi = (idx, j) if j > idx else (j, idx)
        has_real_content = any(
            SENTENCE_START_RE.match(lines[k]["text"]) or OPTION_LETTER_RE.match(lines[k]["text"])
            for k in range(lo + 1, hi)
        )
        if has_real_content:
            continue
        siblings += 1
        if siblings >= min_siblings:
            return True
    return False


def _is_stacked_notation(lines, idx, max_gap=16):
    """True when another bare 1-2 digit line of the same small size sits
    directly ABOVE this one (within `max_gap` y-points) on the same page
    -- an isotope/nuclide mass-number-over-atomic-number stack (e.g. the
    superscript "60" over the subscript "27" in isotope notation for
    cobalt-60), not a real question-number heading. Confirmed real: this
    exact case (CAIE IAL Chemistry "2.2 Atomic Structure", the "27" in
    the cobalt-60 isotope notation) got promoted to a full phantom
    question start because it's small enough (9pt, like a real subscript)
    to be a bare-heading candidate but ISN'T a horizontal tick row
    (`_is_tick_row` only catches siblings at nearly the SAME y-position,
    not one stacked a line-height above), and its "next real sentence"
    happened to fall right after it in position-sorted order purely by
    y-coordinate coincidence -- splitting one real Section B question in
    two, one half missing its own numbered statements entirely.

    Also requires the two digits to sit at nearly the same X position
    (within `x_tolerance`) -- confirmed real and necessary, TKT-0238: a
    genuine question's own bare "4" sat within `max_gap` of an unrelated
    "10" from a frequency-ratio value two columns over in the same
    stem's own diagram (x0 105+ points apart, nothing like a real
    vertically-stacked isotope pair), which the y-gap-and-size check
    alone couldn't tell apart from real stacking -- silently dropping
    that whole real question. A genuine mass-number-over-atomic-number
    stack is vertically ALIGNED by definition; two coincidentally nearby
    but horizontally distant digits never are.

    That X-position requirement, on its own, undercounted a different
    real case (also TKT-0238): a genuine question's own real heading
    number ("26") landed inside a tight cluster of SEVERAL scattered
    bare 1-2 digit diagram point-labels (a flower diagram's own "1",
    "2", "3" part-labels plus a coincidental duplicate "27"/"28" from
    the diagram, all within a few y-points of each other but at very
    different X positions -- CAIE IGCSE Biology "Ch16 Reproduction"
    Q26) -- neither a real vertical stack (only one sibling, x0-close)
    nor safely ignorable by the tightened check above (multiple
    siblings, x0-scattered). A real stack has exactly one aligned
    sibling; a real diagram-label cluster has several scattered ones --
    two different real shapes, so both are checked: close-Y+close-X
    with even a single sibling (the stack case), OR close-Y with ANY
    x0 but at least `cluster_min_siblings` siblings scanned in EITHER
    direction (the cluster case, since a diagram's own labels can
    appear before or after the real heading in position order, unlike
    a stack's sibling which is always directly above)."""
    cur = lines[idx]

    def is_sibling(other):
        return (
            other["page"] == cur["page"]
            and re.match(r'^\d{1,2}$', other["text"])
            and abs(other["size"] - cur["size"]) < 1
            and abs(other["y0"] - cur["y0"]) <= max_gap
            and other is not cur
        )

    nearby = [
        l for l in lines[max(0, idx - 5): idx + 6]
        if is_sibling(l)
    ]
    if not nearby:
        return False
    if any(abs(o["x0"] - cur["x0"]) < 20 for o in nearby):
        return True
    return len(nearby) >= 2


def _page_image_ranges(doc):
    """{page_num: [(top, bottom), ...]} for every embedded raster-image
    block in the document -- precomputed once per call so the option-
    proximity check below can consult it cheaply per candidate line."""
    ranges = {}
    for pno in range(doc.page_count):
        imgs = [
            (b["bbox"][1], b["bbox"][3])
            for b in doc[pno].get_text("dict").get("blocks", [])
            if b.get("type") == 1 and b.get("bbox")
        ]
        if imgs:
            ranges[pno] = imgs
    return ranges


def _has_nearby_image(page_images, page, y0, y_window=600):
    return any(
        y0 - 50 <= top < y0 + y_window
        for top, _bot in page_images.get(page, [])
    )


# CAIE's "Statements 1, 2 and 3 are about X... Which statements are
# correct?" multiple-completion format sometimes prints its own real A-D
# combination options per question (unlike A-Level's fixed-key Section B,
# which states the key once for the whole section and never repeats
# options per question) -- confirmed real on an IGCSE paper (CAIE IGCSE
# Chemistry "Ch11 Macromolecules" Q1), directly contradicting
# _has_statement_markers' own documented "IGCSE papers never use it, full
# stop" exclusion (TKT-0238). That exclusion is based on a real, broader
# false-positive sweep (9 confirmed hits across 8 IGCSE papers) and stays
# in place rather than being loosened generally -- too much regression
# risk against work already tuned against real data this session doesn't
# have back in hand to re-verify. Instead: this is a much narrower,
# separate signal that's true only by an explicit, standard CAIE textual
# template ("Statements" as its own word, naming 1, 2 and 3 by digit) --
# not a structural coincidence a diagram label or stem enumeration could
# ever produce. Checked ONLY against the anchor line's own extended stem,
# never a broad lookahead, so it can't itself become a new false-positive
# class the way a lookahead-based heuristic already has twice in this
# file's history.
STATEMENT_PREAMBLE_RE = re.compile(r"\bstatements?\b.*\b1\b.*\b2\b.*\b3\b", re.IGNORECASE)


def _has_explicit_statement_preamble(stem_text):
    return bool(STATEMENT_PREAMBLE_RE.search(stem_text or ""))


def _has_statement_markers(nearby, min_count=2, is_igcse=False):
    """True when 2+ lines in `nearby` are bare "1"/"2"/"3" -- the
    reliable signature of CAIE's "Section B" / "multiple completion"
    format: one or more of three numbered statements may be correct,
    and the response letters A-D are a FIXED, universal convention
    (confirmed verbatim from a real CAIE paper's own instructions text,
    not assumed):
        A = 1, 2 and 3 are correct
        B = 1 and 2 only are correct
        C = 2 and 3 only are correct
        D = 1 only is correct
    This is a real, standard, gradable CAIE question type -- NOT out of
    scope -- it just never prints A-D on the question page itself (the
    key is stated once, in the instructions, before the whole section).
    A question flagged by this check gets the fixed key image attached
    to its own crop (see STATEMENT_KEY_IMAGE) and optionLetters forced
    to the full A-D set, since no per-question text ever encodes them.

    Two real bugs found live, both from trying to tell a real marker
    apart from a plain ruler's own scale ("0  1  2  3  4  5"), which
    also produces bare "1"/"2"/"3" lines:

    (1) Originally counted ruler ticks the same as real markers -- the
    fixed Section-B key got wrongly stitched onto an ordinary ruler-
    diagram question with no relation to statements at all.

    (2) The first fix (reject a "1"/"2"/"3" that has ANY other bare
    digit nearby at a similar y0) overshot in two different ways: it
    broke a real marker whose own statement TEXT sits on the same
    visual row as its number (e.g. "1" at y0=213.14 beside "The
    activation energy..." at y0=213.42 -- not a digit, shouldn't have
    mattered, but a bug in that check's own logic (comparing to `l`
    instead of collecting real digit-only siblings) let it slip in);
    AND it broke a real case where a paper lays its three statements
    out in a horizontal ROW instead of stacked (three short equations,
    "1 <eqn>   2 <eqn>   3 <eqn>", genuinely all at the same y0) --
    confirmed real, a genuine statement question about ideal gas
    equations got wrongly excluded entirely.

    The signal that actually distinguishes the two: a ruler ALWAYS has
    a bare "0" nearby (confirmed across every real example -- a ruler's
    own origin tick), which a real statement set never does. An earlier
    version of this check disqualified on ANY other bare digit, not
    specifically "0" -- also wrong on real data: a genuine statement
    question about isotope notation legitimately contains its own bare
    mass-number lines ("40", "39") that have nothing to do with a
    ruler.

    A y-range-scoped version of this same check (comparing only against
    OTHER bare digits within the y-span the 1/2/3 candidates themselves
    cover) was tried and also proved wrong on real data: three short
    real Section-B questions back to back on one page put the SECOND
    and THIRD question's own content -- including an unrelated bare
    "40"/"39" from an isotope notation like the numbers in an actual
    nuclide symbol -- inside the first question's own 30-line lookahead
    window, and a naive numeric y-range comparison doesn't know those
    numbers belong to a different question entirely (worse, once a
    page break is crossed, y0 resets, so comparing raw y0 across pages
    is meaningless regardless of range).

    The robust fix: stop scanning `nearby` entirely the moment another
    line that itself looks like the START of a different question
    appears (matches QUESTION_KEYWORD_RE, QUESTION_NUM_RE, or
    QUESTION_BARE_RE) -- content belonging to a different question is
    never relevant to whether THIS one is a statement-format question,
    and this boundary is exact, unlike a distance-based heuristic.

    That stop condition itself then produced a THIRD real bug: a
    chemical equation with a fraction ("SO2 + ½O2 → SO3") gets
    its numerator extracted onto its own merged line ("1 O2 →
    SO3"), which coincidentally matches the same heading-shaped pattern
    (digit, space, capital letter) -- stopping the scan immediately,
    before ever reaching the block's own real markers a few lines
    later. Real question numbers at the point any of these checks run
    are never 1, 2, or 3 (this corpus's questions are always deep into
    a much higher range by the time Section B appears) -- so a
    heading-shaped match only counts as a genuine stop boundary when
    its captured number is something ELSE. A captured "1"/"2"/"3" is
    always this exact false-positive shape, never a real next
    question, and is correctly left for the marker-collection check
    below instead.

    is_igcse: a fourth real false-positive class, found via a full-corpus
    sweep (9 hits across 8 IGCSE papers, 0 false negatives among 354 real
    A-Level hits) -- an IGCSE question's OWN content can coincidentally
    contain 2-3 bare "1"/"2"/"3" lines with nothing to do with Section B
    at all: a numbered 2-item stem enumeration (e.g. "1 When limestone is
    heated... 2 Water is dripped onto..." describing two reactions, not
    three statements), or a diagram's own numbered arrow/branch labels
    (a food-chain diagram's "consumer 1"/"2"/"3", a flow-diagram's "1"/
    "2"/"3" arrows into an unrelated 4-row A-D table). Every one of the
    3 prior heuristics above (ruler-tick rejection, stop-at-next-question,
    subscript-size check) was designed to separate a real marker from a
    ruler or an unrelated digit -- none of them can distinguish a real
    statement (always followed by real sentence/equation content) from a
    diagram's own point labels, because both LOOK identical: a bare
    digit followed by short text. The one fact that's actually reliable
    (confirmed against this project's real source material, not
    assumed): Section B / multiple-completion is exclusively a CAIE
    A-Level convention -- IGCSE papers never use it, full stop. Rather
    than chase a 4th content-shape heuristic with its own future false
    positives, this is a categorical exclusion by qualification level
    (read once per paper from its own "Level:" metadata header, see
    _paper_is_igcse), which cannot regress any of the 354 genuine
    A-Level detections since it only ever suppresses IGCSE papers."""
    if is_igcse:
        return False
    marker_lines = []
    for l in nearby:
        text = l["text"]
        m_next = (
            QUESTION_KEYWORD_RE.match(text)
            or QUESTION_NUM_RE.match(text)
            or QUESTION_BARE_RE.match(text)
        )
        if m_next and m_next.group(1) not in ("1", "2", "3"):
            break  # a different question's own content starts here
        if m_next:
            # A statement marker isn't always a bare "1"/"2"/"3" alone --
            # confirmed real: some papers merge the number and its own
            # statement text onto one line ("1 It is different for the
            # forward and back reactions..."), the same letter+text
            # merged-line format already known from option lines
            # elsewhere in this file. m_next already confirmed this
            # matches a heading-shape with a captured number in
            # {1,2,3} (the "not in" branch above would have broken
            # otherwise), so it's a real marker here too.
            marker_lines.append(l)
            continue
        if OPTION_LETTER_RE.match(text):
            # Real A-D options found WITHIN this question's own bounded
            # scope (up to the next question) is decisive: this is an
            # ordinary MCQ, never a statement-format one. Deliberately
            # NOT the caller's own unbounded `has_options` (computed
            # over the full, un-stopped 30-line lookahead) -- confirmed
            # real regression from trying that: a short real statement
            # question's lookahead window reached past its own end into
            # the NEXT question's real A-D options, wrongly attributing
            # them to this one. This scoped check only ever sees options
            # that are actually within the current question's own
            # content, matching where marker_lines and the "4" check
            # below also stop looking.
            return False
        if text in ("1", "2", "3"):
            marker_lines.append(l)
        elif text == "4" and (not marker_lines or l["size"] >= marker_lines[0]["size"] - 1):
            # Checking "is there a bare 4" alone (with no size check) was
            # ALSO wrong: a genuine statement question's own chemical
            # formula can legitimately contain a subscript "4" (P4O10,
            # tetraphosphorus decoxide) that gets extracted onto its own
            # line -- but a subscript renders in a visibly SMALLER font
            # (confirmed real: 7pt) than the surrounding body text and
            # the real "1"/"2"/"3" markers (11pt), the same size gap
            # this file's page-footer-number check elsewhere relies on.
            # A ruler's own tick-mark numbers, by contrast, render at
            # essentially the SAME size as everything else in the
            # diagram (confirmed real: also 11pt) -- so only a same-
            # size-or-larger "4" counts as a real tick mark; a
            # conspicuously smaller one is a subscript and is ignored.
            return False
    return len(marker_lines) >= min_count


def _paper_is_igcse(doc):
    """Cheap, authoritative qualification-level check: every QP in this
    project's real source material carries a "File:.../Level:.../IGCSE"
    (or "A Level"/"AS Level"/"IAL") metadata header on its own first
    page (confirmed verbatim, e.g. "CAIE IGCSE Chemistry Ch5 Energetics
    of a reaction (MCQ) Worksheet 1 QP ... Level: IGCSE"). Used to
    categorically exclude IGCSE papers from Section-B / multiple-
    completion detection, which is exclusively a CAIE A-Level format --
    see _has_statement_markers's is_igcse docstring for the false
    positives this was built to fix. Defaults to False (not IGCSE, i.e.
    Section-B detection stays active) if doc is missing or the header
    isn't found, matching this function's existing behavior before this
    check existed."""
    if doc is None or doc.page_count == 0:
        return False
    try:
        return "IGCSE" in doc[0].get_text()
    except Exception:
        return False


def find_question_starts(lines, doc=None):
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
    is_igcse = _paper_is_igcse(doc)
    # A bare numbered stem next to a raster-image answer table (a common
    # real MS layout -- an infographic-style table/flowchart with
    # checkmarks/crosses, not extractable A-D text) has NO nearby
    # OPTION_LETTER_RE match at all, so the option-proximity gate below
    # rejected it outright and the whole question vanished from the MS
    # answer-resolution pipeline entirely -- confirmed real and, by far,
    # the dominant cause of "can't auto-grade" questions across the real
    # corpus (74 of 87 in one full-library audit). An embedded image
    # nearby is just as valid evidence this is a real question as
    # extractable option-letter text is.
    page_images = _page_image_ranges(doc) if doc is not None else {}
    # Some real questions are structurally real (a real numbered stem,
    # sentence-shaped, at the right position) but never become a
    # detected "question" because they genuinely have no A-D options
    # nearby -- a different multi-statement format this tool doesn't
    # parse (confirmed real, twice: once behind a literal "Section B"
    # text marker, once with NO marker text at all, just a plain numbered
    # stem that switches formats with nothing announcing it). Without
    # this list, the PRECEDING real question's crop had nothing telling
    # it where its own content actually ends, and silently ran through
    # several of these un-parseable questions into whatever came after.
    # These are boundary markers only -- never returned as questions,
    # never LIS-filtered, just used by parse_qp/parse_ms to know where a
    # neighboring question's own crop must stop.
    quasi = []
    for idx, line in enumerate(lines):
        m = QUESTION_KEYWORD_RE.match(line["text"])
        if not m:
            m = QUESTION_NUM_RE.match(line["text"])
        if m:
            _via_preamble = _has_explicit_statement_preamble(m.group(2))
            starts.append({
                "number": m.group(1), "inlineText": (m.group(2) or "").strip(),
                "page": line["page"], "y0": line["y0"],
                "isStatementFormat": (
                    _has_statement_markers(lines[idx + 1: idx + 55], is_igcse=is_igcse)
                    or _via_preamble
                ),
                "viaExplicitPreamble": _via_preamble,
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
            content = (m.group(2) or "").strip()
            # A minimum content length, matching the digit-form sibling
            # pattern below -- confirmed real false positive without it:
            # a force-diagram label "45 N" (content is just "N", 1 char)
            # on CAIE A Level Physics Ch4 "Moments" Q42 matched this
            # pattern and got promoted to a full "start" (a genuine
            # numbered force value, 45, happened to be both a plausible
            # next question number AND to have a real "A" option-letter
            # line coincidentally nearby), truncating Q42's own crop down
            # to a single line. A real question stem is always a full
            # sentence; nothing this short is one.
            # Checked against the ONE-LINE-EXTENDED stem, not the bare
            # first line alone -- confirmed real and, once looked for,
            # widespread across the corpus (dozens of files, one whole
            # question each): isotope/nuclide notation and ordinary
            # word-wrap alike can leave a real heading's own first line
            # far short of this floor even though the full stem clearly
            # isn't ("42 The 1H3" -- the isotope superscript ate the rest
            # of the line -- real content: "...+ ion was first
            # characterised..."; "38 What is" wrapped mid-clause). See
            # _stem_with_continuation's own docstring for why this is
            # still safe against the original "45 N" false positive.
            #
            # A genuinely short but COMPLETE real question ("13 What are
            # alleles?", 18 chars) still clears this floor even without
            # reaching 20 -- confirmed real, CAIE IGCSE Biology "Ch17
            # Inheritance" Q13, silently dropped by the length floor alone
            # because its very next line is a real A-D option letter, which
            # _stem_with_continuation correctly refuses to merge into the
            # stem (that would corrupt inlineText, not extend it). A
            # coincidental short label ("N", "45 N", "60 cm3") is never
            # BOTH a capitalized word AND ends in "?" the way a real
            # question does -- that combined shape, not length alone, is
            # what actually distinguishes a real short question from this
            # floor's original target.
            extended_stem = _stem_with_continuation(lines, idx, content)
            is_short_complete_question = extended_stem[:1].isupper() and extended_stem.rstrip().endswith("?")
            if len(extended_stem) >= 20 or is_short_complete_question:
                # 55, not 31 -- confirmed real false negative on a real
                # displacement-time graph question (CAIE A Level Physics
                # Wave Basics Worksheet 1, Q43): its x-axis tick labels
                # ("0 5 10 15 20 25 30...55") render as ~24 separate
                # single-digit lines before the real A/B/C/D options
                # table, pushing those options to line 32 of the
                # lookahead -- past the old 30-line window, so has_options
                # came back False and the whole question was dropped as
                # quasi even though it has genuine options.
                nearby = lines[idx + 1: idx + 55]
                has_options = any(OPTION_LETTER_RE.match(l["text"]) for l in nearby)
                has_image = _has_nearby_image(page_images, line["page"], line["y0"])
                # _has_statement_markers does its own internal,
                # boundary-scoped check for real A-D options -- NOT
                # this unbounded has_options -- confirmed real
                # regression from using the unbounded one: a short
                # statement question's 30-line lookahead reached past
                # its own end into the NEXT question's real options.
                via_preamble = _has_explicit_statement_preamble(extended_stem)
                is_statement = _has_statement_markers(nearby, is_igcse=is_igcse) or via_preamble
                if has_options or has_image or is_statement:
                    starts.append({
                        "number": m.group(1), "inlineText": content,
                        "page": line["page"], "y0": line["y0"],
                        "isStatementFormat": is_statement,
                        "viaExplicitPreamble": via_preamble,
                    })
                else:
                    quasi.append({"page": line["page"], "y0": line["y0"]})
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
            # Checked against the one-line-extended stem -- see
            # _stem_with_continuation's docstring and the sibling check
            # above for why (same real, widespread short-first-line
            # failure mode as the letter-starting form).
            extended = _stem_with_continuation(lines, idx, content)
            if len(extended) >= 25 and len(extended.split()) >= 5:
                nearby = lines[idx + 1: idx + 55]
                has_options = any(OPTION_LETTER_RE.match(l["text"]) for l in nearby)
                has_image = _has_nearby_image(page_images, line["page"], line["y0"])
                # _has_statement_markers does its own internal,
                # boundary-scoped check for real A-D options -- NOT
                # this unbounded has_options -- confirmed real
                # regression from using the unbounded one: a short
                # statement question's 30-line lookahead reached past
                # its own end into the NEXT question's real options.
                via_preamble = _has_explicit_statement_preamble(extended)
                is_statement = _has_statement_markers(nearby, is_igcse=is_igcse) or via_preamble
                if has_options or has_image or is_statement:
                    starts.append({
                        "number": m.group(1), "inlineText": content.strip(),
                        "page": line["page"], "y0": line["y0"],
                        "isStatementFormat": is_statement,
                        "viaExplicitPreamble": via_preamble,
                    })
                else:
                    quasi.append({"page": line["page"], "y0": line["y0"]})
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
        if (
            m and m.group(1) != "0" and line["size"] >= 9
            and not _is_tick_row(lines, idx)
            and not _is_stacked_notation(lines, idx)
            and not _is_table_value_row(lines, idx)
            and not _is_tick_column(lines, idx)
        ):
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
            has_sentence = any(SENTENCE_START_RE.match(c["text"]) for c in candidates)
            # A real question can be genuinely sentence-less on its own
            # heading's immediate next line without being fake at all --
            # confirmed real, CAIE IGCSE Biology "Ch17 Inheritance" Q11: a
            # Punnett-square/genotype diagram (rendered as real, if
            # short, TEXT fragments -- "HbA HbA", a bare "D" among them)
            # sits between the bare "11" and the next real heading, with
            # real A-D option letters further down the SAME diagram --
            # but nothing in it is ever a single line long/capitalized
            # enough to pass the sentence check above on its own. This
            # branch used to require that sentence check as a hard gate
            # before EVER looking for options/an image/statement markers,
            # unlike every other branch in this function where those are
            # independently sufficient evidence -- so a real question
            # with real, scoped-nearby A-D options got silently dropped
            # whenever it also happened to lack an immediately-sentence-
            # shaped next line. Scoped (stops at the next real heading, so
            # this can't bleed into a LATER unrelated question's own
            # options the way an unbounded scan already confirmed real and
            # unsafe elsewhere in this file) rather than the same 55-line
            # flat window the sentence-gated path below uses, since here
            # there's no sentence check already filtering the candidate
            # down first.
            if has_sentence or _has_nearby_image(page_images, line["page"], line["y0"]) or option_letters_in_block(
                lines, (line["page"], line["y0"]), _next_heading_pos(lines, idx),
            ):
                nearby = lines[idx + 1: idx + 55]
                has_options = any(OPTION_LETTER_RE.match(l["text"]) for l in nearby)
                has_image = _has_nearby_image(page_images, line["page"], line["y0"])
                # _has_statement_markers does its own internal,
                # boundary-scoped check for real A-D options -- NOT
                # this unbounded has_options -- confirmed real
                # regression from using the unbounded one: a short
                # statement question's 30-line lookahead reached past
                # its own end into the NEXT question's real options.
                via_preamble = any(_has_explicit_statement_preamble(c["text"]) for c in candidates)
                is_statement = _has_statement_markers(nearby, is_igcse=is_igcse) or via_preamble
                if has_options or has_image or is_statement:
                    starts.append({
                        "number": m.group(1), "inlineText": "",
                        "page": line["page"], "y0": line["y0"],
                        "isStatementFormat": is_statement,
                        "viaExplicitPreamble": via_preamble,
                    })
                else:
                    quasi.append({"page": line["page"], "y0": line["y0"]})

    # A statement-format question's own "1"/"2"/"3" continuation markers
    # (each numbered statement is a real, complete sentence in its own
    # right -- "1 They are different solid forms of the same element.")
    # can independently satisfy the bare-alone-digit branch's own
    # promotion check above (a lone "1"/"2"/"3" followed by a real
    # sentence-shaped next line): confirmed real, CAIE IGCSE Chemistry
    # "Ch11 Macromolecules" Q1 -- its own "1", "2", "3" statement markers
    # each got promoted all the way to a full START (not just `quasi`,
    # which the sibling comment below already accounts for), truncating
    # Q1's own crop after its intro sentence and letting the REAL Q2 and
    # Q3 bleed into what should have been Q1's own remaining content.
    # Same scoping logic as the quasi-pruning right below (scan forward
    # from a confirmed statement-format start to wherever a REAL heading
    # -- not another "1"/"2"/"3" -- resumes): any OTHER start whose own
    # number is "1", "2", or "3" and whose position falls strictly inside
    # that range is this exact noise, not a new question, and is dropped
    # before the LIS below ever sees it (dropping it after, like the
    # quasi-only version of this fix, is too late -- the LIS has already
    # run by then).
    statement_noise_pos = set()
    for s in starts:
        if not s.get("isStatementFormat"):
            continue
        start_pos = (s["page"], s["y0"])
        idx = next(i for i, l in enumerate(lines) if (l["page"], l["y0"]) == start_pos)
        # A statement-format start recognized ONLY via the explicit
        # "Statements 1, 2 and 3 are..." preamble (never via the general,
        # deep-in-paper _has_statement_markers signal) can be this
        # question's own literal FIRST question -- confirmed real, CAIE
        # IGCSE Chemistry "Ch11 Macromolecules" Q1 -- where a REAL Q2 and
        # Q3 genuinely follow with those exact real numbers. The general
        # path's "scan until a non-1/2/3 heading" is unsafe to reuse here
        # for that reason: it can't tell this question's OWN "2"/"3"
        # markers apart from the next real Q2/Q3, since both look
        # identical (bare "2"/"3" followed by sentence-shaped text). The
        # preamble itself already states the exact count though ("1, 2
        # AND 3" -- always exactly 3 statements, never more) -- so cap
        # the noise window at exactly 2 further markers (this question's
        # own remaining "2" and "3") instead of scanning indefinitely.
        # The general, already-verified path (a real Section-B question
        # deep in an A-Level paper, where 1/2/3 are never real question
        # numbers at that point -- see _has_statement_markers' own
        # docstring) keeps its original unbounded scan unchanged.
        if s.get("viaExplicitPreamble"):
            # Cap at 3, not 2 -- confirmed real: EVERY statement gets its
            # own trailing digit marker, including statement "1" itself
            # ("1 They are different solid forms..."), which is a
            # separate, coincidental "1" from this anchor QUESTION's own
            # number (also, confusingly, "1" here since this happens to
            # be the paper's first question) -- three statement markers
            # (1, 2, 3) exist regardless of what number the anchor
            # question itself carries.
            noise_candidates = sorted(
                (other for other in starts if other is not s and other["number"] in ("1", "2", "3")
                 and start_pos < (other["page"], other["y0"])),
                key=lambda o: (o["page"], o["y0"]),
            )[:3]
            statement_noise_pos |= {(o["page"], o["y0"]) for o in noise_candidates}
            continue
        end_pos = None
        for l in lines[idx + 1:]:
            m_next = (
                QUESTION_KEYWORD_RE.match(l["text"])
                or QUESTION_NUM_RE.match(l["text"])
                or QUESTION_BARE_RE.match(l["text"])
                or QUESTION_BARE_DIGIT_RE.match(l["text"])
                or QUESTION_BARE_ALONE_RE.match(l["text"])
            )
            if m_next and m_next.group(1) not in ("1", "2", "3"):
                end_pos = (l["page"], l["y0"])
                break
        statement_noise_pos |= {
            (other["page"], other["y0"]) for other in starts
            if other is not s and other["number"] in ("1", "2", "3")
            and start_pos < (other["page"], other["y0"]) < (end_pos or (10 ** 9, 0))
        }
    starts = [s for s in starts if (s["page"], s["y0"]) not in statement_noise_pos]

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
    # A statement-format question's own "2"/"3" continuation markers
    # ("2 It is low for a reaction..." merged-line form) independently
    # match a heading-like shape too, so the main loop above evaluates
    # each of them AGAIN as its own candidate -- scanning forward from
    # "2" alone only ever finds the one remaining marker ("3"), never
    # the 2+ this check requires, so each wrongly lands in `quasi`
    # (not `starts`, since it also lacks real options/an image on its
    # own). Those quasi entries then truncated the PRECEDING real
    # question's own crop right at "2", cutting off its own genuine
    # "2" and "3" -- confirmed real. Any quasi entry that falls inside
    # a statement-format question's own extent is exactly this noise,
    # not a real boundary, and is dropped here.
    quasi_pos = {(q["page"], q["y0"]) for q in quasi}
    for s in starts:
        if not s.get("isStatementFormat"):
            continue
        start_pos = (s["page"], s["y0"])
        idx = next(i for i, l in enumerate(lines) if (l["page"], l["y0"]) == start_pos)
        end_pos = None
        for l in lines[idx + 1:]:
            m_next = (
                QUESTION_KEYWORD_RE.match(l["text"])
                or QUESTION_NUM_RE.match(l["text"])
                or QUESTION_BARE_RE.match(l["text"])
            )
            if m_next and m_next.group(1) not in ("1", "2", "3"):
                end_pos = (l["page"], l["y0"])
                break
        quasi_pos -= {
            p for p in quasi_pos
            if start_pos < p < (end_pos or (10 ** 9, 0))
        }
    quasi = [q for q in quasi if (q["page"], q["y0"]) in quasi_pos]

    if n == 0:
        return [], quasi
    best = max(range(n), key=lambda i: lengths[i])
    seq_idx = []
    i = best
    while i != -1:
        seq_idx.append(i)
        i = prev[i]
    seq_idx.reverse()
    # A start the LIS above rejects (a real, option-bearing question whose
    # own captured "number" breaks strict increase -- confirmed real: a
    # leftover page-number-like token from the source PDF's own original
    # pagination glued onto a real question's first line, e.g. "34 A wire
    # PQ is made of..." six pages after the real Q34, and a duplicate/
    # out-of-sequence number reused from a different source paper this
    # worksheet was compiled from) used to just vanish -- not a question,
    # not even a boundary marker. That left the PRECEDING real question's
    # own crop with no idea where its content actually ends, so it ran
    # straight through this rejected question's entire real content
    # (confirmed real and, across the whole corpus, the dominant cause of
    # a question going fully missing from a digitized paper: 11 of 195
    # papers, 16 questions, all traced to exactly this mechanism -- TKT-0238).
    # Demoting it to a `quasi` boundary marker (same mechanism already
    # used for a real-but-unparseable question format elsewhere in this
    # function) fixes the crop bleed without inventing a fake question
    # number for content this function has already decided it can't
    # trust the printed number of.
    # NOT every LIS-rejected candidate is a genuine swallowed question --
    # confirmed real regression from demoting all of them unconditionally:
    # a bare diagram scale label ("40" on a measuring cylinder's own
    # printed scale, CAIE IGCSE Physics "Ch1.1 Length & Time" Q9)
    # independently matches the same bare-alone-digit promotion path
    # (followed by a real sentence -- here, that question's OWN "What is
    # the volume of the water?" prompt line, not a new question), gets
    # rejected by the LIS same as a genuine misnumbered question would,
    # but demoting THIS one to a quasi boundary wrongly truncated Q9's
    # own crop before its own real A-D options -- a full-corpus dry run
    # surfaced height changes in 122 papers, the overwhelming majority of
    # which were this exact false-positive class, not real fixes.
    # The distinguishing signal: a genuinely swallowed question sits
    # between two KEPT numbers that are NOT consecutive (a real gap --
    # e.g. kept ...45, 47... with the rejected "34"/wire-PQ content
    # between them, corresponding to the missing 46). A rejected
    # candidate sitting between two consecutive kept numbers (9 and 10,
    # no gap) has nowhere real to belong -- demoting it can only ever
    # cut into one of those two real, already-correctly-bounded
    # questions, never recover a missing one.
    #
    # Recovery, not just exclusion: when a bracket's missing-number COUNT
    # exactly matches the number of real rejected candidates found inside
    # it, position order is enough to know which candidate is which
    # missing question -- confirmed real and safe, TKT-0238 follow-up: a
    # gap of exactly one slot with exactly one candidate (e.g. kept
    # ...45, 47..., one real candidate between them) is unambiguous
    # regardless of what wrong number that candidate itself captured (a
    # stray leftover page-number token, never trustworthy on its own --
    # see the comment above this block). This is never a guess about
    # WHETHER real content exists there (has_options/has_image/
    # is_statement already proved that before the candidate ever reached
    # `starts`) -- only about which of the few known-missing numbers it
    # is, which position order settles exactly.
    #
    # Two safety nets keep this from ever mis-assigning:
    # (1) candidates within 50pt of an earlier one already claimed for
    # THIS SAME bracket are dropped as noise before counting -- confirmed
    # real: a coincidental bare "2" (part of a "2ρ" material-resistivity
    # label in the same diagram) sat right after a genuine rejected
    # question in the same bracket, and counting it as a second real
    # candidate would have wrongly refused to recover the one genuine one.
    # (2) if the deduped candidate count still doesn't exactly match the
    # slot count (more candidates than slots, fewer, or none at all -- a
    # real, separate, still-unsolved case: TKT-0238's "42 Radon..." on
    # CAIE A Level Physics "Ch11 Particle Physics" Worksheet 1 never
    # became a candidate at ALL, a distinct _stem_with_continuation
    # false-stop on a chemical-symbol-led sentence, not something this
    # block can recover), every candidate in that bracket falls back to
    # the plain boundary-only quasi marker, same as before -- never a
    # fabricated number when the evidence doesn't cleanly support one.
    kept = sorted(seq_idx)
    kept_nums = [int(starts[k]["number"]) for k in kept]
    kept_set = set(seq_idx)
    brackets = {}
    gap_candidate_idx = set()
    for i, s in enumerate(starts):
        if i in kept_set:
            continue
        prev_num = next((n for k, n in zip(reversed(kept), reversed(kept_nums)) if k < i), None)
        next_num = next((n for k, n in zip(kept, kept_nums) if k > i), None)
        if prev_num is not None and next_num is not None and next_num - prev_num > 1:
            # Only a candidate that actually sits in a real gap (kept
            # numbers on both sides are NOT consecutive) is even a
            # candidate for quasi/recovery at all -- confirmed real and
            # serious regression without this distinction, a full-corpus
            # dry run: rewriting this block for recovery support (below)
            # accidentally made the FINAL loop add every non-kept start
            # to quasi unconditionally, including ones that never had a
            # real gap in the first place (kept numbers ARE consecutive,
            # e.g. a diagram scale label "40" sitting between real,
            # consecutive kept "9" and "10") -- these must stay
            # completely inert, exactly as they were before either fix,
            # not become a boundary of any kind.
            gap_candidate_idx.add(i)
            brackets.setdefault((prev_num, next_num), []).append((i, s))

    recovered = []
    handled_idx = set()
    for (prev_num, next_num), candidates in brackets.items():
        candidates.sort(key=lambda pair: (pair[1]["page"], pair[1]["y0"]))
        deduped = []
        deduped_away = []
        for i, s in candidates:
            if deduped and s["page"] == deduped[-1][1]["page"] and s["y0"] - deduped[-1][1]["y0"] < 50:
                deduped_away.append(i)
                continue
            deduped.append((i, s))
        missing_slots = next_num - prev_num - 1
        if len(deduped) == missing_slots:
            for offset, (i, s) in enumerate(deduped):
                recovered.append({**s, "number": str(prev_num + 1 + offset)})
                handled_idx.add(i)
            # A candidate deduped away as noise WITHIN a successfully
            # recovered bracket (e.g. a coincidental "2ρ" material label
            # sitting right after the real recovered question's own
            # start) is noise, not a boundary -- confirmed real without
            # this: it still ended up in `quasi` and truncated the
            # recovered question's own crop down to a single line, even
            # though it correctly wasn't counted as a second real
            # question. Only exclude it here, inside a bracket that
            # actually got recovered -- an unrecovered bracket's own
            # candidates (ambiguous, not enough evidence) still fall
            # through to quasi below exactly as before.
            handled_idx.update(deduped_away)

    for i in gap_candidate_idx:
        if i in handled_idx:
            continue
        s = starts[i]
        quasi.append({"page": s["page"], "y0": s["y0"]})

    result = [starts[i] for i in seq_idx] + recovered
    result.sort(key=lambda s: (s["page"], s["y0"]))
    return result, quasi


def _pos(page, y0):
    return (page, y0)


def _next_heading_pos(lines, idx):
    """(page, y0) of the next line, after position-sorted index idx, that
    itself looks like a real question-number heading candidate of any
    shape -- used to scope a bare-alone-number candidate's own search for
    real nearby evidence (option letters, an image) so it can never bleed
    into a LATER, unrelated question's own content, mirroring the same
    scoping principle _has_statement_markers already applies for its own
    internal boundary-scoped option search.

    A bare-alone digit specifically needs the same subscript-size guard
    the main loop's own bare-alone-digit branch already applies (line
    size >= 9, matching the confirmed-real 7pt-subscript-vs-11pt-heading
    gap documented there) -- confirmed real and serious without it: a
    molecular-formula subscript ("H2(g)" rendering its "2" onto its own
    7pt line) matched here first and stopped the scoped search WAY
    short, so a real question's own option-letters-in-block check never
    reached its actual real A-D options -- TKT-0238, the paper "8.2
    Enthalpy Change & Hess's Law" Q8 bleeding into the whole of Q9.
    QUESTION_BARE_RE/QUESTION_BARE_DIGIT_RE also need the same content-
    length floor the main loop's own branches for these patterns already
    require (roughly 20 chars) before trusting them as a real heading --
    confirmed real, same paper: a unit value ("1 Gm", gigametres) matches
    QUESTION_BARE_RE's shape (digit, space, capital letter) just as
    easily as a real question does, and unlike the main loop's own
    promotion path, this function had no length check at all -- it
    stopped the scoped search at "1 Gm" instead of the real heading much
    further down, so a real question's own A-D options (also further
    down) were never found either, silently dropping the whole question."""
    for l in lines[idx + 1:]:
        t = l["text"]
        if QUESTION_BARE_ALONE_RE.match(t) and l["size"] < 9:
            continue
        m_bare = QUESTION_BARE_RE.match(t) or QUESTION_BARE_DIGIT_RE.match(t)
        if m_bare and len((m_bare.group(2) or "").strip()) < 15:
            continue
        if (
            QUESTION_KEYWORD_RE.match(t) or QUESTION_NUM_RE.match(t)
            or m_bare or QUESTION_BARE_ALONE_RE.match(t)
        ):
            return (l["page"], l["y0"])
    return (10 ** 9, 0)


def option_letters_in_block(lines, start_pos, end_pos):
    """Collects A-D option-letter markers from one question/answer block.
    Two real correctness bugs found via red-teaming the actual QP/MS
    content (not just server behavior), both fixed here:

    (1) Merged letter+text lines (see OPTION_LETTER_MERGED_RE) are also
    accepted, not just a letter alone on its own line -- confirmed real
    on CAIE IGCSE Physics Ch2.2 Q17, where OPTION_LETTER_RE alone
    silently produced optionLetters=['D'] even though the crop clearly
    shows options A-D, so the quiz UI rendered only a single clickable
    "D" button for a question with 4 real choices. An earlier version of
    this fix required letters to appear as a strict A,B,C,D... run in
    position order, to guard against matching an ordinary sentence that
    starts with the word "A " -- that itself proved wrong on real data:
    a different real file (CAIE IGCSE Physics Ch1.1 Q2) lists its four
    options in a non-alphabetical stream/visual order (a 2-column C/D
    over A/B grid), so the ordering requirement rejected genuine matches
    and caused a real regression (16/16-confident baseline dropped to
    4/16). Matches are now unordered. The residual false-positive risk
    (a stem sentence starting with "A ") only ever ADDS a phantom letter
    to the set, which can only push a resolvable answer toward ambiguous
    or add a spurious extra button -- never flip a correct answer into a
    wrong one -- so it is an acceptable direction to fail in.

    (2) A block containing isolated single-letter lines OUTSIDE A-D
    (element symbols in a chemical structure diagram like H, O are the
    confirmed real case -- CAIE IGCSE Chemistry "Names of compounds" Q7,
    whose MS block is literally a text-rendered skeletal formula with H/
    C/O atoms each on their own line) means bare single-letter lines in
    THIS block are diagram/table noise, not real option markers -- a bare
    "C" there is carbon, not option C. Confirmed real: this fed a
    completely spurious resolved answer into parse_ms's elimination logic
    for a block with no actual answer-key content in it at all. Any such
    block returns an empty set so the caller's own default (full A-D)
    fallback applies instead of trusting the noise.
    """
    found = set()
    other_single_letters = set()
    for line in lines:
        p = _pos(line["page"], line["y0"])
        if not (start_pos <= p < end_pos):
            continue
        text = line["text"]
        sm = SINGLE_LETTER_RE.match(text)
        if sm and sm.group(1) not in "ABCD":
            other_single_letters.add(sm.group(1))
        m = (
            OPTION_LETTER_RE.match(text)
            or OPTION_LETTER_MERGED_RE.match(text)
            or OPTION_LETTER_TRAILING_RE.search(text)
        )
        if m:
            found.add(m.group(1).upper())
    if other_single_letters:
        return set()
    return found


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


# CAIE's "Section B" / "multiple completion" format: one or more of
# three numbered statements (1, 2, 3) may be correct, and the response
# letters A-D are this FIXED, universal combination key -- confirmed
# verbatim from a real CAIE paper's own instructions text ("The
# responses A to D should be selected on the basis of..."), not
# assumed. The question page itself never repeats this key per
# question (it's stated once, before the whole section), so a cropped
# question image showing only the numbered statements is meaningless
# without it attached.
STATEMENT_KEY_ROWS = [
    ("A", "1, 2 and 3 correct"),
    ("B", "1 and 2 only correct"),
    ("C", "2 and 3 only correct"),
    ("D", "1 only correct"),
]
_STATEMENT_KEY_CACHE = None


def render_statement_key_image(width=1190):
    """Renders CAIE's fixed Section-B combination key as one PNG,
    generated once via PIL and cached -- the key is identical for every
    such question, so there's no reason to regenerate it per question."""
    global _STATEMENT_KEY_CACHE
    if _STATEMENT_KEY_CACHE is not None:
        return _STATEMENT_KEY_CACHE
    row_h = 50
    header_h = 46
    height = header_h + row_h * len(STATEMENT_KEY_ROWS) + 20
    img = Image.new("RGB", (width, height), "white")
    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 22)
        font_bold = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 22)
    except OSError:
        font = font_bold = ImageFont.load_default()
    draw.text((10, 5), "The responses A to D should be selected on the basis of:", fill="black", font=font)
    col1_w, col2_w = 60, 400
    y = header_h
    x0 = 10
    table_w = col1_w + col2_w
    draw.rectangle([x0, y, x0 + table_w, y + row_h * len(STATEMENT_KEY_ROWS)], outline="black", width=2)
    for i, (letter, meaning) in enumerate(STATEMENT_KEY_ROWS):
        row_y = y + i * row_h
        if i > 0:
            draw.line([(x0, row_y), (x0 + table_w, row_y)], fill="black", width=1)
        draw.line([(x0 + col1_w, row_y), (x0 + col1_w, row_y + row_h)], fill="black", width=1)
        draw.text((x0 + 18, row_y + 12), letter, fill="black", font=font_bold)
        draw.text((x0 + col1_w + 14, row_y + 12), meaning, fill="black", font=font)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    _STATEMENT_KEY_CACHE = buf.getvalue()
    return _STATEMENT_KEY_CACHE


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


def image_block_bottom(page, y_low, y_high):
    """Bottom y-coordinate of the lowest embedded raster-image block on
    this page whose own top falls within [y_low, y_high), or None if
    there isn't one. Real, previously-undiscovered crop bug found via
    red-teaming actual question images (not just server behavior or MS
    text-parsing): CAIE IGCSE Chemistry Ch2 "Atomic structure" Q18's
    entire A-D answer table is a raster image, not text -- extract_lines
    only sees text blocks (PyMuPDF's own type=0), so the text-only
    y_bottom calculation below stopped right after the one-line question
    stem and silently cropped the whole answer table out of the image,
    even though optionLetters still (wrongly, via the empty-set default
    fallback) reported a full A-D set -- the crop just never showed the
    student what the options actually meant. Only images whose OWN top
    edge starts within this question's own [y_low, y_high) range count,
    so a later question's own diagram on the same page is never
    swallowed by this one's crop."""
    bottom = None
    for block in page.get_text("dict").get("blocks", []):
        if block.get("type") != 1:
            continue
        bbox = block.get("bbox")
        if not bbox:
            continue
        top, bot = bbox[1], bbox[3]
        if y_low <= top < y_high:
            bottom = bot if bottom is None else max(bottom, bot)
    return bottom


def drawing_block_bottom(page, y_low, y_high):
    """Same idea as image_block_bottom, for VECTOR-drawn diagrams (field
    lines, circles, molecule skeletons -- drawn with PDF path/line
    operators, not an embedded raster image) -- a second, real, distinct
    crop-truncation cause confirmed on CAIE IGCSE Chemistry Ch9 "Property
    of Metals" Q4 (alloy-structure atom diagrams) and CAIE A Level
    Physics Ch18 "Uniform Electric Fields" Q17 (field-line diagrams):
    both crops stopped right after the bare "A"/"B" option labels,
    because PyMuPDF's get_text('dict') has no block type for vector
    paths at all -- image_block_bottom's raster-only check can't see
    them either. page.get_drawings() is the separate API that does.
    Only drawings whose own top falls within [y_low, y_high) count, for
    the same reason as image_block_bottom: never pull in a later
    question's own diagram on the same page."""
    bottom = None
    for d in page.get_drawings():
        rect = d.get("rect")
        if not rect:
            continue
        top, bot = rect.y0, rect.y1
        if y_low <= top < y_high:
            bottom = bot if bottom is None else max(bottom, bot)
    return bottom


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
        if page.rotation != 0:
            # get_text()'s y/x coordinates come back in the PRE-rotation
            # frame, but page.rect is already the ROTATED box -- confirmed
            # real on a landscape (rotation=90) practical-paper MS page
            # where a heading's own y0 (672) exceeded page.rect.height
            # (612) entirely, collapsing the clip to zero height and
            # crashing ("Invalid bandwriter header dimensions"). Cropping
            # correctly needs the page's rotation matrix; rendering the
            # full page instead is the safe fallback -- less tight, never
            # wrong or crashing.
            images.append(page.get_pixmap(matrix=fitz.Matrix(2, 2)).tobytes("png"))
            return stitch_images_vertically(images)
        # Some MS/QP files mix landscape pages (~595pt tall) with a
        # portrait cover (~842pt), so a y-coordinate captured near one
        # page's bottom edge isn't guaranteed to stay inside another
        # page's own bounds once clipped -- confirmed real ("Invalid
        # bandwriter header dimensions" crash) even on a same-page span.
        # Clamp both edges to this page's actual height.
        top = max(0, min(y_start - 4, page.rect.height))
        bottom = (y_end - 4) if y_end is not None else page.rect.height
        bottom = max(0, min(bottom, page.rect.height))
        rect = fitz.Rect(0, top, page.rect.width, max(bottom, top + 10, 10))
        pix = page.get_pixmap(clip=rect, matrix=fitz.Matrix(2, 2))
        images.append(pix.tobytes("png"))
    else:
        first_page = doc[page_start]
        if first_page.rotation != 0:
            images.append(first_page.get_pixmap(matrix=fitz.Matrix(2, 2)).tobytes("png"))
        else:
            top1 = max(0, min(y_start - 4, first_page.rect.height))
            rect1 = fitz.Rect(0, top1, first_page.rect.width, first_page.rect.height)
            images.append(first_page.get_pixmap(clip=rect1, matrix=fitz.Matrix(2, 2)).tobytes("png"))
        for mid in range(page_start + 1, page_end):
            mid_page = doc[mid]
            images.append(mid_page.get_pixmap(matrix=fitz.Matrix(2, 2)).tobytes("png"))
        # A real, confirmed bug: `range(page_start+1, page_end)` above
        # never includes page_end itself, and this whole block used to
        # only render page_end when y_end was a real number -- silently
        # DROPPING page_end's own content from the crop IMAGE (though
        # extract_block_text's own separate boundary logic still
        # captured its text/marks correctly) any time the LAST question
        # in a document spanned onto the document's own final page. Found
        # by hand comparing a crop image against its own extracted marks
        # not matching what was visibly shown. page_end must always be
        # rendered here -- full page when y_end is None (this is the
        # true end of the document), clipped otherwise.
        if page_end > page_start:
            last_page = doc[page_end]
            if last_page.rotation != 0 or y_end is None:
                images.append(last_page.get_pixmap(matrix=fitz.Matrix(2, 2)).tobytes("png"))
            elif y_end > 4:
                bottom2 = max(0, min(y_end - 4, last_page.rect.height))
                rect2 = fitz.Rect(0, 0, last_page.rect.width, bottom2)
                images.append(last_page.get_pixmap(clip=rect2, matrix=fitz.Matrix(2, 2)).tobytes("png"))
    return stitch_images_vertically(images)


def parse_qp(pdf_path):
    doc = fitz.open(pdf_path)
    lines = extract_lines(doc)
    starts, quasi = find_question_starts(lines, doc)
    quasi_pos = sorted(_pos(q["page"], q["y0"]) for q in quasi)

    questions = []
    for i, s in enumerate(starts):
        start_pos = _pos(s["page"], s["y0"])
        end_pos = (
            _pos(starts[i + 1]["page"], starts[i + 1]["y0"])
            if i + 1 < len(starts) else _pos(doc.page_count, 0)
        )
        # A quasi-heading (a real, sentence-shaped numbered stem with no
        # A-D options nearby -- a different question format this tool
        # doesn't parse, confirmed real with NO text marker announcing
        # the format switch at all) between this question and its
        # otherwise-next boundary still marks where THIS question's own
        # content ends, even though it never becomes a question itself.
        next_quasi = next((p for p in quasi_pos if start_pos < p < end_pos), None)
        if next_quasi:
            end_pos = next_quasi

        block_lines = [l for l in lines if start_pos <= _pos(l["page"], l["y0"]) < end_pos]
        # Shares option_letters_in_block's merged-line and diagram-noise
        # handling with parse_ms -- the same real bugs (a merged
        # letter+text line, or bare element-symbol lines in a diagram)
        # can corrupt either side, and this is the one place both fixes
        # live.
        letters = option_letters_in_block(lines, start_pos, end_pos)

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

        # Text-only y_bottom misses any embedded raster-image content on
        # page_end (a diagram, or -- confirmed real -- a whole answer
        # table rendered as an image) that sits below the last detected
        # text line but still genuinely belongs to this question. Extend
        # the crop to cover it, bounded by whichever boundary already
        # applies on this page (a section break if one was found, else
        # this question's own end_pos) so a later question's own image
        # on the same page never gets pulled in.
        limit_pos = cutoff_pos if section_break_lines else end_pos
        limit_y = limit_pos[1] if limit_pos[0] == page_end else doc[page_end].rect.height
        # A generous 50pt margin ABOVE s["y0"], not an exact match --
        # confirmed real on CAIE A Level Physics Ch2 "Motion Graphs" Q14:
        # its whole stem+diagram+options is ONE big embedded image whose
        # own top edge sits ~12pt above the "14" question-number text
        # label overlaid near its top, not flush with it. A strict
        # top>=s["y0"] check missed the image entirely and truncated the
        # crop down to nothing but the bare label. 50pt comfortably
        # covers that real gap while staying far short of the ~250pt gap
        # to the previous question's own last content on the same page,
        # so it can't accidentally pull in someone else's image.
        img_y_low = max(0, s["y0"] - 50) if page_end == s["page"] else 0
        img_bottom = image_block_bottom(doc[page_end], img_y_low, limit_y)
        has_image_content = img_bottom is not None
        if has_image_content:
            # A little extra margin beyond the text-line +10 above -- a
            # real table border sits a few px past its image block's own
            # reported bbox bottom (confirmed real: +10 alone clipped the
            # bottom border row of Q18's answer table).
            img_bottom = min(img_bottom, limit_y) + 16
            y_bottom = img_bottom if y_bottom is None else max(y_bottom, img_bottom)

        draw_bottom = drawing_block_bottom(doc[page_end], img_y_low, limit_y)
        has_drawing_content = draw_bottom is not None
        if has_drawing_content:
            draw_bottom = min(draw_bottom, limit_y) + 16
            y_bottom = draw_bottom if y_bottom is None else max(y_bottom, draw_bottom)

        # A final hard clamp to the next question's own start position --
        # confirmed real: the "+16" margins above (added to catch a real
        # table border sitting a few px past its detected bbox) are each
        # clamped to limit_y BEFORE the +16 is added, so the margin itself
        # can still push a few pixels PAST it. Harmless when the next
        # question starts lower down the page, but a real, user-reported
        # visual bug when it doesn't: CAIE A Level Physics "Ch2 Motion
        # Graphs" Worksheet 1 Q43's own crop visibly showed the start of
        # Q44's own heading text ("44 The diagram shows...") at its very
        # bottom. Never legitimate for a crop to extend past where the
        # NEXT real question starts on the same page, so this is a plain
        # min(), not a re-run of the content-driven logic above.
        if end_pos[0] == page_end:
            y_bottom = min(y_bottom, end_pos[1])

        image_bytes = render_question_image(doc, s["page"], s["y0"], page_end, y_bottom)

        # A "Section B" statement-format question never prints A-D on
        # its own page (the key is stated once, before the whole
        # section) -- the crop is meaningless without it, so the fixed
        # key table (see render_statement_key_image) is attached
        # directly to this question's own image, and its options are
        # always the full A-D set since no per-question text ever
        # encodes them. NOT true for the explicit-preamble variant
        # ("Statements 1, 2 and 3 are..." -- confirmed real on IGCSE,
        # TKT-0238): that one prints its own real, per-question A-D
        # combination table directly on the page (e.g. "A 1 only  B 3
        # only  C 1 and 3  D 2 and 3"), which is now correctly part of
        # this crop once its own boundary is fixed -- stitching the
        # generic fixed key on top would bury/replace that real,
        # question-specific table with the wrong, unrelated one.
        if s.get("isStatementFormat") and not s.get("viaExplicitPreamble"):
            image_bytes = stitch_images_vertically([image_bytes, render_statement_key_image()])
            letters = {"A", "B", "C", "D"}
        image_b64 = "data:image/png;base64," + base64.b64encode(image_bytes).decode("ascii")

        # A raster image OR vector drawing in this question's own range
        # means its options very likely live INSIDE that graphic (a
        # rendered answer table or a labeled diagram are both confirmed
        # real cases), not as extractable text at all -- no text-based
        # regex can read pixels or paths. Trusting a partial text match
        # here produced confirmed-wrong results (e.g. a lone stray "A"
        # from an unrelated diagram label, with the real answer being
        # B/C/D). This tool has no OCR/LLM step for the QP side by
        # design, so the honest, safe answer is the full default set
        # rather than a specific but possibly-wrong one -- worst case is
        # an extra unclickable-but-harmless button, never a missing one.
        if (has_image_content or has_drawing_content) and not s.get("isStatementFormat"):
            letters = set()

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
    starts, _quasi = find_question_starts(lines, doc)

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
        # A block with exactly one detected option letter is genuinely
        # ambiguous between two real, opposite shapes, and the block's own
        # LENGTH is what tells them apart. A simple answer-key MS (e.g.
        # "1.\nA\n2.\nB\n3.\nB...", one bare letter per question, nothing
        # else) legitimately produces a 2-line block (the heading plus its
        # one bare letter) where that lone letter genuinely IS the whole
        # answer -- this is a common, valid format across many real papers
        # and must still be trusted. But a long explanatory block can
        # contain a stray letter that coincidentally matches
        # OPTION_LETTER_RE without being a real option marker at all --
        # confirmed real: a gap-fill MS's own explanation prose contains a
        # bare "C" from the equation "C + O2 -> CO2", wrongly treated as
        # the block's entire option universe (size 1), which then passed
        # straight through elimination as the "only remaining" answer with
        # nothing actually eliminated (CAIE IGCSE Chemistry "Ch10 Water"
        # Worksheet 2 Q12; real answer per the MS's own worked reasoning
        # was D, not the C that leaked through). Distinguish by block
        # length, EXCLUDING publisher branding/copyright boilerplate
        # (BRANDING_RE) first -- a short simple-list block ("33.\nD") can
        # legitimately gain 2 extra trailing lines purely because it's
        # the last question on a page, right before a footer like "Save
        # My Exams! - The Home of Revision" (confirmed real, CAIE A Level
        # Physics "Ch4 Forces" Worksheet 1 Q33 -- without excluding this,
        # the same page-boundary coincidence that adds real content
        # elsewhere was wrongly discarding a genuinely correct single
        # letter here). A short content block (<=3 real lines, matching
        # the simple-list format with no prose) trusts a lone letter; a
        # longer one (real explanatory prose) does not, and falls back
        # to the full option set instead.
        found_letters = option_letters_in_block(lines, start_pos, end_pos)
        content_lines = [l for l in block_lines if not BRANDING_RE.search(l)]
        if len(found_letters) >= 2 or (len(found_letters) == 1 and len(content_lines) <= 3):
            option_letters = found_letters
        else:
            option_letters = {"A", "B", "C", "D"}
        block_text = "\n".join(block_lines)

        # Check the question's own stem (bounded to the first few lines,
        # before the explanation prose) for "NOT correct"/"NOT true"
        # phrasing -- this flips which sentence pattern actually names the
        # MCQ's own answer (see NEGATED_QUESTION_RE for the full case).
        # Real MS documents use TWO genuinely different, easily-confused
        # conventions to explain a negated question, both using the same
        # word "incorrect", with opposite roles:
        #   Style 1 (direct): the one FALSE-claim option is itself called
        #   "incorrect"/"not correct" in a single sentence naming exactly
        #   one letter -- that letter directly IS the MCQ's own answer
        #   (confirmed real: "A is the incorrect statement as methane is a
        #   gas and not a liquid").
        #   Style 2 (elimination): the TRUE-claim options are each called
        #   "incorrect" IN THE SENSE OF "not the target answer" -- e.g.
        #   "Option B is incorrect" plus "Option C and D are incorrect",
        #   naming three letters combined, leaving the fourth (never
        #   called incorrect at all) as the real answer (confirmed real,
        #   CAIE IGCSE Chemistry "Ch10 Air" Worksheet 2 Q17, whose own
        #   final line spells it out explicitly: "Option A is the only
        #   one which matches with the question"). An earlier version of
        #   this fix only checked for Style 1's single-letter form and
        #   regressed this exact case from a correct A to a wrong B,
        #   because it saw the "Option B is incorrect" sentence as an
        #   isolated single-letter match without noticing the OTHER
        #   sentence eliminates two more letters (C and D) the same way.
        # Both styles use the same list-capturing shape ELIMINATION_RE
        # already parses, so collect all "X [, Y and Z] is/are incorrect"
        # mentions once and check both readings: exactly 1 letter mentioned
        # is Style 1's direct answer; exactly 3 mentioned (out of the 4
        # options) is Style 2, and the one letter never mentioned is the
        # answer by elimination.
        if NEGATED_QUESTION_RE.search("\n".join(block_lines[:6])):
            incorrect_mentioned = set()
            for em in ELIMINATION_RE.finditer(block_text):
                incorrect_mentioned.update(re.findall(r'[A-D]', em.group(1)))
            if len(incorrect_mentioned) == 1:
                answers[s["number"]] = incorrect_mentioned.pop()
                continue
            not_mentioned = option_letters - incorrect_mentioned
            if len(incorrect_mentioned) == 3 and len(not_mentioned) == 1:
                answers[s["number"]] = not_mentioned.pop()
                continue

        # A direct "X is correct" statement is the strongest signal when
        # present -- use it over elimination inference. Still only trusted
        # when exactly one such statement appears in the block (a second,
        # contradicting one is a real ambiguity, not a coin flip).
        correct_matches = {m.group(1).upper() for m in CORRECT_RE.finditer(block_text)}
        correct_matches |= {m.group(1).upper() for m in RECOGNIZED_RE.finditer(block_text)}
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


# Structured (non-MCQ) papers -- e.g. Mathematics -- have no A-D options
# for the machinery above to key off of, so this is deliberately a
# SEPARATE, much simpler splitter, not a reuse of find_question_starts.
# Real per-question navigation (practice mode: Q1's real paper, then its
# real mark scheme, then Q2, ...), per explicit direction -- the earlier
# whole-worksheet free-text-answer + AI-grading approach is disabled, see
# the (commented, not deleted) block in server.mjs.
#
# Confirmed real, this session: the IGCSE Maths worksheet template
# (savemyexams-sourced, the bulk of the real Math corpus -- 391 of the
# papers crawled so far) prints an explicit "Question N" heading on both
# the QP and the MS, in the SAME position/order on both sides -- a much
# more reliable boundary signal than MCQ's bare "N" convention, once one
# real wrinkle is worked around: this template's own embedded QP font
# (not the MS's -- confirmed only on the QP side) renders text with a
# stray space glued between EVERY character ("Q u esti o n \xa01" instead
# of "Question 1"), so a normal regex against the raw extracted text
# never matches at all. Despacing first (stripping ALL whitespace,
# including the \xa0 this font also emits) before matching sidesteps the
# corruption entirely -- safe here specifically because the only thing
# ever matched is the fixed literal word "Question", not prose that
# legitimately depends on its own spacing.
#
# The OTHER real Math template found this session (CAIE's own official
# past-paper layout -- used by the smaller, separately-sourced A-Level
# Pure Mathematics corpus) uses bare numbers with no "Question" prefix
# at all, and its own real stem text can render ABOVE its question
# number in y-order (a real, different layout quirk) -- confirmed NOT
# handled by this splitter. find_labeled_question_starts returns an
# empty list for that format rather than guessing, and the caller
# (server.mjs) falls back to the plain whole-document QP/MS links in
# that case, honestly, rather than showing a broken empty stepper.
QUESTION_LABEL_DESPACED_RE = re.compile(r'^question(\d{1,2})$', re.IGNORECASE)


def _despace(text):
    # Some savemyexams-template PDFs use \x03 (not a real space) as their
    # inter-word glyph in heading text -- e.g. "Question\x031" -- so
    # stripping \s alone leaves the digit glued to a stray control char
    # and the heading regex never matches. Strip anything that isn't a
    # letter or digit, a strict superset of \s, so both corruption styles
    # despace to the same "question1".
    return re.sub(r'[^A-Za-z0-9]+', '', text or '')


def find_labeled_question_starts(lines):
    raw = []
    for l in sorted(lines, key=lambda l: (l["page"], l["y0"])):
        m = QUESTION_LABEL_DESPACED_RE.match(_despace(l["text"]))
        if m:
            raw.append({"number": m.group(1), "page": l["page"], "y0": l["y0"]})

    # Two confirmed real-world artifacts in these savemyexams-template
    # PDFs, both caught via a full-corpus audit (checked the actual
    # rendered crops, not just the counts): (1) some MS pages carry a
    # second "Question" heading at the EXACT same (page, y0) as the real
    # one, labeled one number too high -- a ~10pt-tall duplicate text run
    # that renders as a near-blank sliver. (2) some QP questions that
    # span a page break repeat their own "Question N" heading verbatim at
    # the top of the continuation page, which would otherwise look like a
    # second, empty start for the same question. Both would silently
    # shift find()'s pairing (the browser always takes the first array
    # match) onto the wrong crop for every question after the artifact.
    starts = []
    for s in raw:
        if starts:
            prev = starts[-1]
            if prev["page"] == s["page"] and prev["y0"] == s["y0"]:
                if int(s["number"]) < int(prev["number"]):
                    starts[-1] = s
                continue
            if prev["number"] == s["number"]:
                continue
        starts.append(s)
    return starts


def extract_block_text(lines, page_start, y_start, page_end, y_end):
    """Plain text of everything between two starts, in the same
    (page, y0) reading order render_question_image crops visually --
    used only for Test-mode grading prompts (the practice-mode crop
    images don't need this at all, they're rendered straight from the
    PDF page regardless of what the text layer says)."""
    parts = []
    for l in sorted(lines, key=lambda l: (l["page"], l["y0"])):
        pos = (l["page"], l["y0"])
        if pos < (page_start, y_start):
            continue
        if y_end is not None and (l["page"], l["y0"]) >= (page_end, y_end):
            continue
        if l["page"] > page_end:
            continue
        parts.append(l["text"])
    return "\n".join(parts)


# A small, deliberately generic set of common short English words --
# NOT a dictionary or spellchecker, just a tripwire. Confirmed real bug
# this catches: some savemyexams-template PDFs embed a font whose
# encoding Caesar-shifts body text by 3 letters ("varies inversely"
# extracts as "\\ YDULHV LQYHUVHO\\"), while the bold heading font in the
# SAME document is unaffected -- so a block can extract a perfectly
# matched "Question N" heading while its own body text is unusable
# gibberish. Sending that gibberish to an LLM grading prompt would
# silently produce a meaningless score instead of failing loudly.
_COMMON_WORDS = {
    "the", "a", "an", "of", "to", "is", "are", "and", "find", "value",
    "calculate", "work", "out", "show", "that", "for", "each", "correct",
    "nearest", "write", "give", "answer", "diagram", "shows", "when",
}


def _looks_garbled(text):
    # A fourth, distinct corruption confirmed in this same corpus: some
    # MS files' final-answer digits extract as Unicode "Mathematical
    # Alphanumeric Symbols" codepoints (e.g. U+1D7CE) that do NOT
    # correspond to their visually-rendered digit -- caught for real by
    # sending a genuinely correct student answer through end-to-end and
    # getting graded against a completely different number (a font
    # remapped "0.394" to text that reads as "00.333333"). Unlike the
    # Caesar-shift/glued-space variants, this leaves ordinary prose in
    # the SAME block completely readable, so the common-word ratio check
    # below never sees it -- exactly the failure mode that check alone
    # missed. This block is never legitimately used by this corpus's
    # real content (plain digits/letters throughout), so any character
    # in it is treated as an unconditional corruption signal.
    if any(0x1D400 <= ord(c) <= 0x1D7FF for c in text):
        return True
    words = re.findall(r"[A-Za-z]{2,}", text.lower())
    if len(words) < 6:
        return False  # too short a sample to judge either way -- don't flag
    hits = sum(1 for w in words if w in _COMMON_WORDS)
    return (hits / len(words)) < 0.08


def parse_structured(pdf_path):
    """One image + one text block per question/answer block, cropped
    exactly like a real MCQ question (reuses render_question_image) but
    with no option-letter detection or answer resolution at all -- this
    format doesn't have either. Works for QP and MS alike; the caller
    decides which. `marks` is the sum of every [N] mark allocation found
    in the block's own text (0 if none/unparseable); `corrupted` flags a
    block whose text extraction is very likely unusable prose (see
    _looks_garbled) -- the image is still fine either way, only the text
    (used for Test-mode LLM grading, not practice-mode display) is
    suspect."""
    doc = fitz.open(pdf_path)
    lines = extract_lines(doc)
    starts = find_labeled_question_starts(lines)
    blocks = []
    for i, s in enumerate(starts):
        if i + 1 < len(starts):
            end_page, end_y = starts[i + 1]["page"], starts[i + 1]["y0"]
        else:
            end_page, end_y = doc.page_count - 1, None
        image_bytes = render_question_image(doc, s["page"], s["y0"], end_page, end_y)
        image_b64 = "data:image/png;base64," + base64.b64encode(image_bytes).decode("ascii")
        text = extract_block_text(lines, s["page"], s["y0"], end_page, end_y)
        marks = sum(int(m) for m in re.findall(r'\[(\d+)\]', text))
        blocks.append({
            "questionNumber": s["number"],
            "image": image_b64,
            "text": text,
            "marks": marks,
            "corrupted": _looks_garbled(text),
        })
    doc.close()
    return blocks


def find_bare_number_question_starts(lines):
    """IGCSE/A-Level Physics/Chemistry/Biology Theory papers (2026-09-05
    survey) use a completely different QP template from Math's "Question
    N": each question starts with a BARE 1-2 digit number, bold or not,
    at a left-margin x0 -- but a real paper's own diagrams/graphs are
    FULL of other bare digits (axis tick labels, table values) at every
    x-position including that same margin, so position/boldness alone
    both produce false positives on real papers (confirmed: one real
    worksheet had a bold-only false-negative on Question 1, another had
    axis labels landing inside x0<100 alongside real headings). The one
    signal that held clean across 15 real samples spanning all three
    subjects: real question numbers are the only candidates that form a
    STRICT 1,2,3,4,5... sequence in reading order -- a diagram value or a
    numbered sub-list inside an answer ("1. ... 2. ... 3. ...") never
    lines up as the exact next integer right when expected, so a greedy
    "accept only if it equals the running count + 1" walk silently
    absorbs every false positive without ever needing to consult
    position or boldness at all."""
    candidates = []
    for l in sorted(lines, key=lambda l: (l["page"], l["y0"])):
        if l["page"] == 0:
            continue  # page 0 is always this corpus's own cover/metadata sheet
        text = l["text"].strip()
        # Usually the number sits alone on its own line. But when a question's
        # first part starts immediately (no diagram/table pushing it down),
        # some papers run "7 (a) For each of the following..." as ONE line --
        # confirmed real on a Physics paper where this cost a whole missed
        # question. A-Level Math has its own variant of the same problem:
        # several real headings merge straight into a full sentence with NO
        # lettered sub-part at all ("1       Functions f and g are defined
        # by..."), confirmed real to silently zero out an entire paper's QP
        # side (this shape recurs across many Math worksheets, each losing
        # most or all of their real questions the same way). Reuses the
        # QUESTION_BARE_RE shape already used elsewhere in this file for
        # exactly this pattern. Match any shape; the monotonic-sequence
        # filter below is what actually keeps false positives out, not
        # this regex.
        m = (
            re.match(r'^(\d{1,2})$', text)
            or re.match(r'^(\d{1,2})\s*\(a\)', text)
            or re.match(r'^(\d{1,2})\s+[A-Z]', text)
        )
        # 100 missed a real heading confirmed at x0=107 (A-Level Biology's
        # own margin runs slightly wider than the vendor samples this
        # threshold was first tuned on) -- 120 covers it. The monotonic
        # sequence gate below, not this threshold, is what actually keeps
        # false positives out (proven on 15 real samples), so widening
        # this modestly is safe for the same reason it was safe on the MS
        # side.
        if m and l["x0"] < 120:
            candidates.append({"number": int(m.group(1)), "page": l["page"], "y0": l["y0"]})

    # Confirmed real on several A-Level Math papers: a heading merges
    # into a full sentence with no "(a)" marker at all ("2       The
    # function f is defined by...") or sits at an unusual x0, so it never
    # becomes a candidate here -- and a strict walk then rejects EVERY
    # later real heading too, since none of them will ever equal an
    # "expected" that's stuck one number behind forever. Reuses the same
    # gap-of-1 tolerance already proven safe on the MS side.
    return _monotonic_accept(candidates)


# SUPERSEDED 2026-09-06: the original approach scanned for "[Total: N]" /
# "TOTAL = [N]" phrasings on the theory that MS files "do NOT reliably
# restate a bare question number." That assumption was wrong -- direct
# inspection of the actual failing PDFs (Math P1, A-Level Physics, IGCSE
# Chemistry Practical, all "Save My Exams" vendor MS files) showed every
# one of them DOES restate a bare-number heading ("1", "2", ... at the
# left margin) exactly like the QP side, and "[Total: N]"/"TOTAL = [N]"
# barely occurs at all -- real files instead scatter a bare "[N]" after
# EVERY sub-part, so summing those brackets within a block gives the
# question's total. Reusing find_bare_number_question_starts (already
# proven 15/15 on the QP side, and independently confirmed here to
# correctly find 9/9, 7/7 and 4/4 real headings on three previously-0%
# papers) replaces the marker search entirely.


# A real MS vendor format confirmed distinct from the prose "bare-number
# heading" shape above: a literal Question|Answer|Marks TABLE, where the
# Question column holds per-PART labels ("1(a)", "1b)", "4(c)(i)") --
# sometimes merged onto one line ("1(a)"), sometimes split across two
# spans ("1" then "(a" as separate lines, same y-band, at a WIDER x0 than
# the prose heading's <100 margin. Widening the position gate to catch
# these is NOT safe on its own, though -- confirmed real: a Biology MS's
# own mark-scheme rubric is a tightly-packed numbered bullet list ("1" /
# "2" / ... / "9", one reason per line) sitting at x0=133, squarely in
# that widened zone, and it happened to start right where the real
# question sequence was expecting its next number, inflating one paper's
# answer count from 6 real questions to 9 bogus ones. The signal that
# actually separates the two: every real widened-zone heading confirmed
# on real hybrid table/prose documents is immediately followed, in
# reading order, by a lettered sub-part marker ("(a" or "(a)") -- a
# rubric list item is followed by its own explanatory text instead. A
# BARE lone digit (no attached letter) in the widened zone only counts as
# a candidate if that next-line check passes; a digit merged with its own
# letter on the same line ("1(a)") needs no such check, since the letter
# is already proof enough.
# A bare "(" alone (no "a" or ")") is a real, confirmed variant -- one
# vendor's own font drops the "a)" glyphs from "(a)" on some pages (the
# same class of font-rendering defect diagnosed earlier for "Question N"
# headings), leaving only the opening paren extractable. Rejecting that
# lone "(" cascaded into losing an ENTIRE document: real heading "1"
# failed this check, so the monotonic walk's "expected" counter never
# advanced past 1, silently discarding every later real heading too.
_MS_SUBPART_RE = re.compile(r'^\(a?\)?', re.IGNORECASE)


def find_ms_heading_candidates(lines):
    """Every position-plausible 'this might start question N' candidate,
    BEFORE the monotonic accept-if-next-expected-integer walk. Exposed
    separately from find_ms_question_starts so an LLM verification pass
    (see llm_verify_ms_headings) can judge the same raw candidates the
    heuristic considered, rather than only what already survived it."""
    ordered = sorted(lines, key=lambda l: (l["page"], l["y0"]))
    candidates = []
    for idx, l in enumerate(ordered):
        if l["page"] == 0:
            continue
        text = l["text"].strip()
        if l["x0"] >= 200:
            continue
        m = re.match(r'^(\d{1,2})$', text)
        if m:
            if l["x0"] >= 100:
                # "next in reading order" isn't reliable here -- the raw
                # PDF content stream's emission order for same-line
                # neighbors is inconsistent: confirmed real with a "[1]"
                # marks bracket sharing this exact y0 emitted BEFORE the
                # "(a" sub-part marker in one document, and "(a" itself
                # emitted BEFORE its own heading digit in another. Check
                # a window on BOTH sides of this candidate, not just
                # forward, since which direction is a real signal varies
                # per document.
                # REVERTED a wider (100pt) forward window: it fixed one
                # narrow real case (a heading opening into several lines
                # of plain caption before its first "(a)") but caused
                # much broader collateral damage confirmed real on a
                # full-corpus rebuild -- Biology mark schemes are DENSE
                # with parenthetical fragments, so a 100pt/10-line forward
                # reach let many rubric-list noise digits coincidentally
                # find SOME "(...)"-shaped text within range and get
                # accepted as real headings (one paper's real 4 questions
                # inflated to 11 candidates). A tight window producing a
                # few false negatives is a better trade than a loose one
                # producing many more false positives.
                nearby = any(
                    o["page"] == l["page"] and abs(o["y0"] - l["y0"]) < 10
                    and _MS_SUBPART_RE.match(o["text"].strip())
                    for o in ordered[max(0, idx - 4):idx] + ordered[idx + 1:idx + 5]
                )
                if not nearby:
                    continue
        elif len(text) <= 8:
            m = re.match(r'^(\d{1,2})\s*\(?[a-zA-Z]\)?', text)
        if m:
            candidates.append({
                "number": int(m.group(1)), "page": l["page"], "y0": l["y0"], "idx": idx,
            })
    return candidates, ordered


def _monotonic_accept(candidates):
    # A genuine, permanent source gap is real and confirmed (an MS whose
    # question 5 mark scheme was simply never included -- a blank page
    # where it should be, jumping straight from "4" content to "6"): a
    # strict "must equal expected exactly" walk gets stuck at 4 forever
    # once 5 never appears, silently losing every real later question too
    # (6, 7, ...). Look ahead before rejecting a number greater than
    # expected: if "expected" genuinely never occurs anywhere later in
    # this candidate list either, the gap is real, not a still-pending
    # match -- skip forward to this candidate instead of stalling.
    remaining_numbers = [c["number"] for c in candidates]
    starts = []
    expected = 1
    for i, c in enumerate(candidates):
        if c["number"] == expected:
            starts.append({"number": str(c["number"]), "page": c["page"], "y0": c["y0"]})
            expected += 1
        elif c["number"] == expected + 1 and expected not in remaining_numbers[i:]:
            # Confirmed real gaps (Math and this Chemistry corpus alike)
            # are always exactly ONE missing question -- restricting the
            # skip to a gap of 1 is what actually keeps this safe:
            # confirmed real on a DIFFERENT document where a stray noise
            # digit ("8") coincidentally appeared once near unrelated
            # content, got correctly skipped as a false candidate, but
            # then made "expected(8) not in remaining" true once real
            # processing passed it -- without this == expected+1 guard,
            # that let the walk leap to a much later, unrelated number
            # (11) as if it were a real continuation, when the document's
            # real content had simply ended at question 7.
            starts.append({"number": str(c["number"]), "page": c["page"], "y0": c["y0"]})
            expected = c["number"] + 1
    return starts


def find_ms_question_starts(lines):
    candidates, _ = find_ms_heading_candidates(lines)
    return _monotonic_accept(candidates)


def _has_ambiguous_cluster(starts, threshold=40):
    """A rubric bullet list (real, confirmed: Biology mark schemes listing
    several acceptable reasons as "1"/"2"/"3"...) sits at the same kind of
    left margin as a real heading and can coincidentally continue the
    monotonic sequence -- but its items pack in at ~12-13pt line spacing,
    far tighter than the whitespace between two real questions. Flags a
    paper as worth an LLM check rather than trusting the heuristic blind."""
    for i in range(1, len(starts)):
        a, b = starts[i - 1], starts[i]
        if a["page"] == b["page"] and (b["y0"] - a["y0"]) < threshold:
            return True
    return False


def llm_verify_ms_headings(candidates, ordered):
    """Ask Gemini which raw candidates are real question-number headings
    vs. rubric-list bullet items -- the one signal position/regex heuristics
    can't reliably see (both shapes can share the same left margin and
    both can coincidentally continue 1,2,3... in sequence). One call per
    ambiguous document; each candidate gets a few lines of real
    surrounding text so the model has the same context a human marker
    would use to tell "start of question 4" from "reason 4 in this list".
    Returns the same candidate dicts, filtered to the model's verdict --
    falls back to returning candidates UNCHANGED (i.e. trust the
    heuristic) only once every real provider/retry option is exhausted,
    never blocks the pipeline."""
    import os as _os, json as _json, re as _re, time as _time
    import urllib.request as _ur, urllib.error as _ue

    items = []
    for i, c in enumerate(candidates):
        idx = c["idx"]
        before = " / ".join(o["text"].strip() for o in ordered[max(0, idx - 2):idx])
        after = " / ".join(o["text"].strip() for o in ordered[idx + 1:idx + 4])
        items.append(
            f'{i}: number="{c["number"]}" | before="{before}" | AFTER="{after}"'
        )
    prompt = (
        "You are looking at candidate lines from a Cambridge exam mark scheme "
        "PDF, each a bare number that MIGHT be the start of a new numbered "
        "question (like \"4 (a) State...\") or might instead be one bullet "
        "item in a numbered list of acceptable answers/reasons inside some "
        "OTHER question's mark scheme (like \"3 hydrogen bonds broken ;\"). "
        "For each candidate below, decide which it is. A real question start "
        "is normally followed by a lettered sub-part marker like \"(a)\" or by "
        "substantial new question content; a list item is normally followed "
        "by a short answer phrase ending in a semicolon or similar, often "
        "packed tightly with neighboring list items.\n\n"
        + "\n".join(items)
        + "\n\nReply with ONLY a JSON array of the integer indices (the number "
        "before each colon above) that are REAL question-start headings, "
        "e.g. [0,2,5]. No other text."
    )

    def _extract_indices(text):
        m = _re.search(r'\[[\d,\s]*\]', text)
        if not m:
            return None
        return set(_json.loads(m.group(0)))

    def _call_openrouter():
        api_key = _os.environ.get("OPENROUTER_API_KEY")
        if not api_key:
            return None
        model = _os.environ.get("OPENROUTER_TEXT_MODEL", "nvidia/nemotron-3-super-120b-a12b:free")
        # Confirmed real: two identical calls on the same document
        # returned different index sets (a correct [0,1,16,17] one run,
        # an under-filtered [0,1] the next). temperature 0 doesn't
        # guarantee bit-for-bit reproducibility on every provider, but
        # cuts sampling variance on what's meant to be a judgment call,
        # not creative writing.
        body = _json.dumps({
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0,
        }).encode("utf-8")
        req = _ur.Request(
            "https://openrouter.ai/api/v1/chat/completions",
            data=body,
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"},
        )
        with _ur.urlopen(req, timeout=30) as r:
            resp = _json.load(r)
        return resp["choices"][0]["message"]["content"]

    def _make_gemini_caller(model_name):
        def _call():
            api_key = _os.environ.get("GEMINI_API_KEY")
            if not api_key:
                return None
            body = _json.dumps({"contents": [{"parts": [{"text": prompt}]}]}).encode("utf-8")
            url = (
                "https://generativelanguage.googleapis.com/v1beta/models/"
                f"{model_name}:generateContent?key={api_key}"
            )
            req = _ur.Request(url, data=body, headers={"Content-Type": "application/json"})
            with _ur.urlopen(req, timeout=30) as r:
                resp = _json.load(r)
            return resp["candidates"][0]["content"]["parts"][0]["text"]
        return _call

    # Gemini's non-reasoning models return a clean, correct, single-line
    # answer fast -- but its free tier is only 20 requests/DAY *per
    # project per model* (confirmed real via the actual 429 body, not the
    # 1500/day this codebase's own grading path assumed elsewhere), so a
    # few dozen ambiguous documents can burn through one model's quota
    # inside a single debugging session. Each Gemini model name is billed
    # against its OWN separate quota bucket, so round-robining across
    # several (flash, flash-lite, the newer 3.6-flash) multiplies the
    # real daily ceiling instead of hitting the same wall three times.
    # OpenRouter's free reasoning models are the LAST resort, not
    # preferred, despite a nominally higher ceiling -- confirmed real:
    # they write their entire chain-of-thought into the same token budget
    # as the final answer and reliably hit finish_reason="length" with
    # content=None on a real-sized prompt, even at max_tokens=16000.
    providers = [
        ("gemini-3.5-flash-lite", _make_gemini_caller("gemini-3.5-flash-lite")),
        ("gemini-3.6-flash", _make_gemini_caller("gemini-3.6-flash")),
        ("gemini-3.5-flash", _make_gemini_caller("gemini-3.5-flash")),
        ("openrouter", _call_openrouter),
    ]
    def _get_one_verdict():
        for provider, call in providers:
            for attempt in range(3):
                try:
                    text = call()
                    if text is None:
                        break  # no key configured for this provider, try the next
                    keep = _extract_indices(text)
                    if keep is None:
                        break
                    return keep
                except _ue.HTTPError as e:
                    if e.code == 429 and attempt < 2:
                        _time.sleep(8 * (attempt + 1))
                        continue
                    break
                except Exception:
                    break
        return None

    # A single verdict isn't trustworthy on its own -- confirmed real:
    # the identical prompt against the identical document returned a
    # correct 4-heading answer on one call and an under-filtered
    # 2-heading answer on the next (LLM sampling variance, not a bug),
    # and blindly trusting one-shot verdicts across many documents made
    # OVERALL accuracy worse than not asking at all (a real regression:
    # 97%->94% in one full-corpus run). Require two independent verdicts
    # to agree exactly before overriding the heuristic; any disagreement,
    # or fewer than two successful calls, means trust the heuristic
    # instead -- silence (no correction) is the safe failure mode here,
    # not a guess.
    first = _get_one_verdict()
    if first is None:
        return candidates
    second = _get_one_verdict()
    if second is None or first != second:
        return candidates
    if not first:
        # Confirmed real: the model can be CONSISTENTLY wrong, not just
        # inconsistent -- both calls agreeing on an EMPTY set turned 7
        # papers that had at least some answers (including papers that
        # heuristic already matched exactly) into papers with NO answers
        # shown at all in Practice mode. A worse-than-original count is
        # recoverable; zero is not -- treat empty agreement as a failure
        # to verify, not a real verdict.
        return candidates
    return [c for i, c in enumerate(candidates) if i in first]


def parse_theory_qp(pdf_path):
    """QP side of a Theory paper -- bare-number headings, cropped exactly
    like parse_structured's blocks."""
    doc = fitz.open(pdf_path)
    lines = extract_lines(doc)
    starts = find_bare_number_question_starts(lines)
    blocks = []
    for i, s in enumerate(starts):
        if i + 1 < len(starts):
            end_page, end_y = starts[i + 1]["page"], starts[i + 1]["y0"]
        else:
            end_page, end_y = doc.page_count - 1, None
        image_bytes = render_question_image(doc, s["page"], s["y0"], end_page, end_y)
        image_b64 = "data:image/png;base64," + base64.b64encode(image_bytes).decode("ascii")
        blocks.append({"questionNumber": s["number"], "image": image_b64})
    doc.close()
    return blocks


def parse_theory_ms(pdf_path):
    """MS side of a Theory paper -- delimited by find_ms_question_starts,
    paired to the QP's questions BY NUMBER. Marks-per-question notation
    varies by vendor section (bracketed "[N]" in prose, a bare standalone
    digit in a table's own Marks column) so both are summed; a real block
    only ever uses one convention, so this never double-counts."""
    doc = fitz.open(pdf_path)
    lines = extract_lines(doc)
    candidates, ordered = find_ms_heading_candidates(lines)
    starts = _monotonic_accept(candidates)
    if _has_ambiguous_cluster(starts):
        # The tight-cluster signature (see _has_ambiguous_cluster) means
        # the heuristic alone can't tell a real heading from a rubric
        # list item here -- ask the model, which has the semantic context
        # (what follows each number reads like a new question vs. a list
        # entry) that no position/regex rule can see.
        confirmed = llm_verify_ms_headings(candidates, ordered)
        llm_starts = _monotonic_accept(confirmed)
        # Confirmed real: a non-empty confirmed set can still walk to a
        # completely EMPTY starts list (e.g. it drops the very candidate
        # that would have matched "expected=1", so the monotonic walk
        # never advances at all) -- turning papers that had SOME answers,
        # including some the heuristic already matched exactly, into
        # papers with NONE shown in Practice mode. That check belongs
        # here, against the same monotonic-walked shape parse_theory_ms
        # actually uses, not against the raw candidate set inside
        # llm_verify_ms_headings, which can't see this failure mode.
        if llm_starts:
            starts = llm_starts
    blocks = []
    for i, s in enumerate(starts):
        if i + 1 < len(starts):
            end_page, end_y = starts[i + 1]["page"], starts[i + 1]["y0"]
        else:
            end_page, end_y = doc.page_count - 1, None
        image_bytes = render_question_image(doc, s["page"], s["y0"], end_page, end_y)
        image_b64 = "data:image/png;base64," + base64.b64encode(image_bytes).decode("ascii")
        text = extract_block_text(lines, s["page"], s["y0"], end_page, end_y)
        # A vendor's own "[Total: N]" is authoritative when present -- confirmed
        # real that some blocks carry ONLY this (individual sub-part marks shown
        # as bare codes like "B1"/"C1", never bracketed), which the old bare
        # `[N]` sum entirely missed, marking a real, correctly-paired answer as
        # 0 marks. Checked first and used alone, never added to the bracket
        # sum, so a block that also has per-part `[N]` brackets doesn't get
        # double-counted against its own restated total.
        total_match = re.search(r'\[\s*Total\s*:?\s*(\d+)\s*\]', text, re.IGNORECASE)
        bracket_marks = sum(int(m) for m in re.findall(r'\[(\d+)\]', text))
        bare_marks = sum(
            int(l["text"].strip())
            for l in lines
            if re.match(r'^\d{1,2}$', l["text"].strip())
            and l["x0"] > 500
            and (l["page"] > s["page"] or (l["page"] == s["page"] and l["y0"] >= s["y0"]))
            and (end_y is None or l["page"] < end_page or (l["page"] == end_page and l["y0"] < end_y))
        )
        marks = int(total_match.group(1)) if total_match else (bracket_marks or bare_marks)
        blocks.append({
            "questionNumber": s["number"],
            "image": image_b64,
            "marks": marks,
        })
    doc.close()
    return blocks


def main():
    if len(sys.argv) == 4 and sys.argv[1] == "--theory":
        qp_path, ms_path = sys.argv[2], sys.argv[3]
        print(json.dumps({
            "questions": parse_theory_qp(qp_path),
            "answers": parse_theory_ms(ms_path),
        }))
        return
    if len(sys.argv) == 4 and sys.argv[1] == "--structured":
        qp_path, ms_path = sys.argv[2], sys.argv[3]
        print(json.dumps({
            "questions": parse_structured(qp_path),
            "answers": parse_structured(ms_path),
        }))
        return
    if len(sys.argv) != 3:
        print("usage: extract_mcq.py <qp_pdf_path> <ms_pdf_path>", file=sys.stderr)
        print("       extract_mcq.py --structured <qp_pdf_path> <ms_pdf_path>", file=sys.stderr)
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
