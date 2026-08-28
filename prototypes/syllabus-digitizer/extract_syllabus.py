#!/usr/bin/env python3
# Turns a Cambridge syllabus booklet PDF into a structured topic outline --
# NO LLM call, matching this repo's other digitizer prototypes: this is a
# text/layout problem (find the "Subject content" section, find its heading
# hierarchy), not a judgment problem, so it should be free, instant and
# deterministic.
#
# Real, honest limitation, found live testing against ~10 syllabi across
# sciences/humanities/languages: every Cambridge syllabus PDF (2020-2028
# cycles, at least) shares one production template (font family
# "HelveticaNeueLTW1G"), which is the entire reason this works generically
# across 44 very different subjects without per-subject rules:
#   - Its own Contents page (always page 2 or 3) lists numbered top-level
#     chapters with dot-leader page numbers ("3  Subject content .... 12"),
#     which is what locates the section boundary -- far more reliable than
#     scanning for a heading by text/font, since the boundary is stated
#     explicitly by the document itself.
#   - Within that section, heading lines use the "-Bd" (bold) weight of
#     that font; sub-labels like "Core"/"Supplement"/"Focus points" use
#     "-Roman" (regular); body/bullet text uses "-Lt" (light). This 3-way
#     split is what tells a heading ("1.2  Motion") apart from a numbered
#     objective ("1  Define speed...") even though both start with a bare
#     digit -- text content alone can't tell them apart, only the font can.
#
# One genuine exception found: Global Perspectives' syllabus doesn't have a
# "Subject content" chapter at all (its chapter 3 is "Approaches to
# teaching and learning" -- that subject's actual content lives inside the
# assessment chapter instead, a real structural outlier, not a bug here).
# Handled by falling back to whatever chapter 3 actually is, flagged in the
# output so the UI can show it's a guess rather than silently mislabeling.
import sys
import os
import re
import json
import fitz

# Two real TOC styles found across the 44 subjects in this template family:
# the newer one numbers chapters bare ("3  Subject content .... 12"), the
# older one (Islamiyat, Pakistan Studies, and others still on an earlier
# syllabus refresh) puts a period right after the number ("6.  Syllabus
# content .... 15") -- the trailing "\.?" covers both without needing two
# separate patterns.
TOC_LINE_RE = re.compile(r'^(\d+)\.?\s+(.+?)\s*\.{2,}\s*(\d+)\s*$')
# Optional single-letter prefix -- Co-ordinated/Combined Science number their
# per-discipline sections "B1"/"B2.1" (Biology), "C1" (Chemistry), "P1"
# (Physics) instead of bare digits. Found live: without the "[A-Z]?", every
# heading in those two subjects (388 topics combined, ~19% of the whole
# library) silently fell through to code=None/depth=0, flattening their
# entire outline with no error or warning.
HEADING_CODE_RE = re.compile(r'^([A-Z]?\d+(?:\.\d+){0,3})\.?\s*(.*)$')
BARE_CODE_RE = re.compile(r'^[A-Z]?\d+(?:\.\d+){0,3}\.?$')
HEADING_SIZE_THRESHOLD = 13
# A lettered/numbered sub-part marker is real content (identifies which
# sub-part this is), unlike a plain bullet glyph -- kept visible rather
# than normalised away. The "(?!\d)" on the numbered form is load-bearing:
# without it, a decimal value printed on its own line (e.g. "9.8 m/s2", a
# real physical constant, not a list item) gets misread as marker "9."
# plus item text "8 m/s2" -- found live testing Physics' free-fall
# acceleration value.
LETTERED_MARKER_RE = re.compile(r'^(\(?[a-z]\)|\(?[ivx]+\)|\d{1,2}[\.\)](?!\d))\s*')
# \x07 is the private-use bullet glyph Cambridge's own Wingdings-based
# bullet font extracts as (never a plain bullet character) -- found live
# testing across several subjects; without recognising it, every bullet
# point in a subject's content gets silently space-joined into one
# run-on line.
GLYPH_BULLET_RE = re.compile(r'^[•\-–\x07]\s*')
# Cambridge sometimes prints a numbered marker (10 and above) as a bare
# number immediately followed, in the SAME text run, by its decorative
# bullet glyph -- e.g. "10\t \x07Determine..." -- rather than as two
# clean separate lines the way markers 1-9 usually appear -- also seen with
# a full dotted code ("1.1.1\t \x07The purpose and nature...") rather than
# just a bare number. Stripping this prefix before checking for a glyph is
# what catches both cases; found live testing Physics' Supplement section
# (items 10-13 glued into the previous bullet's text with the raw glyph
# embedded mid-sentence) and Business Studies/Psychology (whole dotted
# sub-headings demoted to body/label text the same way), since a plain
# "starts with the glyph" check only looks at character position 0.
LEADING_CODE_RE = re.compile(r'^[A-Z]?\d{1,2}(?:\.\d{1,2}){0,3}\s*')
# A literal tab (Biology: "10\tState that...") or a Unicode en-space
# (Mathematics: "1  Measure and draw...") -- two different real
# separator characters Cambridge uses between a bare number and its text
# on the SAME line, found live testing each subject in turn.
NUMBERED_ITEM_SEP_RE = re.compile('^\\d{1,2}[\t\u2002]')
# Known recurring two-column-table header labels that print in bold in
# this template despite being structurally a label, not a heading -- see
# the classification code below for why this matters. Not exhaustive by
# construction (a new subject could use a different bold column header
# this list doesn't know about); add to this set if another one turns up.
BOLD_COLUMN_HEADER_LABELS = {"notes and examples", "learning outcomes"}
# Cambridge's own inline-annotation convention: an aside ("Note: diagrams
# are not required.", "Note: Candidates will not be required to answer
# questions on the dissolution of a partnership...") prints its lead-in
# word bold, same weight as a real heading. When the whole note fits on
# one bold line, this was already harmless (a short, standalone spurious
# node -- see the false-positive-heading limitation). Found live testing
# Accounting: when the note runs onto a SECOND, non-bold line, the split
# is far worse -- the first line becomes a heading title truncated mid-
# sentence, and the rest is orphaned as that fake heading's own content,
# scrambling a single sentence into a nonsense partial-sentence title
# plus a dangling fragment. Treating it as plain body text instead (kind
# "body", not "heading") lets it flow into the surrounding paragraph
# exactly like non-bold text does, reconstructing the original sentence
# whether it's one bold line or spans onto a second regular one.
NOTE_ANNOTATION_RE = re.compile(r'^note:\s', re.IGNORECASE)
# Only the true private-use glyph, never a plain dash/bullet character, is
# checked AFTER stripping a leading code -- found live testing Chemistry's
# ion notation: an anion's charge prints as a superscript run starting
# with a digit and an en-dash ("2–", meaning a 2- charge), and PyMuPDF
# sometimes puts that superscript on its own "line" object. Stripping the
# leading "2" as if it were a numbered-marker code left a bare "–", which
# the FULL glyph set (including dashes) then wrongly matched as a bullet
# start, injecting a spurious break and losing the charge value entirely
# ("CO3" / "•  , by reaction..." instead of "CO3 2–, by reaction..."). A
# real decorative-glyph-after-a-stripped-code only ever uses \x07 (the
# "10\t \x07Determine..." pattern), never a plain dash, so this narrower
# check is safe for that case and closes off the false positive here.
GLYPH_ONLY_RE = re.compile(r'^\x07\s*')


