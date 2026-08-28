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


def strip_decorative_glyph(text):
    """Strips a leading decorative bullet glyph, tolerating an optional
    leading numeric code (bare or dotted) immediately before it. Returns
    the text unchanged if no glyph is found either way."""
    without_code = LEADING_CODE_RE.sub("", text, count=1)
    if GLYPH_BULLET_RE.match(without_code):
        return GLYPH_BULLET_RE.sub("", without_code, count=1)
    return text
NOISE_PATTERNS = [
    re.compile(r'^www\.cambridgeinternational\.org', re.IGNORECASE),
    re.compile(r'^Back to contents page$', re.IGNORECASE),
    # "Syllabus for examination in 2026" (older-template subjects like
    # Islamiyat, Pakistan Studies) vs. "syllabus for exams in 2027"
    # (newer template) -- found live testing Islamiyat: the older phrasing
    # wasn't covered ("exams?" doesn't match "examination"), so its own
    # running-header text leaked through as a fake "[Cambridge IGCSE
    # Islamiyat 0493. Syllabus for examination in ...]" label.
    re.compile(r'syllabus for (exams?|examination) in \d{4}', re.IGNORECASE),
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
                if family_suffix == "Bd":
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
                lines.append({"text": text, "kind": kind, "size": size})
    return lines


def build_outline(lines):
    """Groups the classified lines into a flat, depth-tagged outline: each
    heading (possibly split across consecutive bold lines -- e.g. a bare
    "1.3" line followed by its title on the next line, both bold) becomes
    one node, with its body/label text joined underneath until the next
    heading."""
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
            if line["kind"] == "label":
                # A label line ("Core", "Focus points"...) can carry the
                # same stray glyph a bullet or a numbered sub-heading can
                # -- found live testing Religious Studies/Psychology.
                content_parts.append(f"\n[{strip_decorative_glyph(text)}]\n")
            elif GLYPH_BULLET_RE.match(without_code):
                item_text = GLYPH_BULLET_RE.sub("", without_code, count=1)
                content_parts.append(f"\n• {item_text}")
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

        nodes.append({"code": code, "depth": depth, "title": title, "content": content, "size": heading_size})

    nodes = _merge_empty_heading_runs(_merge_continued(nodes))
    _infer_uncoded_depth(nodes)
    for node in nodes:
        del node["size"]
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
    result["topics"] = build_outline(lines)
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
