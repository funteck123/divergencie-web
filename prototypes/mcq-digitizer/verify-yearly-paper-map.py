#!/usr/bin/env python3
# TKT-0251: post-crawl verification pass for yearly-papers.json.
#
# build-yearly-paper-map.mjs classifies each paper's component purely from
# its filename's variant-digit convention (e.g. "22" -> MCQ). That
# convention is NOT stable across years -- confirmed real (2026-09-18):
# IGCSE Physics's own "Paper 2" meant "Core" (a free-response paper, not
# MCQ at all) through 2015, and only became "Multiple Choice (Extended)"
# starting in 2016. Trusting the filename alone silently fed Core
# free-response papers into the MCQ extractor for every pre-2016 paper,
# which is why the batch verification's ~2010-2015 failure cluster looked
# like an extraction bug but was actually a misclassification bug one
# layer up.
#
# This reads each candidate QP's own printed cover-page text and only
# keeps a paper if what's actually printed there matches what the
# filename-based crawler assumed -- Extended-tier MCQ/Theory/Practical
# only, matching the existing topical library's own scope.
import sys
import json
import re
import fitz

EXPECTED_KEYWORDS = {
    "MCQ": [r"Multiple\s*Choice.*Extended"],
    "Paper 4: Theory (Extended)": [r"Theory.*Extended", r"Extended.*Theory"],
    "Paper 6: Alternative to Practical": [r"Alternative to Practical"],
    "Paper 2: Non-calculator (Extended)": [r"Non-?calculator.*Extended", r"Extended.*Non-?calculator"],
    "Paper 4: Calculator (Extended)": [r"Calculator.*Extended", r"Extended.*Calculator"],
    "Paper 2: Reading and Writing (Extended)": [r"Reading and Writing.*Extended"],
    "Paper 4: Listening (Extended)": [r"Listening.*Extended"],
}


def cover_page_text(pdf_path):
    try:
        doc = fitz.open(pdf_path)
        text = doc[0].get_text()
        doc.close()
        return text
    except Exception:
        return ""


def matches_expected(component, text):
    patterns = EXPECTED_KEYWORDS.get(component)
    if not patterns:
        return None  # component not in the keyword map (e.g. English's generic "Paper N") -- can't verify, don't silently drop
    return any(re.search(p, text, re.IGNORECASE) for p in patterns)


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else "../../data/mcq-digitizer/yearly-library/yearly-papers.json"
    with open(path) as f:
        data = json.load(f)

    kept, dropped = 0, 0
    dropped_samples = []
    for subject, papers in data.items():
        verified = []
        for p in papers:
            text = cover_page_text(p["qpPath"])
            result = matches_expected(p["component"], text)
            if result is False:
                dropped += 1
                if len(dropped_samples) < 20:
                    dropped_samples.append(f"{p['title']} -- expected {p['component']}, cover page didn't match")
                continue
            # result is True (verified) or None (unverifiable component, e.g. English) -- keep either way
            verified.append(p)
            kept += 1
        data[subject] = verified

    with open(path, "w") as f:
        json.dump(data, f, indent=2)

    print(json.dumps({"kept": kept, "dropped": dropped}, indent=2))
    print()
    for s in dropped_samples:
        print(" -", s)


if __name__ == "__main__":
    main()
