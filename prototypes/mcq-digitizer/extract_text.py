#!/usr/bin/env python3
# Plain-text extraction for structured (non-MCQ) papers -- e.g. Mathematics
# worksheets, which extract_mcq.py's option-letter-based question splitter
# can't parse at all (no A/B/C/D options exist in a structured paper). This
# is deliberately dumb: no question splitting, no answer-key parsing, just
# every page's text in reading order, for feeding straight to an LLM as
# grading context (see gradeStructuredAnswer in server.mjs).
import sys
import json

import fitz  # PyMuPDF


def extract_text(pdf_path):
    doc = fitz.open(pdf_path)
    pages = [page.get_text("text") for page in doc]
    doc.close()
    return "\n\n".join(pages)


if __name__ == "__main__":
    print(json.dumps({"text": extract_text(sys.argv[1])}))
