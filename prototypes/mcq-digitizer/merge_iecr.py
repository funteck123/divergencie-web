#!/usr/bin/env python3
"""Merges a set of per-question iECR PDFs into one combined PDF per paper,
sorted by question number. Args: <output_path> <input_pdf_1> [<input_pdf_2> ...]
Used by build-yearly-paper-map.mjs (Node has no PDF-merge library on hand;
PyMuPDF is already a hard dependency for this whole prototype)."""
import sys
import fitz

out_path = sys.argv[1]
inputs = sys.argv[2:]

merged = fitz.open()
for src_path in inputs:
    src = fitz.open(src_path)
    merged.insert_pdf(src)
    src.close()
merged.save(out_path)
merged.close()
print(f"merged {len(inputs)} files -> {out_path}")
