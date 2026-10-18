#!/usr/bin/env python3
"""Local copy of the owner's "DC Worksheet Formatter" colab (Drive: DC Worksheet Formatter.ipynb, cells "build_cover_page_stream" v14 and
"redact_pdf"), so a raw Save My Exams PDF becomes a branded DC worksheet without opening Colab:

  1. page 1 of the source is REPLACED by the DivergenCIE cover page (REPLACE_COVER = True in the notebook; page counts stay equal);
  2. the Save My Exams banner (found on page 2) is redacted on every page after the cover.

Same layout, same coordinates, same fields as the notebook. Output goes to a staging folder; nothing is uploaded here.

  python3 scripts/ops/format_worksheets.py m1-qp --tracker <tracker.csv> --src "<raw QP folder>" --logo <logo.jpg> --out <staging folder> [--limit N]

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
    if not ok:
        return False, f"page count {n} became {check.page_count}"
    if ratio > MAX_SIZE_RATIO:
        return False, f"size grew {ratio:.2f}x"
    return True, f"{note}, {n} pages, size x{ratio:.2f}"


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
    ap.add_argument("set", choices=["m1-qp"])
    ap.add_argument("--tracker", required=True); ap.add_argument("--src", required=True); ap.add_argument("--logo", required=True); ap.add_argument("--out", required=True)
    ap.add_argument("--limit", type=int)
    a = ap.parse_args()
    jobs = m1_qp_jobs(a.tracker, a.src)
    if a.limit: jobs = jobs[: a.limit]
    bad = 0
    for f, qp_name, info in jobs:
        if not info:
            print("NO MATCHING MARK SCHEME ROW:", f); bad += 1; continue
        problem = pairing_problem(os.path.join(a.src, f), info)
        if problem:
            print("PAIRING MISMATCH, skipped:", f, "|", problem); bad += 1; continue
        ok, note = format_pdf(os.path.join(a.src, f), os.path.join(a.out, qp_name), info, "QP", a.logo)
        print(("OK  " if ok else "FAIL"), qp_name[:80], "|", note); bad += 0 if ok else 1
    print(f"{len(jobs) - bad} of {len(jobs)} formatted")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
