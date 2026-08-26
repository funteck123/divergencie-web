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
    two, one half missing its own numbered statements entirely."""
    cur = lines[idx]
    for j in range(max(0, idx - 5), idx):
        other = lines[j]
        if other["page"] != cur["page"]:
            continue
        gap = cur["y0"] - other["y0"]
        if 0 < gap <= max_gap and re.match(r'^\d{1,2}$', other["text"]) and abs(other["size"] - cur["size"]) < 1:
            return True
    return False


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


def _has_statement_markers(nearby, min_count=2):
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
    below instead."""
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
            starts.append({
                "number": m.group(1), "inlineText": (m.group(2) or "").strip(),
                "page": line["page"], "y0": line["y0"],
                "isStatementFormat": _has_statement_markers(lines[idx + 1: idx + 55]),
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
            if len(_stem_with_continuation(lines, idx, content)) >= 20:
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
                is_statement = _has_statement_markers(nearby)
                if has_options or has_image or is_statement:
                    starts.append({
                        "number": m.group(1), "inlineText": content,
                        "page": line["page"], "y0": line["y0"],
                        "isStatementFormat": is_statement,
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
                is_statement = _has_statement_markers(nearby)
                if has_options or has_image or is_statement:
                    starts.append({
                        "number": m.group(1), "inlineText": content.strip(),
                        "page": line["page"], "y0": line["y0"],
                        "isStatementFormat": is_statement,
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
            if any(SENTENCE_START_RE.match(c["text"]) for c in candidates):
                nearby = lines[idx + 1: idx + 55]
                has_options = any(OPTION_LETTER_RE.match(l["text"]) for l in nearby)
                has_image = _has_nearby_image(page_images, line["page"], line["y0"])
                # _has_statement_markers does its own internal,
                # boundary-scoped check for real A-D options -- NOT
                # this unbounded has_options -- confirmed real
                # regression from using the unbounded one: a short
                # statement question's 30-line lookahead reached past
                # its own end into the NEXT question's real options.
                is_statement = _has_statement_markers(nearby)
                if has_options or has_image or is_statement:
                    starts.append({
                        "number": m.group(1), "inlineText": "",
                        "page": line["page"], "y0": line["y0"],
                        "isStatementFormat": is_statement,
                    })
                else:
                    quasi.append({"page": line["page"], "y0": line["y0"]})

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
    return [starts[i] for i in seq_idx], quasi


def _pos(page, y0):
    return (page, y0)


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

        image_bytes = render_question_image(doc, s["page"], s["y0"], page_end, y_bottom)

        # A "Section B" statement-format question never prints A-D on
        # its own page (the key is stated once, before the whole
        # section) -- the crop is meaningless without it, so the fixed
        # key table (see render_statement_key_image) is attached
        # directly to this question's own image, and its options are
        # always the full A-D set since no per-question text ever
        # encodes them.
        if s.get("isStatementFormat"):
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
        option_letters = option_letters_in_block(lines, start_pos, end_pos) or {"A", "B", "C", "D"}
        block_text = "\n".join(block_lines)

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
