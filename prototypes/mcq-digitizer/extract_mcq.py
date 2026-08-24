#!/usr/bin/env python3
# Parses a Multiple Choice Question Paper + its Mark Scheme (answer key)
# into a structured quiz -- NO LLM anywhere in this tool, not even for
# grading. MCQ grading needs zero judgment (a selected letter either
# matches the answer key or it doesn't), so unlike exam-grader/
# quiz-digitizer this whole tool is deterministic PyMuPDF + regex, start
# to finish. No API key, no network call, no cost, no reliability
# tradeoff to document.
#
# Real, honest limitation: still a heuristic, not a universal parser.
# Built around the conventions most real MCQ papers actually use
# (numbered questions "1."/"Question 1", options labeled "A)"/"A."/"(A)")
# and answer keys as a simple "<number> <letter>" list, however laid out
# on the page. A paper using a genuinely different convention (numeric
# options 1/2/3/4 instead of letters, or an answer key printed as a dense
# unlabeled grid) won't parse correctly.
import sys
import re
import json
import fitz

QUESTION_KEYWORD_RE = re.compile(r'^Question\s+(\d{1,2})\.?\s*(.*)$', re.IGNORECASE)
QUESTION_NUM_RE = re.compile(r'^(\d{1,2})[\.\)]\s+(.*)$')
# Option lines: "A)", "A.", "(A)", optionally lowercase -- all normalized
# to uppercase in the output.
OPTION_RE = re.compile(r'^\(?([A-Da-d])[\.\)]\s+(.*)$')
# An answer-key entry: a question number followed (possibly with a colon/
# dash/dot between them) by a single option letter, and nothing else
# meaningful on the "answer" side -- deliberately anchored so it doesn't
# accidentally match the middle of an unrelated sentence.
ANSWER_ENTRY_RE = re.compile(r'(\d{1,2})\s*[\.\):\-]?\s*([A-Da-d])\b')


def extract_lines(doc):
    """Same structured-text approach as quiz-digitizer's extract_questions.py
    -- font size/weight/position from PyMuPDF, not just flattened text."""
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
                lines.append({"text": text, "size": size, "bold": bold})
    return lines


def parse_qp(pdf_path):
    """Finds each question and its lettered options. Mirrors quiz-digitizer's
    top-level-only segmentation (a question's stem is everything between its
    own marker and the first option line, or the next question), but ALSO
    captures each option line as a separate {label, text} instead of folding
    everything into one blob -- MCQ options are structurally different from
    free-response sub-parts, they're the actual answer choices, not more
    question text."""
    doc = fitz.open(pdf_path)
    lines = extract_lines(doc)

    questions = []
    current = None  # {"number": str, "stemParts": [str], "options": {letter: text}}

    def flush():
        nonlocal current
        if current is None:
            return
        stem = " ".join(current["stemParts"]).strip()
        if stem and current["options"]:
            questions.append({
                "questionNumber": current["number"],
                "questionText": stem,
                "options": [{"label": k, "text": v.strip()} for k, v in sorted(current["options"].items())],
            })
        current = None

    for line in lines:
        text = line["text"]

        m = QUESTION_KEYWORD_RE.match(text) or (QUESTION_NUM_RE.match(text) if (line["bold"] or line["size"] >= 11) else None)
        if m:
            flush()
            current = {"number": m.group(1), "stemParts": [m.group(2)] if m.group(2) else [], "options": {}}
            continue

        m = OPTION_RE.match(text)
        if m and current is not None:
            current["options"][m.group(1).upper()] = m.group(2)
            continue

        # Plain text: belongs to the stem only if no option has started yet
        # for this question (once options begin, stray lines are far more
        # likely to be an option's own wrapped second line than new stem
        # text -- append to the last-seen option instead).
        if current is not None:
            if current["options"]:
                last_label = sorted(current["options"].keys())[-1]
                current["options"][last_label] += " " + text
            else:
                current["stemParts"].append(text)

    flush()
    return questions


def parse_ms(pdf_path):
    """Answer key -> {questionNumber: "A"}. Deliberately permissive about
    layout (a real answer key might be one line per question, a dense
    grid, or a table PyMuPDF flattens into an odd line order) -- scans
    every line for the <number><letter> pattern rather than assuming one
    clean format, and keeps the FIRST match per question number (a
    reference/working note mentioning a question number a second time
    elsewhere on the page shouldn't overwrite the real answer)."""
    doc = fitz.open(pdf_path)
    answers = {}
    for page_num in range(doc.page_count):
        text = doc[page_num].get_text()
        for m in ANSWER_ENTRY_RE.finditer(text):
            num, letter = m.group(1), m.group(2).upper()
            if num not in answers:
                answers[num] = letter
    return answers


def main():
    if len(sys.argv) != 3:
        print("usage: extract_mcq.py <qp_pdf_path> <ms_pdf_path>", file=sys.stderr)
        sys.exit(1)
    qp_path, ms_path = sys.argv[1], sys.argv[2]
    questions = parse_qp(qp_path)
    answers = parse_ms(ms_path)

    result = []
    unmatched = []
    for q in questions:
        correct = answers.get(q["questionNumber"])
        if correct is None:
            unmatched.append(q["questionNumber"])
        result.append({**q, "correctAnswer": correct})

    print(json.dumps({"questions": result, "unmatchedAnswerKey": unmatched}))


if __name__ == "__main__":
    main()
