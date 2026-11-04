"""TKT-0237 phase 1a: the real text of every library question, for search.

The library stores each question as a picture plus its number; the wording was read while cropping and then thrown away. This reads it again, from the
PDF's own text layer (99.9% of library pages have one, measured 4 Nov 2026), with the SAME question boundaries the cropper uses, but draws no pictures
(it reuses extract_mcq's detectors; extract_mcq.py itself is not changed, so the digitize cache stays valid).

  python3 prototypes/mcq-digitizer/build_search_text.py            builds data/mcq-digitizer/search-index/text.json and prints a coverage report
  python3 prototypes/mcq-digitizer/build_search_text.py --limit 40  a quick trial on the first 40 papers

Output per paper: {kind, qpId, board, subject, component, title, questions: {"1": "text", ...}}.
Coverage is checked against the library's own question numbers: a paper counts as complete only when every stored question number got non-empty text.
"""
import json, os, re, sys
from multiprocessing import Pool

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import fitz  # noqa: E402
import extract_mcq as X  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(HERE))
LIB = os.path.join(ROOT, "data", "mcq-digitizer")
OUT = os.path.join(LIB, "search-index")


# Whole-line publisher furniture. A line is dropped only when the entire line matches, so real question text is never cut.
_FURNITURE = [re.compile(x, re.I) for x in (
    r"^save my exams!?( [–-] the home of revision)?$",
    r"^for more awesome gcse and a level resources, visit us at www\.savemyexams\.co(\.uk/?|m)?/?$",
    r"^www\.savemyexams\.co[.\w/]*$",
    r"^head[\s\x03\xa0]+to([\s\x03\xa0]+savemyexams\.co\.uk([\s\x03\xa0]+for[\s\x03\xa0]+more[\s\x03\xa0]+awesome[\s\x03\xa0]+resources)?)?$",
    r"^question \d+$",
    r"^q ?u ?e ?s ?t ?i ?o ?n \d+$",  # letter-spaced header
    r"^resources$",  # tail of the 'Head to savemyexams.co.uk for more awesome / resources' wrap
)]


def clean_text(text):
    """Drop whole lines that are branding or a bare 'Question N' header; fix non-breaking spaces; collapse blank runs."""
    keep = [l for l in text.replace("\xa0", " ").replace("\x03", " ").split("\n") if not any(f.match(l.strip()) for f in _FURNITURE)]
    return re.sub(r"\n{2,}", "\n", re.sub(r"[ \t]+", " ", "\n".join(keep))).strip()


def _clean(lines):
    """Join text lines, dropping publisher branding and bare page furniture."""
    out = []
    for l in lines:
        t = l["text"].strip()
        if not t or re.match(r"^\*?\d{8,}\*?$", t):  # barcode numbers
            continue
        out.append(t)
    return clean_text("\n".join(out))


def mcq_texts(pdf_path):
    """{question number: text} for a multiple choice paper, using parse_qp's own boundaries and cut-offs (without rendering)."""
    doc = fitz.open(pdf_path)
    lines = X.extract_lines(doc)
    starts, quasi = X.find_question_starts(lines, doc)
    starts = X.fill_picture_only_questions(starts, doc)
    quasi_pos = sorted(X._pos(q["page"], q["y0"]) for q in quasi)
    res = {}
    for i, s in enumerate(starts):
        start_pos = X._pos(s["page"], s["y0"])
        end_pos = X._pos(starts[i + 1]["page"], starts[i + 1]["y0"]) if i + 1 < len(starts) else X._pos(doc.page_count, 0)
        nq = next((p for p in quasi_pos if start_pos < p < end_pos), None)
        if nq:
            end_pos = nq
        block = [l for l in lines if start_pos <= X._pos(l["page"], l["y0"]) < end_pos]
        brk = [l for l in block if X.SECTION_BREAK_RE.match(l["text"])]
        if brk:
            cut = min(X._pos(l["page"], l["y0"]) for l in brk)
            block = [l for l in block if X._pos(l["page"], l["y0"]) < cut]
        pages = sorted(set(l["page"] for l in block)) or [s["page"]]
        while len(pages) > 1 and X.is_branding_only([l for l in block if l["page"] == pages[-1]]):
            pages = pages[:-1]
        block = [l for l in block if l["page"] in pages]
        res[str(s["number"])] = _clean(block)
    doc.close()
    return res


