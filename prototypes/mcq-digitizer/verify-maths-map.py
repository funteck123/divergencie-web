"""Checks every A Level Mathematics (9709) paper in the yearly library against its own printed cover title.
The paper numbers changed in 2020, so a wrong year rule would silently put Statistics under Mechanics (TKT-0275).
Run from prototypes/mcq-digitizer:  python3 verify-maths-map.py   -> exits 1 on any mismatch."""
import json, re, sys
import fitz

EXPECT = {
    "Paper 1: Pure Mathematics 1": r"pure mathematics 1|paper 1\b",
    "Paper 2: Pure Mathematics 2": r"pure mathematics 2|paper 2\b",
    "Paper 3: Pure Mathematics 3": r"pure mathematics 3|paper 3\b",
    "Paper 4: Mechanics": r"mechanics",
    "Paper 5: Probability & Statistics 1": r"statistics 1|\(s1\)",
    "Paper 6: Probability & Statistics 2": r"statistics 2|\(s2\)",
}
lib = json.load(open("../../data/mcq-digitizer/yearly-library/yearly-papers.json"))["A Levels"]["Mathematics"]
bad, n = [], 0
for comp, rx in EXPECT.items():
    for p in lib.get(comp, []):
        n += 1
        try:
            d = fitz.open(p["qpPath"]); t = " ".join(d[i].get_text() for i in range(min(2, d.page_count))).lower(); d.close()
        except Exception:
            bad.append((p["paperId"], "unreadable")); continue
        if not re.search(rx, t): bad.append((p["paperId"], comp))
        if comp == "Paper 4: Mechanics" and re.search(r"mechanics 2|\(m2\)", t): bad.append((p["paperId"], "is Mechanics 2, must not be in the list"))
print(f"checked {n} papers, {len(bad)} mismatches")
for b in bad: print(" ", b)
sys.exit(1 if bad else 0)