def strip_decorative_glyph(text):
    """Strips a leading decorative bullet glyph, tolerating an optional
    leading numeric code (bare or dotted) immediately before it. Returns
    the text unchanged if no glyph is found either way."""
    without_code = LEADING_CODE_RE.sub("", text, count=1)
    if GLYPH_ONLY_RE.match(without_code):
        return GLYPH_ONLY_RE.sub("", without_code, count=1)
    return text
NOISE_PATTERNS = [
    re.compile(r'^www\.cambridgeinternational\.org', re.IGNORECASE),
    re.compile(r'^Back to contents page$', re.IGNORECASE),
    # Three real running-header phrasings for the same boilerplate,
    # found live across different subjects: "syllabus for 2026, 2027 and
    # 2028" (no exam/examination word at all -- Chemistry, Physics),
    # "syllabus for exams in 2027" (newer template), "Syllabus for
    # examination in 2026" (older template -- Islamiyat, Pakistan
    # Studies). Each fix here caught the previous phrasing but missed
    # the others, letting that specific header leak through as a fake
    # "[Cambridge IGCSE ... Subject content]" label each time -- the
    # "exams?/examination" word is now optional so all three match.
    re.compile(r'syllabus for (?:(?:exams?|examination)\s+in\s+)?\d{4}', re.IGNORECASE),
    # A bare italic "continued" at the bottom of a page is a decorative
    # hint that the current topic carries onto the next page -- not real
    # body text. Found live testing Physics: it was getting glued onto
    # whatever bullet content came right before it ("...is not required)
    # continued"), since nothing distinguished it from an ordinary body
    # line. No genuine sentence is just this one word alone on its line.
    re.compile(r'^continued$', re.IGNORECASE),
]
# A bare page-number footer is ALWAYS light-weight ("-Lt") in this
# template, never bold -- kept as its own check, gated on font, rather
# than folded into NOISE_PATTERNS above. Found live testing Physics: a
# real bare-digit CHAPTER code ("1", printed on its own line just before
# its title, e.g. "Motion, forces and energy") is visually identical text
# to a page-number footer but IS bold -- treating both as noise
# unconditionally was silently discarding every top-level chapter's own
# number, leaving every chapter title with code=None instead of its real
# code.
BARE_PAGE_NUMBER_RE = re.compile(r'^\d+$')


def is_noise(text):
    return any(p.search(text) for p in NOISE_PATTERNS)


def find_subject_content_range(doc):
    """Reads the Contents page(s) to find the exact printed-page range of
    the 'Subject content' chapter. Returns (start_idx, end_idx, guessed)
    where indices are 0-based PDF page indices and end_idx is exclusive."""
    toc_entries = []
    for i in range(1, min(6, doc.page_count)):
        for line in doc[i].get_text().split("\n"):
            m = TOC_LINE_RE.match(line.strip())
            if m:
                toc_entries.append((int(m.group(1)), m.group(2).strip(), int(m.group(3))))
    if not toc_entries:
        return None

    guessed = False
    # Two real chapter names found across the 44 subjects in this template
    # family for the same thing: "Subject content" (newer syllabuses) and
    # "Syllabus content" (older ones, e.g. Islamiyat, Pakistan Studies --
    # also at a different chapter number, since those add an extra
    # "Teacher support" chapter earlier that newer syllabuses dropped).
    match = next((e for e in toc_entries if "subject content" in e[1].lower() or "syllabus content" in e[1].lower()), None)
    if match is None:
        # Real exception (Global Perspectives): no chapter literally called
        # either name above. Fall back to whichever chapter is numbered 3 --
        # every syllabus in this template starts real subject-matter
        # chapters after "1 Why choose" and "2 Syllabus overview".
        match = next((e for e in toc_entries if e[0] == 3), None)
        guessed = True
    if match is None:
        return None

    chapter_num, _, start_page = match
    next_entry = next((e for e in toc_entries if e[0] == chapter_num + 1), None)
    end_page = next_entry[2] if next_entry else doc.page_count + 1
    return (start_page - 1, end_page - 1, guessed)