def structured_texts(pdf_path, subject=None, component=None):
    """{question number: text} for a structured worksheet, using parse_structured's own start detectors and ranges (without rendering)."""
    doc = fitz.open(pdf_path)
    lines = X.extract_lines(doc)
    chain = X.STRUCTURED_CHAIN_BY_SUBJECT_COMPONENT.get((subject, component), X.DEFAULT_STRUCTURED_CHAIN)
    starts = []
    for detector in chain:
        starts = detector(lines)
        if starts:
            break
    res = {}
    for i, s in enumerate(starts):
        j = i + 1
        while j < len(starts) and starts[j]["page"] == s["page"] and starts[j]["y0"] == s["y0"]:
            j += 1
        end_page, end_y = (starts[j]["page"], starts[j]["y0"]) if j < len(starts) else (doc.page_count - 1, None)
        res[str(s["number"])] = clean_text(X.extract_block_text(lines, s["page"], s["y0"], end_page, end_y))
    doc.close()
    return res


def one(job):
    kind, qp, board, subject, component, title, nums = job
    path = os.path.join(LIB, "full-library" if kind == "mcq" else "structured-library", "pdfs", f"{qp}.pdf")
    try:
        texts = mcq_texts(path) if kind == "mcq" else structured_texts(path, subject, component)
    except Exception as e:  # one broken PDF must not stop the build
        return dict(kind=kind, qpId=qp, board=board, subject=subject, component=component, title=title, error=str(e)[:120], questions={}, wanted=nums)
    return dict(kind=kind, qpId=qp, board=board, subject=subject, component=component, title=title, questions={n: texts.get(str(n), "") for n in nums}, extra=sorted(set(texts) - set(map(str, nums))), wanted=nums)


def jobs():
    out = []
    for p in json.load(open(os.path.join(LIB, "full-library", "database.json"))):
        out.append(("mcq", p["qpId"], p.get("board"), p.get("subject"), None, p.get("title"), [q["questionNumber"] for q in p["questions"]]))
    for w in json.load(open(os.path.join(LIB, "structured-library", "database.json"))):
        out.append(("structured", w["qpId"], w.get("board"), w.get("subject"), w.get("component"), w.get("title"), [q["questionNumber"] for q in w["questions"]]))
    return out


def report(R):
    tot = sum(len(r["wanted"]) for r in R)
    have = sum(1 for r in R for n in r["wanted"] if r["questions"].get(n, "").strip())
    complete = sum(1 for r in R if all(r["questions"].get(n, "").strip() for n in r["wanted"]) and not r.get("error"))
    print(f"papers: {len(R)} | questions in the library: {tot} | with text: {have} ({100 * have / tot:.1f}%) | papers complete: {complete} ({100 * complete / len(R):.1f}%) | PDFs that failed: {sum(1 for r in R if r.get('error'))}")
    for kind in ("mcq", "structured"):
        k = [r for r in R if r["kind"] == kind]
        t = sum(len(r["wanted"]) for r in k)
        h = sum(1 for r in k for n in r["wanted"] if r["questions"].get(n, "").strip())
        short = sum(1 for r in k for n in r["wanted"] if 0 < len(r["questions"].get(n, "").strip()) < 25)
        print(f"  {kind}: {len(k)} papers, {t} questions, with text {h} ({100 * h / max(t, 1):.1f}%), very short text (under 25 characters): {short}")


if __name__ == "__main__":
    J = jobs()
    if "--limit" in sys.argv:
        J = J[: int(sys.argv[sys.argv.index("--limit") + 1])]
    print(len(J), "papers", flush=True)
    with Pool(8) as p:
        R = p.map(one, J, chunksize=4)
    os.makedirs(OUT, exist_ok=True)
    json.dump(R, open(os.path.join(OUT, "text.json"), "w"), ensure_ascii=False)
    report(R)
    print("DONE", flush=True)
