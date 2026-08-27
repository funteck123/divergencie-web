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
HEADING_CODE_RE = re.compile(r'^(\d+(?:\.\d+){0,3})\.?\s*(.*)$')
HEADING_SIZE_THRESHOLD = 13
# \x07 and  are the two private-use bullet glyphs Cambridge's own
# Wingdings-based bullet font extracts as (never a plain "•") -- found live
# testing across several subjects; without these, every bullet point in a
# subject's content gets silently space-joined into one run-on line.
BULLET_START_RE = re.compile(r'^([•\-–\x07]|\(?[a-z]\)|\(?[ivx]+\)|\d{1,2}[\.\)])\s*')
NOISE_PATTERNS = [
    re.compile(r'^www\.cambridgeinternational\.org', re.IGNORECASE),
    re.compile(r'^Back to contents page$', re.IGNORECASE),
    re.compile(r'^\d+$'),  # bare page-number line
    re.compile(r'syllabus for (exams? in )?\d{4}', re.IGNORECASE),
]


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
        d = doc[page_num].get_text("dict")
        for block in d.get("blocks", []):
            for line in block.get("lines", []):
                spans = line.get("spans", [])
                text = "".join(s.get("text", "") for s in spans).strip()
                if not text or is_noise(text):
                    continue
                font = spans[0].get("font", "") if spans else ""
                size = round(max((s.get("size", 0) for s in spans), default=0))
                if "Bd" in font:
                    kind = "heading"
                elif "Roman" in font:
                    kind = "label"
                elif "Lt" in font and size >= HEADING_SIZE_THRESHOLD:
                    # Real second heading style found live (Islamiyat,
                    # among others): that subject's headings are the same
                    # light weight as body text, distinguished only by a
                    # noticeably larger size (14-18pt vs. the usual 10pt
                    # body) -- without this, its whole outline came out as
                    # a single empty chapter node.
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
        heading_parts = []
        heading_size = lines[i]["size"]
        while i < n and lines[i]["kind"] == "heading" and lines[i]["size"] == heading_size:
            heading_parts.append(lines[i]["text"])
            i += 1
        heading_text = " ".join(heading_parts).strip()
        m = HEADING_CODE_RE.match(heading_text)
        if m and m.group(1):
            code, title = m.group(1), m.group(2).strip()
            depth = code.count(".")
        else:
            code, title, depth = None, heading_text, 0

        content_parts = []
        while i < n and lines[i]["kind"] != "heading":
            line = lines[i]
            if line["kind"] == "label":
                content_parts.append(f"\n[{line['text']}]\n")
            elif BULLET_START_RE.match(line["text"]):
                # Normalise Cambridge's private-use bullet glyph (renders as
                # a stray telephone/wingding icon in a browser with no font
                # override) to a plain bullet -- only that one glyph, never
                # the lettered/numbered markers ((a), (i), "1)"), which are
                # real content, not decoration.
                text = line["text"]
                if text.startswith("\x07"):
                    text = "•" + text[1:]
                content_parts.append(f"\n{text}")
            else:
                content_parts.append(f" {line['text']}")
            i += 1
        content = "".join(content_parts).strip()

        nodes.append({"code": code, "depth": depth, "title": title, "content": content})

    return _merge_continued(nodes)


def _merge_continued(nodes):
    """A heading that gets split across a page break reprints on the new
    page as '<same code>  <same title> continued' -- a real, common
    Cambridge PDF layout quirk, not a new topic. Fold it back into the
    node it continues rather than showing a duplicate entry."""
    merged = []
    for node in nodes:
        prev = merged[-1] if merged else None
        if (
            prev
            and node["code"]
            and node["code"] == prev["code"]
            and node["title"].lower().rstrip().endswith("continued")
        ):
            prev["content"] = f"{prev['content']} {node['content']}".strip()
        else:
            merged.append(node)
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
    print(json.dumps(result))


if __name__ == "__main__":
    main()