def extract_lines(doc, start_idx, end_idx):
    lines = []
    for page_num in range(start_idx, min(end_idx, doc.page_count)):
        page = doc[page_num]
        footer_zone_y = page.rect.height - 50
        d = page.get_text("dict")
        for block in d.get("blocks", []):
            for line in block.get("lines", []):
                spans = line.get("spans", [])
                text = "".join(s.get("text", "") for s in spans).strip()
                if not text or is_noise(text):
                    continue
                # A real page-number footer sits in the last ~50pt of the
                # page -- found live testing Chemistry: a font-weight
                # proxy for "is this noise" (used before this) wrongly
                # discarded genuine bare-digit numbered Core/Supplement
                # items ("1", "2", own line, light weight, printed
                # throughout the body) since they're visually identical to
                # a page number by font/size alone. Position on the page
                # is the real, reliable signal a font check can't give.
                if BARE_PAGE_NUMBER_RE.match(text) and line.get("bbox", (0, 0, 0, 0))[1] > footer_zone_y:
                    continue
                font = spans[0].get("font", "") if spans else ""
                size = round(max((s.get("size", 0) for s in spans), default=0))
                # Math/Greek symbols mid-sentence ("γ-emissions", "β-decay")
                # switch to a completely different font family (e.g.
                # "TimesNewRomanPSMT") for just that run -- found live
                # testing Physics: a plain substring check for "Roman"
                # (meant to catch this template's OWN "HelveticaNeueLTW1G-
                # Roman" label weight) also matches "TimesNewRomanPSMT",
                # wrongly classifying a mid-sentence Greek-letter run as a
                # section label and wrapping it in "[...]" as if it were
                # "[Core]"/"[Supplement]". Every real classification below
                # is scoped to this template's own font family specifically
                # to close off that whole class of collision.
                family_suffix = font.rsplit("-", 1)[-1] if font.startswith("HelveticaNeueLTW1G") else None
                if text.strip().lower() in BOLD_COLUMN_HEADER_LABELS:
                    # Some subjects print a two-column table's right-hand
                    # header in bold, the SAME weight as a real heading --
                    # found live testing Mathematics ("Notes and
                    # examples") and A-Level Biology ("Learning
                    # outcomes"), 150+ and 24 occurrences respectively.
                    # Since it's classified as a heading, it was
                    # immediately terminating the PRECEDING numbered
                    # topic's own content collection with nothing in it,
                    # and vacuuming that topic's entire real requirement
                    # text into a child under this label instead --
                    # silently mislabeling every single Core/Extended
                    # topic's actual content as if it were mere
                    # supplementary notes. Structurally this plays the
                    # exact same role as "Core"/"Supplement" (a label
                    # marking what follows), just in a different font
                    # weight for this one subject's table layout, so it's
                    # special-cased to a label regardless of font.
                    kind = "label"
                elif NOTE_ANNOTATION_RE.match(text.strip()):
                    kind = "body"
                elif family_suffix == "Bd":
                    kind = "heading"
                elif family_suffix == "Roman" and (
                    BARE_CODE_RE.match(text)
                    or (HEADING_CODE_RE.match(text) and HEADING_CODE_RE.match(text).group(2).strip())
                ):
                    # Fourth real heading style found live testing A-Level
                    # Business: its depth-2 sub-headings print in the SAME
                    # "-Roman" weight normally used for genuine labels like
                    # "Core"/"Supplement" -- without this, every one of
                    # these sub-headings was wrapped as a fake "[1.2.1
                    # Economic sectors]" label instead of becoming its own
                    # real heading node. Also accepts a BARE Roman code
                    # with no title yet ("1.1.1" alone, title "The nature
                    # of business activity" on the next line) -- some of
                    # these split across two lines exactly like the "Bd"
                    # chapter-title case, and without this both the bare
                    # code AND its title were separately wrapped as two
                    # nonsense one-word "labels" instead of merging into
                    # one heading the same way build_outline's existing
                    # merge logic already handles for bold headings.
                    kind = "heading"
                elif family_suffix == "Roman":
                    kind = "label"
                elif family_suffix and "Lt" in family_suffix and size >= HEADING_SIZE_THRESHOLD:
                    # Real second heading style found live (Islamiyat,
                    # among others): that subject's headings are the same
                    # light weight as body text, distinguished only by a
                    # noticeably larger size (14-18pt vs. the usual 10pt
                    # body) -- without this, its whole outline came out as
                    # a single empty chapter node.
                    kind = "heading"
                elif family_suffix == "Md" and HEADING_CODE_RE.match(text) and HEADING_CODE_RE.match(text).group(2).strip():
                    # Third real heading style found live testing Physics/
                    # Chemistry/Biology: a THIRD-level sub-heading ("1.7.2
                    # Work") prints in a "medium" weight, neither bold nor
                    # the large-light style above -- without this, every
                    # depth-2 sub-heading in these subjects silently
                    # flattened into its depth-1 parent's body content
                    # instead of becoming its own nested node. Gated on
                    # actually matching a numbered-code heading pattern
                    # (not just the font) because "Md" is NOT a reliable
                    # heading signal on its own -- English 0500 uses the
                    # same weight for hyperlinks in its boilerplate text,
                    # which would otherwise get misread as headings too.
                    kind = "heading"
                else:
                    kind = "body"
                first_span_size = round(spans[0].get("size", 0)) if spans else size
                y0 = line.get("bbox", (0, 0, 0, 0))[1]
                lines.append({
                    "text": text, "kind": kind, "size": size,
                    "first_span_size": first_span_size,
                    "page": page_num, "y0": y0,
                })
    return lines


