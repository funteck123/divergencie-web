"""TKT-0304: check every 9608 / 9093 pair of the yearly library. Run from the repo root: python3 prototypes/mcq-digitizer/verify-legacy-yearly-pairs.py 1 9608 > out.jsonl One JSON line per pair to stdout.
cover: the printed '<code>/<variant>' on the question paper cover; total: sum of [N] marks in the QP vs the MS's printed 'Maximum Mark'; split: question numbers of QP vs MS."""
import json, re, sys, time
from multiprocessing import Pool
sys.path.insert(0, "prototypes/mcq-digitizer"); import extract_mcq as em, fitz
lib = json.load(open("data/mcq-digitizer/yearly-library/yearly-papers.json"))["A Levels"]
def papers():
    out = []
    for subj, code in (("Computer Science", "9608"), ("English Language", "9093")):
        for comp, lst in lib.get(subj, {}).items():
            for p in lst:
                if p.get("paperId", "").startswith(code + "_") and "qpPath" in p: out.append((subj, comp, p))
    return out
def one(a):
    subj, comp, p = a; r = {"id": p["paperId"], "comp": comp[:8]}; t0 = time.time()
    try:
        d = fitz.open(p["qpPath"]); t = " ".join(d[i].get_text() for i in range(min(2, d.page_count))); d.close()
        pr = set(re.findall(r"\b(\d{4})\s*/\s*(\d{2})\b", t)); code, var = p["paperId"].split("_")[0], p["paperId"].split("_")[2]
        r["cover_ok"] = (code, var) in pr; r["cover"] = sorted(pr)[:2]
        d = fitz.open(p["msPath"]); mt = " ".join(d[i].get_text() for i in range(min(3, d.page_count))); d.close()
        mm = re.search(r"Maximum\s+Mark\s*:?\s*(\d+)", mt, re.I) or re.search(r"(\d+)\s*marks?\s+maximum", mt, re.I); r["max"] = int(mm.group(1)) if mm else None
        q = em.parse_structured(p["qpPath"], subj, comp); m = em.parse_structured(p["msPath"], subj, comp)
        r["qn"] = [b["questionNumber"] for b in q]; r["mn"] = [b["questionNumber"] for b in m]
        r["qmarks"] = sum(int(b.get("marks") or 0) for b in q); r["qzero"] = sum(1 for b in q if not b.get("marks")); r["qcorr"] = sum(1 for b in q if b.get("corrupted")); r["mcorr"] = sum(1 for b in m if b.get("corrupted"))
    except Exception as e: r["error"] = str(e)[:120]
    r["sec"] = round(time.time() - t0, 1); return r
if __name__ == "__main__":
    ps = papers(); step = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    only = sys.argv[2] if len(sys.argv) > 2 else None
    if only: ps = [x for x in ps if x[2]["paperId"].startswith(only + "_")]
    ps = ps[::step]; print(len(ps), "pairs", file=sys.stderr)
    with Pool(6) as pool:
        for r in pool.imap_unordered(one, ps): print(json.dumps(r), flush=True)
