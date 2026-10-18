#!/usr/bin/env python3
"""Local copy of the owner's "DC Worksheet Formatter" colab (Drive: DC Worksheet Formatter.ipynb, cells "build_cover_page_stream" v14 and
"redact_pdf"), so a raw Save My Exams PDF becomes a branded DC worksheet without opening Colab:

  1. page 1 of the source is REPLACED by the DivergenCIE cover page (REPLACE_COVER = True in the notebook; page counts stay equal);
  2. the Save My Exams banner (found on page 2) is redacted on every page after the cover.

Same layout, same coordinates, same fields as the notebook. Output goes to a staging folder; nothing is uploaded here.

  python3 scripts/ops/format_worksheets.py m1-qp --tracker <tracker.csv> --src "<raw QP folder>" --logo <logo.jpg> --out <staging folder> [--limit N]

Sets "s1" and "s2" (no tracker rows exist for them): pair every QP with the MS that has the same Save My Exams number, read time and marks from
page 1 of the raw files, number the chapter from the 9709 syllabus table below, and format both sides. A pair is skipped when the
two page-1 sheets disagree on time or marks.

  python3 scripts/ops/format_worksheets.py s1 --qp-dir <raw QP folder> --ms-dir <raw MS folder> --logo <logo.jpg> --out <staging folder>

Set "m1-qp": pairs every raw Mechanics QP (file name starts with the Save My Exams number, e.g. 25.3-...) with the tracker row of the
Mechanics mark scheme that starts with the same number, and reuses that row's fields (course, marks, time, chapter, version).
The output name is the file name of the row's "Output MS Path" with "MS" replaced by "QP".
"""
import argparse, csv, os, re, sys
import fitz

W, H = 595.276, 841.89  # A4 in points, same as reportlab's A4
SME_FRAGMENTS = ["Save My Exams", "savemyexams.co.uk", "Home of Revision", "awesome GCSE", "For more awesome", "www.savemyexams", "savemyexams", "exams", "savemy"]
SEARCH_PAGE_INDEX = 1
MAX_SIZE_RATIO = 1.50


def parse_level_subject(course_name):
    course = str(course_name).strip()
    for lvl in ["A Level", "AS Level", "O Level"]:
        if course.startswith(lvl):
            return lvl, course[len(lvl):].strip()
    parts = course.split(" ", 1)
    return (parts[0], parts[1]) if len(parts) == 2 else (course, "")


def wrap(text, font, size, width):
    words, lines, cur = text.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if fitz.get_text_length(t, fontname=font, fontsize=size) <= width:
            cur = t
        else:
            lines.append(cur); cur = w
    return lines + ([cur] if cur else [])


def build_cover(info, logo_path, resource_type):
    """One A4 page. y values follow the notebook's bottom-left origin and are flipped to PyMuPDF's top-left origin."""
    doc = fitz.open()
    page = doc.new_page(width=W, height=H)
    fy = lambda y: H - y
    black, grey = (0, 0, 0), (0x55 / 255, 0x55 / 255, 0x55 / 255)

    def text(x, y, s, font="helv", size=11, color=black):
        tw = fitz.TextWriter(page.rect)  # TextWriter keeps the en dash that insert_text turns into a dot
        tw.append((x, fy(y)), s, font=fitz.Font(font), fontsize=size)
        tw.write_text(page, color=color)

    def divider(y):
        page.draw_line((50, fy(y)), (W - 50, fy(y)), color=(0xaa / 255,) * 3, width=0.6)

    def row(y, label, value):
        text(50, y, label, "hebo"); text(190, y, str(value))

    logo_x, logo_y, logo_w, logo_h = 50, H - 115, 55, 55
    if os.path.exists(logo_path):
        page.insert_image(fitz.Rect(logo_x, fy(logo_y + logo_h), logo_x + logo_w, fy(logo_y)), filename=logo_path, keep_proportion=True)
    text(logo_x + logo_w + 14, logo_y + logo_h / 2 - 7, "DivergenCIE Coaching", "hebo", 18)
    text(50, logo_y - 28, "DC Study Resources", "hebo", 12)
    y = logo_y - 52
    divider(y)
    name = str(info.get("display_name", "")).strip().replace(".pdf", "").replace(".PDF", "")
    y -= 22
    text(50, y, "File:", "hebo")
    for i, line in enumerate(wrap(name, "helv", 11, W - 190 - 50)):
        if i > 0: y -= 14
        text(190, y, line)
    y -= 22
    divider(y)
    level, subject = parse_level_subject(info.get("course_name", ""))
    y -= 25
    for label, value in [("Level:", level), ("Subject:", subject), ("Board:", info.get("board", "")), ("Subject Code:", info.get("subject_code", "")), ("Instructor:", info.get("instructor", ""))]:
        row(y, label, value); y -= 25
    y -= 5
    divider(y); y -= 25
    cn, cnum = str(info.get("chapter_name", "")).strip(), str(info.get("chapter_num", "")).strip()
    topic = f"{cnum} {cn}" if cn and cnum else ""
    for label, value in [("Resource Type:", resource_type), ("Topic:", topic), ("Time Allowed:", info.get("time_allowed", "")), ("Maximum Marks:", info.get("maximum_marks", ""))]:
        if value: row(y, label, value); y -= 25
    grade = str(info.get("grade_threshold", "")).strip()
    if grade and grade.lower() != "nan":
        row(y, "Grade Thresholds:", grade); y -= 25
    y -= 5
    divider(y); y -= 20
    version = str(info.get("version", "")).strip()
    if version and version.lower() != "nan":
        text(50, y, "Version:", "hebo", 10, grey); text(190, y, f"v{version}", "helv", 10, grey)
    return doc