# The main deliverable per node is no longer parsed text -- it's a real
# crop of the syllabus page(s) that node covers, saved as a PNG file
# mirroring the tree as real nested folders (Level/Subject/Chapter/...).
# Text extraction stays as a fallback/searchable layer alongside it, not
# the primary one.
IMAGE_ZOOM = 2.0
HEADER_MARGIN_PT = 80
FOOTER_MARGIN_PT = 60
MAX_FILENAME_LEN = 80
INVALID_FILENAME_CHARS_RE = re.compile(r'[\\/:*?"<>|]')


def safe_filename(code, title):
    """Builds a filesystem-safe "{code} {title}" name, truncated so the
    combination of subject/chapter/topic path segments this gets used in
    doesn't run into real filesystem path-length limits on a long title."""
    label = f"{code} {title}".strip() if code else title
    label = INVALID_FILENAME_CHARS_RE.sub("-", label).strip(". ")
    return label[:MAX_FILENAME_LEN].rstrip() or "untitled"


def _crop_window_image(doc, start_page, start_y, end_page, end_y):
    """Renders the real page content from (start_page, start_y) to
    (end_page, end_y) as one PNG, stitching multiple pages vertically
    when the window spans more than one (a chapter's own image commonly
    does; a single topic's usually doesn't). Trims each page's own crop
    to the page's real content width (excludes the running header/footer
    margins already handled by the caller's y-bounds)."""
    from PIL import Image

    page_images = []
    for page_num in range(start_page, end_page + 1):
        page = doc[page_num]
        y_top = start_y if page_num == start_page else HEADER_MARGIN_PT
        y_bottom = end_y if (page_num == end_page and end_y is not None) else page.rect.height - FOOTER_MARGIN_PT
        if y_bottom <= y_top:
            continue
        clip = fitz.Rect(page.rect.x0, y_top, page.rect.x1, y_bottom)
        pix = page.get_pixmap(clip=clip, matrix=fitz.Matrix(IMAGE_ZOOM, IMAGE_ZOOM))
        page_images.append(Image.frombytes("RGB", (pix.width, pix.height), pix.samples))
    if not page_images:
        return None
    if len(page_images) == 1:
        return page_images[0]
    width = max(im.width for im in page_images)
    total_height = sum(im.height for im in page_images) + 6 * (len(page_images) - 1)
    combined = Image.new("RGB", (width, total_height), "white")
    y = 0
    for im in page_images:
        combined.paste(im, (0, y))
        y += im.height + 6
    return combined


