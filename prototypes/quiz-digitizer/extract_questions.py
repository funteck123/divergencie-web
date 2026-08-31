#!/usr/bin/env python3
# Finds TOP-LEVEL question boundaries in a PDF using PyMuPDF's structured
# text extraction (font size/weight, not just flat text) plus regex
# heuristics -- NO LLM call, per explicit direction: segmentation must be
# free, instant, and deterministic, unlike the grading step (which still
# uses a vision LLM -- judging correctness needs understanding; finding
# where a question starts and ends is a text/layout problem).
#
# Scope, per explicit direction: only separate whole questions (1, 2, 3,
# ...), not their lettered/numbered sub-parts. A question's full text --
# including any (a)/(b)/(i)/(ii) sub-parts it contains -- becomes ONE
# gradable unit. This was a deliberate simplification after live testing
# the earlier sub-part-aware version against a real 7-question, 15-page,
# 3-level-nested paper: tracking (a)/(b) and (i)/(ii)/(iii) nesting
# correctly across page boundaries (with header/footer noise in between)
# is genuinely hard for a heuristic to get right, and wasn't worth the
# complexity once whole-question granularity was all that was needed.
#
# Real, honest limitation: still a heuristic, not a universal parser.
# Built around the conventions most real exam papers use ("1."/"Question 1"
# numbering, bracketed mark values "[3]"/"[3 marks]") -- a PDF using a
# genuinely different convention (e.g. "Q1:", unnumbered bullet questions)
# won't segment correctly.
import sys
import re
import json
import fitz

# Two separate patterns, not one merged one: a "Question N" heading is
# usually its own standalone line with NO trailing punctuation (the real
# question text follows on the next line) -- a single combined regex
# requiring punctuation right after the number matched neither that form
# nor let the "Question" keyword stand in for it (caught live testing
# against an original sample PDF).
QUESTION_KEYWORD_RE = re.compile(r'^Question\s+(\d{1,2})\.?\s*(.*)$', re.IGNORECASE)
# A bare number needs its own punctuation (". " or ") ") to count as a
# question start, specifically to avoid matching stray numbers elsewhere
# in a line (a measurement, a date, etc).
QUESTION_NUM_RE = re.compile(r'^(\d{1,2})[\.\)]\s+(.*)$')
MARKS_RE = re.compile(r'\[\s*(\d+)\s*(?:marks?)?\s*\]', re.IGNORECASE)


def extract_lines(doc):
    """Flattens every page into an ordered list of {text, size, bold} lines,
    using PyMuPDF's structured dict output so font size/weight (a real signal
    for "this looks like a question-start heading", not just plain text) are
    available to the segmentation heuristic below."""
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
                bold = any("bold" in s.get("font", "").lower() for s in spans)
                lines.append({"text": text, "size": size, "bold": bold, "page": page_num + 1})
    return lines


def sum_marks(text):
    """A whole question's total is the SUM of every bracketed mark value
    found in it, not just the last one -- a question with sub-parts prints
    one [n] per sub-part (e.g. [2] ... [1] ... [2] ... [6]), and since
    sub-parts are no longer tracked separately, the question's own total
    has to be the sum of all of them, not just whichever appears last."""
    matches = MARKS_RE.findall(text)
    return sum(int(m) for m in matches) if matches else None


def segment(lines):
    questions = []
    current = None  # {"number": str, "textParts": [str]}

    def flush():
        nonlocal current
        if current is None:
            return
        full_text = " ".join(current["textParts"]).strip()
        if full_text:  # a heading with no content isn't a real question
            marks = sum_marks(full_text)
            # Strip the mark annotations out of the displayed question
            # text -- surfaced separately as marksAvailable, repeating
            # them inline reads as noise in the quiz UI.
            clean_text = MARKS_RE.sub("", full_text).strip()
            questions.append({
                "questionNumber": current["number"],
                "questionText": clean_text,
                "marksAvailable": marks if marks is not None else 1,
                "marksInferred": marks is None,
            })
        current = None

    for line in lines:
        text = line["text"]
        m = QUESTION_KEYWORD_RE.match(text) or (QUESTION_NUM_RE.match(text) if (line["bold"] or line["size"] >= 11) else None)
        if m:
            flush()
            current = {"number": m.group(1), "textParts": [m.group(2)] if m.group(2) else []}
            continue
        if current is not None:
            current["textParts"].append(text)

    flush()
    return questions


def main():
    if len(sys.argv) != 2:
        print("usage: extract_questions.py <pdf_path>", file=sys.stderr)
        sys.exit(1)
    doc = fitz.open(sys.argv[1])
    lines = extract_lines(doc)
    questions = segment(lines)
    print(json.dumps({"questions": questions}))


if __name__ == "__main__":
    main()