def banner_rect(page):
    hits = [r for frag in SME_FRAGMENTS for r in page.search_for(frag)]
    if not hits:
        return None
    return fitz.Rect(0, max(0, min(r.y0 for r in hits) - 5), page.rect.width, max(r.y1 for r in hits) + 5)


def format_pdf(src, out, info, label, logo):
    """Returns (ok, note). Cover replaces page 1; banner redacted on all later pages; output checked for page count and size."""
    resource = "Worksheet – Question Paper" if label == "QP" else "Worksheet – Mark Scheme"
    source = fitz.open(src)
    n = source.page_count
    if n == 0:
        return False, "source has 0 pages"
    dest = fitz.open()
    dest.insert_pdf(build_cover(info, logo, resource))
    if n > 1:
        dest.insert_pdf(source, from_page=1, to_page=n - 1)
    note = "no banner found"
    if dest.page_count > SEARCH_PAGE_INDEX:
        rect = banner_rect(dest[SEARCH_PAGE_INDEX])
        if rect:
            for i in range(1, dest.page_count):
                dest[i].add_redact_annot(rect, fill=(1, 1, 1)); dest[i].apply_redactions()
            note = "banner redacted"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    dest.save(out, garbage=4, deflate=True, clean=True)
    dest.close(); source.close()
    check = fitz.open(out)
    ok = check.page_count == n
    check.close()
    ratio = os.path.getsize(out) / max(1, os.path.getsize(src))
    extra = os.path.getsize(out) - os.path.getsize(src)
    if not ok:
        os.remove(out)
        return False, f"page count {n} became {check.page_count}"
    if ratio > MAX_SIZE_RATIO and extra > 150 * 1024:  # a tiny source plus the logo cover can pass 1.5x; only real bloat is rejected
        os.remove(out)
        return False, f"size grew {ratio:.2f}x (+{extra // 1024} KB)"
    return True, f"{note}, {n} pages, size x{ratio:.2f}"