def attach_images(doc, nodes, section_end_idx, images_dir, subject_rel_path):
    """Crops and saves a real PNG for every CHAPTER (depth 0), every
    depth-1 sub-heading (e.g. "2.1 Kinetic particle model of matter"),
    and every LEAF node (nothing nests under it) -- an intermediate
    sub-heading deeper than depth 1 that has its own children (e.g.
    "1.5.2 Something" with further "1.5.2.1"/"1.5.2.2" nested under it)
    does not get its own image, only the chapter/depth-1 section it
    belongs to and its actual leaves do. Saved as real files under
    `images_dir/subject_rel_path/<chapter folder>/<file>.png`, mirroring
    the tree as real nested folders (Level/Subject/Chapter/Topic) rather
    than embedding base64 blobs in the JSON -- `node["image"]` then holds
    that file's path relative to `images_dir`, for the server to serve
    directly and the client to build an <img src> from.

    A leaf's own window runs from its heading to the START of whichever
    node comes right after it in this flat list -- a chapter's window
    runs to the START OF THE NEXT CHAPTER instead (depth <= 0), and a
    depth-1 section's window runs to the START OF THE NEXT depth-0-OR-1
    node -- each deliberately spanning over all of its own children's
    pages (that's the whole point of a section-level image: one overview
    of everything under it).

    A SPURIOUS node -- no numeric code AND no extracted body text, the
    known false-positive-heading limitation (a stray bold word/table-
    header mid-page gets picked up as its own heading) -- gets no image
    of its own and is skipped when computing where a window ENDS. Found
    live testing A Level Information Technology: its flowchart/system-
    flowchart/data-flow-diagram symbol legend is a pure diagram table
    (shape column, no text at all in that column) whose row/column
    labels ("Flowchart symbols", "Element", "Symbol", ...) are EIGHT
    consecutive spurious depth-0 nodes on one page -- each one's window
    used to end at the very next spurious node a few points below it,
    so every one of the 8 cropped to a near-blank sliver 1-2 lines tall
    and the actual symbol diagrams (the entire point of that page) never
    appeared anywhere. Skipping spurious nodes when computing a window's
    end lets the genuinely-titled chapter's own window keep extending
    until it reaches the next REAL node, correctly sweeping up the whole
    diagram table underneath it instead of stopping immediately."""
    last_page = (section_end_idx - 1) if section_end_idx else (doc.page_count - 1)

    def is_substantial(node):
        # A code alone isn't enough -- found live testing IGCSE Computer
        # Science: a Boolean-logic truth table's own "0"/"1" cell values
        # print bold on their own line, which BARE_CODE_RE happily
        # accepts as a valid heading code (a single digit). Worse, two
        # consecutive bare-digit lines ("0" then "1") get paired up by
        # the heading parser into ONE fake node with code="0", title="1"
        # -- title != code, but title is JUST ANOTHER bare code-like
        # token, not real descriptive text, so a naive "title differs
        # from code" check still wrongly called these substantial. A
        # REAL heading always has actual descriptive text beyond its
        # code ("1 Introduction", not "1" paired with another bare "0"
        # or "1") -- checking the title itself isn't ALSO bare-code-
        # shaped is what actually distinguishes the two. A node with
        # real body content is substantial either way, regardless of
        # what its code/title look like.
        code = (node.get("code") or "").strip()
        title = (node.get("title") or "").strip()
        title_is_bare_code = bool(title) and bool(BARE_CODE_RE.match(title))
        has_real_title = bool(code) and bool(title) and not title_is_bare_code
        return has_real_title or bool((node.get("content") or "").strip())

    def node_end(i):
        for j in range(i + 1, len(nodes)):
            if is_substantial(nodes[j]):
                return nodes[j]["_page"], nodes[j]["_y0"]
        return last_page, None

    def next_at_or_above_depth(i, max_depth):
        for j in range(i + 1, len(nodes)):
            if nodes[j]["depth"] <= max_depth and is_substantial(nodes[j]):
                return nodes[j]["_page"], nodes[j]["_y0"]
        return last_page, None

    current_chapter_folder = None
    used_rel_paths = set()
    for i, node in enumerate(nodes):
        is_chapter = node["depth"] == 0
        is_leaf = (i + 1 >= len(nodes)) or (nodes[i + 1]["depth"] <= node["depth"])
        is_section1 = node["depth"] == 1 and not is_leaf
        if is_chapter and is_substantial(node):
            current_chapter_folder = safe_filename(node["code"], node["title"])
        if not (is_chapter or is_section1 or is_leaf) or current_chapter_folder is None:
            continue
        if not is_substantial(node):
            continue

        start_page, start_y = node["_page"], node["_y0"]
        if is_chapter:
            end_page, end_y = next_at_or_above_depth(i, 0)
        elif is_section1:
            end_page, end_y = next_at_or_above_depth(i, 1)
        else:
            end_page, end_y = node_end(i)
        image = _crop_window_image(doc, start_page, start_y, end_page, end_y)
        if image is None:
            continue

        base_name = safe_filename(node["code"], node["title"])
        file_name = base_name + ".png"
        rel_path = f"{subject_rel_path}/{current_chapter_folder}/{file_name}"
        # Two distinct nodes can land on the identical folder+filename --
        # found live testing A Level Information Technology: three
        # separate spurious-but-substantial "Symbol" nodes (one per
        # diagram-shape table: flowchart/system-flowchart/data-flow) all
        # share that exact title with no code to disambiguate them, so
        # without this check the second and third silently overwrote the
        # first's real, distinct diagram content on disk. A numbered
        # suffix keeps every one of them.
        suffix = 2
        while rel_path in used_rel_paths:
            file_name = f"{base_name} ({suffix}).png"
            rel_path = f"{subject_rel_path}/{current_chapter_folder}/{file_name}"
            suffix += 1
        used_rel_paths.add(rel_path)
        abs_path = os.path.join(images_dir, subject_rel_path, current_chapter_folder, file_name)
        os.makedirs(os.path.dirname(abs_path), exist_ok=True)
        image.save(abs_path, "PNG")
        node["image"] = rel_path


def find_content_overview_range(doc):
    """Locates the syllabus's own real "Content overview" page -- a
    literal page inside the "2 Syllabus overview" chapter that lists
    every top-level topic at a glance -- NOT something this tool
    generates. Found via the Contents page's own two-line sub-entry
    format for that chapter's sub-headings ("Content overview\t" then
    "8" as a separate line -- unlike a top-level chapter, which prints
    its own dot-leader line all on one line, e.g. "3  Subject content
    ....... 12"). Returns (start_page, end_page) as 1-indexed printed
    page numbers, end_page exclusive (the next sub-entry's own start
    page), or None. Three subjects in the 44-subject library use an
    older template with no such page at all -- Global Perspectives,
    Islamiyat, Pakistan Studies, checked live -- and correctly return
    None here rather than guessing some other page is this one."""
    for i in range(1, min(6, doc.page_count)):
        lines = doc[i].get_text().split("\n")
        for idx, line in enumerate(lines):
            label = line.strip().rstrip("\t").strip()
            if label.lower() != "content overview" or idx + 1 >= len(lines):
                continue
            nxt = lines[idx + 1].strip()
            if not nxt.isdigit():
                continue
            start_page = int(nxt)
            for j in range(idx + 2, len(lines) - 1):
                lbl2 = lines[j].strip().rstrip("\t").strip()
                pg2 = lines[j + 1].strip()
                if lbl2 and pg2.isdigit() and not re.match(r"^\d", lbl2):
                    return start_page, int(pg2)
            return start_page, None
    return None


def attach_overview_image(doc, images_dir, subject_rel_path):
    """Crops the real "Content overview" page(s) found by
    find_content_overview_range() into `_overview.png`, the first thing
    shown for a subject -- the syllabus's own topic-at-a-glance page, not
    a generated substitute. Returns None (and the caller flags it) for
    the three subjects with no such page in their template."""
    rng = find_content_overview_range(doc)
    if rng is None:
        return None
    start_page_1idx, end_page_1idx = rng
    start_page = start_page_1idx - 1
    end_page = (end_page_1idx - 2) if end_page_1idx else (doc.page_count - 1)
    if end_page < start_page:
        end_page = start_page
    image = _crop_window_image(doc, start_page, HEADER_MARGIN_PT, end_page, None)
    if image is None:
        return None
    rel_path = f"{subject_rel_path}/_overview.png"
    abs_path = os.path.join(images_dir, subject_rel_path, "_overview.png")
    os.makedirs(os.path.dirname(abs_path), exist_ok=True)
    image.save(abs_path, "PNG")
    return rel_path


