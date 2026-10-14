"""TKT-0275: checks EVERY yearly paper's printed cover against what the library says it is.
For each paper with a question-paper file it reads the first two pages and requires:
  1. the printed "<syllabus code>/<variant>" (for example 9702/22) matches the paperId's code and variant;
  2. the printed paper number (the first digit of that variant) equals the N in the component name "Paper N: ...".
Mathematics 9709 is skipped for rule 2: its paper numbers changed in 2020 on purpose and verify-maths-map.py checks it against the cover title.
Covers from 2001 print the earlier syllabus code 8xxx for the same subject (8702 for 9702); that is accepted.
Some 2023 covers use a shifted font encoding (every character is 29 below the real one); the text is decoded before reading.
A paper whose cover cannot be read is reported separately, not counted as a pass.
Run from prototypes/mcq-digitizer:  python3 audit-yearly-numbering.py [out.json]   -> exit 1 on any mismatch."""
import json, re, sys
import fitz

LIB = "../../data/mcq-digitizer/yearly-library/yearly-papers.json"
lib = json.load(open(LIB))
def unshift(t):
    return "".join(chr(ord(c) + 29) if 0 < ord(c) < 100 else c for c in t)


rows, bad, unreadable, n = [], [], [], 0
for board, subjects in lib.items():
    for subject, comps in subjects.items():
        for comp, papers in comps.items():
            m = re.match(r"Paper (\d)", comp)
            for p in papers:
                if "qpPath" not in p or not m or not comp.startswith("Paper"):
                    continue
                n += 1
                code, sess, var = None, None, None
                mm = re.match(r"(\d{4})_([a-z]\d{2})_(\d{1,2})$", p["paperId"])
                if mm: code, sess, var = mm.groups()
                try:
                    d = fitz.open(p["qpPath"]); t = " ".join(d[i].get_text() for i in range(min(2, d.page_count))); d.close()
                except Exception as e:
                    unreadable.append((p["paperId"], str(e)[:60])); continue
                printed = re.findall(r"\b(\d{4})\s*/\s*(\d{1,2})\b", t) or re.findall(r"\b(\d{4})\s*/\s*(\d{1,2})\b", unshift(t))
                ok_id = any((c == code or (code and c == "8" + code[1:])) and (v.lstrip("0") or "0") == (var.lstrip("0") or "0") or (c == code and v.zfill(2) == var.zfill(2)) for c, v in printed) if code else None
                paper_no = int(m.group(1))
                # the variant's first digit is the paper number (two-digit variants); one-digit old files ARE the paper number
                var_paper = int(var[0]) if len(var) == 2 else int(var)
                issues = []
                if not printed: issues.append("no printed code/variant on the cover")
                elif not ok_id: issues.append(f"cover prints {sorted(set(printed))[:3]}, id says {code}/{var}")
                if var_paper != paper_no and code != "9709": issues.append(f"id variant {var} is paper {var_paper}, component says paper {paper_no}")
                if issues: bad.append((p["paperId"], comp, issues))
if len(sys.argv) > 1: json.dump({"checked": n, "bad": bad, "unreadable": unreadable}, open(sys.argv[1], "w"), indent=1)
print(f"checked {n} papers, {len(bad)} mismatches, {len(unreadable)} unreadable")
for b in bad[:60]: print(" ", b)
sys.exit(1 if bad else 0)