INSTRUCTOR = "Mr. Mohammad Shahid Akhtar"
GRADE = "A*>90%, A>80%, B>70%, C>60%"
VERSION = "2"
# 9709 syllabus chapters per paper (the same numbering the owner used for Mechanics: Ch4.1 Forces ..., Ch4.5 Energy ...).
# SME number -> (chapter number, chapter title, sub topic). Sub topics come from the mark scheme file names: the sub topic printed on the Save My Exams
# covers is unreliable ("Booklet", or a stale "Descrete Random Variables" on binomial and normal papers).
SETS = {
    "s1": {"code": "S1", "chapters": {
        "37": ("5.1", "Representation of Data", "Diagrams"), "38": ("5.1", "Representation of Data", "Central Tendency & Variation"),
        "39": ("5.2", "Permutations and Combinations", ""), "40": ("5.3", "Probability", ""),
        "41": ("5.4", "Discrete Random Variables", "Probability Distribution Table"),
        "42": ("5.5", "The Binomial and Geometric Distributions", "Binomial Distribution"), "43": ("5.6", "The Normal Distribution", "")}},
    "s2": {"code": "S2", "chapters": {
        "44": ("6.1", "The Poisson Distribution", ""), "45": ("6.2", "Linear Combinations of Random Variables", ""),
        "46": ("6.3", "Continuous Random Variables", ""), "47": ("6.4", "Sampling and Estimation", "Samples"),
        "48": ("6.4", "Sampling and Estimation", "Population"), "49": ("6.5", "Hypothesis Tests", "")}},
}
SMALL = {"and", "of", "in", "the", "a", "to", "for", "on"}


def title_case(s):
    out = []
    for i, w in enumerate(re.sub(r"\s+", " ", s.replace("_", " ")).strip().split(" ")):
        out.append(w.lower() if i > 0 and w.lower() in SMALL else (w if w.isupper() and len(w) > 1 else w[:1].upper() + w[1:].lower()))
    return " ".join(out)


def raw_cover(pdf):
    """Fields printed on page 1 of a raw Save My Exams paper. Some covers use non-breaking spaces or letter-spaced text, so a second pass
    matches the text with every space removed."""
    t = fitz.open(pdf)[0].get_text()
    g = lambda pat: (re.search(pat, t) or [None, ""])[1].strip() if re.search(pat, t) else ""
    out = {"time": g(r"Time Allowed:\s*(\d+)\s*minutes"), "marks": g(r"Score:\s*/\s*(\d+)"), "topic": g(r"\nTopic\s*\n([^\n]*)"), "sub": ""}
    squeezed = re.sub(r"[\s\xa0]+", "", t).lower()
    if not out["time"]:
        m = re.search(r"timeallowed:?(\d+)min", squeezed); out["time"] = m.group(1) if m else ""
    if not out["marks"]:
        m = re.search(r"score:?/(\d+)", squeezed); out["marks"] = m.group(1) if m else ""
    return out


def sme_number(filename):
    m = re.match(r"^(\d+)\.(\d+)", filename)
    return (m.group(1), int(m.group(2))) if m else None


def sme_jobs(setname, qp_dir, ms_dir):
    """[(label, source path, output name, info or None, problem)] for every QP and MS of the set."""
    cfg = SETS[setname]
    def index(d):
        return {sme_number(f): f for f in sorted(os.listdir(d)) if f.lower().endswith(".pdf") and sme_number(f)}
    qps, mss = index(qp_dir), index(ms_dir)
    jobs = []
    for key in sorted(set(qps) | set(mss)):
        chapter, chapter_title, sub = cfg["chapters"].get(key[0], (None, None, None))
        n = key[1]
        if key not in qps or key not in mss or not chapter:
            jobs.append(("?", qps.get(key) or mss.get(key), None, None, "unpaired or unknown chapter " + ".".join(map(str, key)))); continue
        cq, cm = raw_cover(os.path.join(qp_dir, qps[key])), raw_cover(os.path.join(ms_dir, mss[key]))
        problem = "" if (cq["time"], cq["marks"]) == (cm["time"], cm["marks"]) and cq["time"] and cq["marks"] else f"QP {cq['time']} min /{cq['marks']} vs MS {cm['time']} min /{cm['marks']}"
        stem = f"CAIE A Level Maths Ch{chapter} {chapter_title}" + (f" - {sub}" if sub else "") + f" ({cfg['code']}) Worksheet {n}"
        base = {"course_name": "A Level Maths", "board": "CAIE", "subject_code": "9709", "instructor": INSTRUCTOR, "time_allowed": f"{cq['time']} minutes", "maximum_marks": cq["marks"],
                "grade_threshold": GRADE, "chapter_num": chapter, "chapter_name": sentence_case(chapter_title), "version": VERSION}
        jobs.append(("QP", os.path.join(qp_dir, qps[key]), f"{stem} QP.pdf", dict(base, display_name=f"{stem} QP"), problem))
        jobs.append(("MS", os.path.join(ms_dir, mss[key]), f"{stem} MS.pdf", dict(base, display_name=f"{stem} MS"), problem))
    return jobs