def build_outline(lines, doc=None, section_end_idx=None, images_dir=None, subject_rel_path=None):
    """Groups the classified lines into a flat, depth-tagged outline: each
    heading (possibly split across consecutive bold lines -- e.g. a bare
    "1.3" line followed by its title on the next line, both bold) becomes
    one node, with its body/label text joined underneath until the next
    heading. When `doc`/`images_dir`/`subject_rel_path` are all given,
    also crops and saves a real PNG for every chapter and leaf node (see
    attach_images)."""
    nodes = []
    i = 0
    n = len(lines)
    # Anything before the first heading (chapter intro prose) is dropped --
    # it's real content, but this tool's job is the topic outline, not a
    # full-text reproduction.
    while i < n and lines[i]["kind"] != "heading":
        i += 1

    while i < n:
        heading_size = lines[i]["size"]
        heading_page = lines[i]["page"]
        heading_y0 = lines[i]["y0"]
        heading_parts = [lines[i]["text"]]
        i += 1
        # Only keep absorbing more same-size bold lines into this ONE
        # heading if the first line was a bare code by itself ("1", "1.3",
        # "B2") with no title yet -- that's the one real "split across two
        # lines" case (Physics prints "1" alone, then "Motion, forces and
        # energy" on the next line). Anything else -- a line that's already
        # a complete title, coded or not (e.g. Chemistry's bare "Group 2"
        # chapter label, or Co-ordinated Science's complete "B2  Cells") --
        # is already a whole heading on its own and must NOT absorb
        # whatever bold line happens to follow it, even at the same size:
        # found live testing that a naive "keep merging until complete"
        # rule silently fused three unrelated headings ("Group 2" + "10.1"
        # + the real glyph-prefixed title) into one garbled node.
        first_line_is_bare_code = BARE_CODE_RE.match(heading_parts[0]) is not None
        while first_line_is_bare_code and i < n and lines[i]["kind"] == "heading" and lines[i]["size"] == heading_size:
            heading_parts.append(lines[i]["text"])
            i += 1
            candidate = " ".join(heading_parts).strip()
            candidate_match = HEADING_CODE_RE.match(candidate)
            if candidate_match and candidate_match.group(1) and candidate_match.group(2).strip():
                break
        # A bare code can still be titleless here if its title line prints
        # in the "-Roman" label weight rather than "heading" kind -- found
        # live testing A-Level Business: "1.1.1" (Roman, bare code) is
        # immediately followed by "The nature of business activity"
        # (Roman, no code), which the per-line classifier has no way to
        # tell apart from a real label like "Core" without this context.
        # Absorbing the very next line as the title here, only when the
        # heading would otherwise be left empty, catches this without
        # needing the line classifier to guess ahead.
        if first_line_is_bare_code:
            joined = " ".join(heading_parts).strip()
            m_so_far = HEADING_CODE_RE.match(joined)
            still_titleless = not (m_so_far and m_so_far.group(2).strip())
            if still_titleless and i < n and lines[i]["kind"] == "label" and lines[i]["size"] == heading_size:
                heading_parts.append(lines[i]["text"])
                i += 1
        heading_text = " ".join(heading_parts).strip()
        # Some headings in the large-light-weight style (see
        # HEADING_SIZE_THRESHOLD above) print a decorative bullet glyph
        # in place of a real number -- found live testing History, whose
        # individual essay-question headings ("Was the Treaty of
        # Versailles fair?") carry a leading glyph with no numeric code
        # behind it at all. Strip it here, the same way GLYPH_BULLET_RE
        # strips it from body content, so it doesn't end up baked into
        # the displayed title text.
        heading_text = GLYPH_BULLET_RE.sub("", heading_text, count=1).strip()
        m = HEADING_CODE_RE.match(heading_text)
        if m and m.group(1):
            code, title = m.group(1), m.group(2).strip()
            # The glyph can also land right after the code rather than at
            # the very start of heading_text (e.g. "10.1 \x07Similarities
            # and trends...") -- the leading strip above only catches a
            # glyph at position 0, so it's checked again here on whatever
            # text follows the code itself.
            title = GLYPH_BULLET_RE.sub("", title, count=1).strip()
            depth = code.count(".")
        else:
            code, title, depth = None, heading_text, 0

        content_parts = []
        while i < n and lines[i]["kind"] != "heading":
            line = lines[i]
            text = line["text"]
            # Strip a leading bare/dotted code (e.g. "10 ", "1.1.1\t")
            # before checking for a glyph -- catches the merged "10\t
            # \x07Determine..." case (see LEADING_CODE_RE above) without
            # treating every plain numbered marker as a candidate; if
            # what's left doesn't actually start with a glyph, the
            # original unstripped text is used below so a genuine
            # sentence starting with a number (rare, but possible) isn't
            # silently mangled.
            without_code = LEADING_CODE_RE.sub("", text, count=1)
            # A bare dash/en-dash with no digit in front of it is
            # genuinely ambiguous between a real bullet and an anion's
            # superscript charge sign printed on its own PyMuPDF "line"
            # (e.g. nitrate's "NO3" then a separate "–, reduction..."
            # line for the single-charge −) -- found live testing
            # Chemistry. The charge notation is always set in a small
            # subscript/superscript size (~7pt) versus this template's
            # 10pt body text, which a real bullet character never is, so
            # that's the tiebreaker here.
            is_subscript_dash = text[:1] in "-–" and line["first_span_size"] > 0 and line["first_span_size"] < 9
            if line["kind"] == "label":
                # A label line ("Core", "Focus points"...) can carry the
                # same stray glyph a bullet or a numbered sub-heading can
                # -- found live testing Religious Studies/Psychology.
                content_parts.append(f"\n[{strip_decorative_glyph(text)}]\n")
            elif not is_subscript_dash and (GLYPH_BULLET_RE.match(text) or GLYPH_ONLY_RE.match(without_code)):
                # A leading code was actually stripped to get here only
                # when `without_code` differs from `text` -- in that case
                # only the real \x07 glyph counts (see GLYPH_ONLY_RE above);
                # a line with no code to strip in the first place can still
                # start directly with any real bullet character, checked
                # against the ORIGINAL text so an ion charge like "2–"
                # (only ever seen after a stripped code) can't qualify on
                # its own.
                stripped_once = without_code if without_code != text else text
                item_text = GLYPH_BULLET_RE.sub("", stripped_once, count=1)
                content_parts.append(f"\n• {item_text}")
            elif NUMBERED_ITEM_SEP_RE.match(text):
                # A numbered item's digit and its text can also print on
                # ONE physical line with no glyph at all in between --
                # "10\tState that synapses..." (Biology, tab) / "1
                # Measure and draw lines and angles." (Mathematics,
                # en-space) -- found live testing each, once double-digit
                # item numbers stopped being a rare tail case. Requiring
                # one of these two specific separators (not just any
                # digit-led line) keeps this from re-colliding with ion
                # notation like "2–", which never has either after its
                # digit.
                content_parts.append(f"\n• {without_code}")
            elif BARE_PAGE_NUMBER_RE.match(text):
                # A numbered Core/Supplement item can print as a
                # completely bare number with no trailing punctuation at
                # all ("1", alone on its own line, sentence following on
                # the next line) -- found live testing Chemistry. Unlike
                # Physics (whose items 1-9 use a decorative glyph and 10+
                # pair a bare number with that glyph), Chemistry's items
                # are ALL bare numbers with nothing else, so
                # LETTERED_MARKER_RE's punctuation requirement never
                # matched and every single item silently glued into one
                # giant run-on paragraph with no bullets at all.
                #
                # But when the NEXT line already starts with the glyph
                # bullet itself, this bare number is a redundant shadow
                # duplicate at the same position rather than a real
                # standalone marker -- found live testing Physics, whose
                # \x07-glyph items ALSO print an invisible bare-number
                # copy immediately before the glyph line, at the exact
                # same y-coordinate. Without this check every one of those
                # became its own empty bullet right before the real one.
                next_line = lines[i + 1] if i + 1 < n else None
                if next_line and next_line["kind"] == "body" and GLYPH_BULLET_RE.match(next_line["text"]):
                    pass
                else:
                    content_parts.append("\n• ")
            elif (lettered_match := LETTERED_MARKER_RE.match(text)):
                # A lettered sub-part often has its own decorative glyph
                # sitting between the marker and the real sentence --
                # "(a)\t \x07speed increases..." -- found live testing
                # Physics; strip it the same way a plain bullet line does,
                # while keeping the "(a)" marker itself since it's real
                # content, not decoration.
                marker = text[: lettered_match.end()]
                rest = GLYPH_BULLET_RE.sub("", text[lettered_match.end() :], count=1)
                content_parts.append(f"\n{marker}{rest}")
            else:
                content_parts.append(f" {strip_decorative_glyph(text)}")
            i += 1
        content = "".join(content_parts).strip()

        nodes.append({
            "code": code, "depth": depth, "title": title, "content": content,
            "size": heading_size, "_page": heading_page, "_y0": heading_y0,
        })

    nodes = _merge_empty_heading_runs(_merge_continued(nodes))
    _infer_uncoded_depth(nodes)
    if doc is not None and images_dir is not None and subject_rel_path is not None:
        attach_images(doc, nodes, section_end_idx, images_dir, subject_rel_path)
    for node in nodes:
        del node["size"]
        del node["_page"]
        del node["_y0"]
    return nodes


def _infer_uncoded_depth(nodes):
    """A code-less heading defaults to depth 0, which is right for a real
    top-level divider (e.g. History's "Core content: Option A") but wrong
    for a recurring in-line label like Mathematics' "Notes and examples"
    -- printed at the SAME font size as the numbered heading it always
    immediately follows, it's a trailing annotation on that heading, not a
    new top-level section, and needs to nest one level under it. Found
    live testing Mathematics: every single "Notes and examples" (150+ of
    them) was popping all the way back out to the document root instead
    of nesting under the numbered sub-heading it actually belongs to.

    Distinguishes cases by comparing font size against whatever node came
    immediately before: a code-less heading at the SAME size as a real
    coded heading right before it is treated as that heading's child. A
    code-less heading at the SAME size as the PRECEDING code-less one is
    treated as its sibling (same depth) rather than reset to 0 -- found
    live testing English's "Reading" / "Writing" / "Speaking and
    Listening" skill sections: "Reading" correctly nested under "Subject
    content" (its predecessor is coded), but "Writing" and "Speaking and
    Listening" each follow another CODE-LESS heading, so without this
    they fell back to depth 0 and popped out to the document root instead
    of sitting alongside "Reading" as its sibling. Anything larger, or a
    heading whose true nesting has no reliable signal either way, keeps
    its default depth (0) -- a genuinely bigger divider is left alone
    rather than guessed at further."""
    for i in range(1, len(nodes)):
        node = nodes[i]
        prev = nodes[i - 1]
        if node["code"] is not None or node["size"] > prev["size"]:
            continue
        if prev["code"] is not None:
            node["depth"] = prev["depth"] + 1
        elif prev["size"] == node["size"]:
            node["depth"] = prev["depth"]