P3_CHAPTERS = {"A1": ("3.1", "Algebra"), "A2": ("3.2", "Logarithmic and Exponential Functions"), "A3": ("3.3", "Trigonometry"), "A4": ("3.4", "Differentiation"),
               "A5": ("3.5", "Integration"), "A6": ("3.6", "Numerical Solution of Equations"), "A7": ("3.7", "Vectors"), "A8": ("3.8", "Differential Equations"),
               "A9": ("3.9", "Complex Numbers")}
DIFFICULTY_ORDER = {"easy": 0, "medium": 1, "hard": 2}
P3_QP = re.compile(r"^(a\d+(?:[.-]\d+)?)-(.*?)-topic-booklet-(\d+)-+(easy|medium|hard)", re.I)
P3_MS = re.compile(r"^(a\d+(?:[.-]\d+)?)-(.*?)-mark-scheme-(\d+)-+(easy|medium|hard)", re.I)


def pretty(slug):
    """'Factor-_-Remainder-theorem' -> 'Factor & Remainder Theorem'."""
    return title_case(slug.replace("-_-", " & ").replace("-", " ").replace("_", " "))


def p3_index(folder, pattern):
    """{(code like 'A1.3' or 'A1', booklet, difficulty): (file name, readable sub topic)} and the files that match no pattern."""
    out, other = {}, []
    for f in sorted(os.listdir(folder)):
        if not f.lower().endswith(".pdf"):
            continue
        m = pattern.match(f.replace("a2-3-", "a2.3-", 1) if f.startswith("a2-3-") else f)
        if not m:
            other.append(f); continue
        key = (m.group(1).upper().replace("-", "."), int(m.group(3)), m.group(4).lower())
        if key in out:
            other.append(f); continue  # a second file for the same booklet: never guess which one is right
        out[key] = (f, pretty(m.group(2)))
    return out, other


def p3_jobs(qp_dir, ms_dir):
    qps, qp_other = p3_index(qp_dir, P3_QP)
    mss, ms_other = p3_index(ms_dir, P3_MS)
    jobs = [("?", f, None, None, "ignored: not a Paper 3 question paper booklet") for f in qp_other]
    jobs += [("?", f, None, None, "ignored: not a Paper 3 mark scheme (or a duplicate)") for f in ms_other]
    by_code = {}
    for key in sorted(set(qps) | set(mss), key=lambda k: (k[0], DIFFICULTY_ORDER[k[2]], k[1])):
        by_code.setdefault(key[0], []).append(key)
    for code, keys in by_code.items():
        chapter, title = P3_CHAPTERS[code.split(".")[0]]
        for n, key in enumerate(keys, 1):
            if key not in qps or key not in mss:
                jobs.append(("?", (qps.get(key) or mss.get(key))[0], None, None, "unpaired booklet " + "/".join(map(str, key)))); continue
            qf, sub = qps[key]
            cq, cm = raw_cover(os.path.join(qp_dir, qf)), raw_cover(os.path.join(ms_dir, mss[key][0]))
            # Paper 3 booklets print marks but often no time: marks must match, and a time must match when either sheet has one
            problem = "" if cq["marks"] and cq["marks"] == cm["marks"] and (cq["time"] == cm["time"] or not (cq["time"] and cm["time"])) else f"QP {cq['time'] or '-'} min /{cq['marks'] or '-'} vs MS {cm['time'] or '-'} min /{cm['marks'] or '-'}"
            sub_text = sub if "." in code else ""  # chapter-level (Hard) booklets have no sub topic of their own
            stem = f"CAIE A Level Maths Ch{chapter} {title}" + (f" - {sub_text}" if sub_text else "") + f" (P3) Worksheet {n}"
            base = {"course_name": "A Level Maths", "board": "CAIE", "subject_code": "9709", "instructor": INSTRUCTOR, "time_allowed": f"{cq['time'] or cm['time']} minutes" if (cq["time"] or cm["time"]) else "", "maximum_marks": cq["marks"],
                    "grade_threshold": GRADE, "chapter_num": chapter, "chapter_name": sentence_case(title), "version": VERSION}
            jobs.append(("QP", os.path.join(qp_dir, qf), f"{stem} QP.pdf", dict(base, display_name=f"{stem} QP"), problem))
            jobs.append(("MS", os.path.join(ms_dir, mss[key][0]), f"{stem} MS.pdf", dict(base, display_name=f"{stem} MS"), problem))
    return jobs


def sentence_case(s):
    return s[:1].upper() + s[1:].lower() if s else s


def m1_qp_jobs(tracker, src_dir):
    rows = list(csv.DictReader(open(tracker, encoding="utf8", errors="replace")))
    ms_rows = {}
    for r in rows:
        p = r["Mark Scheme Path"]
        if "/M1_MS/" in p:
            ms_rows[os.path.basename(p).split("-", 1)[0]] = r
    jobs = []
    for f in sorted(os.listdir(src_dir)):
        if not f.lower().endswith(".pdf"):
            continue
        key = re.match(r"^(\d+\.\d+)", f).group(1)
        r = ms_rows.get(key)
        if not r:
            jobs.append((f, None, None)); continue
        name = os.path.basename(r["Output MS Path"]).strip()  # the final file name, with the "CAIE A Level Maths" prefix
        qp_name = re.sub(r"\bMS\.pdf$", "QP.pdf", name)
        info = {k: r[k] for k in ("course_name", "board", "subject_code", "instructor", "time_allowed", "maximum_marks", "grade_threshold", "chapter_num", "chapter_name", "version")}
        info["display_name"] = qp_name
        jobs.append((f, qp_name, info))
    return jobs


def raw_time_and_marks(pdf):
    """Time allowed (minutes) and total marks as printed on page 1 of a raw Save My Exams paper, or (None, None)."""
    text = fitz.open(pdf)[0].get_text()
    t = re.search(r"Time Allowed:\s*(\d+)\s*minutes", text)
    m = re.search(r"Score:\s*/\s*(\d+)", text)
    return (int(t.group(1)) if t else None, int(m.group(1)) if m else None)


def pairing_problem(pdf, info):
    """A QP is only paired with a mark scheme row when the time and marks on its own page 1 equal the row's. Returns a message or ''."""
    t, m = raw_time_and_marks(pdf)
    want_t = int(re.search(r"\d+", str(info["time_allowed"])).group()) if re.search(r"\d+", str(info["time_allowed"])) else None
    want_m = int(re.search(r"\d+", str(info["maximum_marks"])).group()) if re.search(r"\d+", str(info["maximum_marks"])) else None
    if t is not None and want_t is not None and t != want_t: return f"time {t} min on the paper, {want_t} in the tracker"
    if m is not None and want_m is not None and m != want_m: return f"marks {m} on the paper, {want_m} in the tracker"
    return ""


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("set", choices=["m1-qp", "s1", "s2", "p3"])
    ap.add_argument("--tracker"); ap.add_argument("--src"); ap.add_argument("--qp-dir"); ap.add_argument("--ms-dir")
    ap.add_argument("--logo", required=True); ap.add_argument("--out", required=True)
    ap.add_argument("--limit", type=int)
    a = ap.parse_args()
    if a.set == "m1-qp":
        jobs = []
        for f, qp_name, info in m1_qp_jobs(a.tracker, a.src):
            problem = "no matching mark scheme row" if not info else pairing_problem(os.path.join(a.src, f), info)
            jobs.append(("QP", os.path.join(a.src, f), qp_name, info, problem))
    elif a.set == "p3":
        jobs = p3_jobs(a.qp_dir, a.ms_dir)
    else:
        jobs = sme_jobs(a.set, a.qp_dir, a.ms_dir)
    if a.limit: jobs = jobs[: a.limit]
    bad = 0
    for label, src, name, info, problem in jobs:
        if problem or not info:
            print("SKIPPED:", os.path.basename(src or "?"), "|", problem); bad += 1; continue
        ok, note = format_pdf(src, os.path.join(a.out, label, name), info, label, a.logo)
        print(("OK  " if ok else "FAIL"), name[:85], "|", note); bad += 0 if ok else 1
    print(f"{len(jobs) - bad} of {len(jobs)} formatted")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