def _merge_continued(nodes):
    """A heading that gets split across a page break reprints on the new
    page as '<same code>  <same title> continued' -- a real, common
    Cambridge PDF layout quirk, not a new topic. Fold it back into the
    node it continues rather than showing a duplicate entry. Two real
    formats for the same thing: "Forces continued" (Physics) and "Number
    (continued)" (Mathematics, parenthesised) -- checked for the trailing
    word "continued" with any surrounding punctuation stripped, not an
    exact suffix match, or the Mathematics form silently failed to merge
    at all (a bare literal-suffix check for "continued" doesn't match a
    string ending in "continued)").

    Searches backward for the nearest node with the same code, not just
    the immediately preceding one -- once depth-2 sub-headings (see the
    "Md" heading style above) are recognised as their own nodes, one or
    more of them can sit between a heading and its "continued" reprint
    (e.g. "1.5 Forces" / "1.5.1 Effects of forces" / "1.5 Forces
    continued"), so the immediate-predecessor check missed the merge and
    left a confusing duplicate sibling that later sub-headings wrongly
    nested under instead of the original."""
    merged = []
    for node in nodes:
        prev = None
        title_end = re.sub(r'[^a-z]+$', '', node["title"].lower())
        if node["code"] and title_end.endswith("continued"):
            prev = next((m for m in reversed(merged) if m["code"] == node["code"]), None)
        if prev:
            prev["content"] = f"{prev['content']} {node['content']}".strip()
        else:
            merged.append(node)
    return merged


# A genuine table-cell header ("Instruction", "Opcode", "Text type") is
# always short -- real chapter/section titles this could otherwise
# collide with ("Core subject content", "AS Level subject content",
# "Physical chemistry") are consistently longer. This length gate is
# load-bearing: an earlier version of this merge fired on ANY run of
# code-less, content-less headings regardless of title length, and ended
# up silently crushing genuine, distinct chapter titles across a dozen+
# subjects into garbled combined nodes ("AS Level subject content /
# Physical chemistry / Atomic structure" was three real, separate
# headings) -- caught only by manually cross-checking Physics/Chemistry/
# Biology/Maths/English page-by-page against their source PDFs.
MAX_TABLE_CELL_TITLE_LEN = 15


def _merge_empty_heading_runs(nodes):
    """A table's column-header row prints as several short, consecutive
    bold cells with no code and nothing between them -- e.g. "Instruction"
    / "Opcode" / "Operand" / "Explanation" from an instruction-set table,
    found live in A-Level Computer Science. Each header word satisfies the
    heading heuristic (bold, own line) but carries no code and no content
    of its own, so a run of 2+ of these gets collapsed into one combined
    node instead of cluttering the outline with several pointless empty
    entries."""
    def is_table_cell(n):
        return n["code"] is None and not n["content"] and len(n["title"]) <= MAX_TABLE_CELL_TITLE_LEN

    merged = []
    i = 0
    while i < len(nodes):
        node = nodes[i]
        if is_table_cell(node):
            run = [node]
            j = i + 1
            while j < len(nodes) and nodes[j]["depth"] == node["depth"] and is_table_cell(nodes[j]):
                run.append(nodes[j])
                j += 1
            if len(run) >= 2:
                merged.append({
                    "code": None,
                    "depth": node["depth"],
                    "title": " / ".join(n["title"] for n in run),
                    "content": "",
                    "size": node["size"],
                    "_page": node["_page"],
                    "_y0": node["_y0"],
                })
                i = j
                continue
        merged.append(node)
        i += 1
    return merged


def main():
    if len(sys.argv) != 2:
        print("usage: extract_syllabus.py <pdf_path>", file=sys.stderr)
        sys.exit(1)

    doc = fitz.open(sys.argv[1])
    result = {"pageCount": doc.page_count, "sectionGuessed": False, "topics": []}

    rng = find_subject_content_range(doc)
    if rng is None:
        result["error"] = "Could not locate a Contents page with numbered chapters -- this PDF may not follow the standard Cambridge syllabus template."
        print(json.dumps(result))
        return

    start_idx, end_idx, guessed = rng
    result["sectionGuessed"] = guessed
    result["sectionPageRange"] = [start_idx + 1, end_idx]

    lines = extract_lines(doc, start_idx, end_idx)
    result["topics"] = build_outline(lines, doc=doc, section_end_idx=end_idx)
    result["tree"] = build_tree(result["topics"])
    print(json.dumps(result))


def build_tree(nodes):
    """Converts the flat, depth-tagged node list into a real parent/child
    tree -- "a proper db", not a flat list the UI has to re-derive nesting
    from via CSS margins on a depth number. A node becomes the child of
    the most recent node at a strictly lower depth; anything at depth 0 (or
    whose parent chain runs out, e.g. an unlabeled intro node before the
    first real depth jump) lands at the top level. Depths aren't assumed
    to increase by exactly 1 -- Cambridge's own numbering has real gaps
    (e.g. a depth-0 chapter title with no depth-1 code before its first
    depth-1 child), so this walks a stack rather than indexing by depth."""
    root = []
    stack = []  # list of (depth, children_list), outermost first
    for node in nodes:
        tree_node = dict(node, children=[])
        while stack and stack[-1][0] >= tree_node["depth"]:
            stack.pop()
        (stack[-1][1] if stack else root).append(tree_node)
        stack.append((tree_node["depth"], tree_node["children"]))
    return root


if __name__ == "__main__":
    main()
