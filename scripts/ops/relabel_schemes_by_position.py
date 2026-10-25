#!/usr/bin/env python3
"""Relabel the mark scheme pictures of named structured worksheets by their stored position (TKT-0349).

Some booklets number their scheme pictures wrongly (1,2,3,5,4,5,6 for questions 1-7) while the pictures themselves sit in question order. The
caller must have LOOKED at the pairs (make_pair_images.py) and named the worksheets. A worksheet is refused unless it has as many scheme pictures
as questions. Backs up database.json first; nothing else changes.

  python3 scripts/ops/relabel_schemes_by_position.py <database.json> --only <qpId> [<qpId> ...]
"""
import argparse, json, shutil, sys, time

ap = argparse.ArgumentParser(); ap.add_argument("db"); ap.add_argument("--only", nargs="+", required=True)
a = ap.parse_args()
db = json.load(open(a.db)); by = {p["qpId"]: p for p in db}
missing = [q for q in a.only if q not in by]
if missing: sys.exit(f"unknown qpId: {missing}")
bad = [q for q in a.only if len(by[q]["answers"]) != len(by[q]["questions"])]
if bad: sys.exit(f"STOP: scheme count differs from question count, nothing written: {bad}")
backup = f"{a.db}.bak-{time.strftime('%Y%m%d-%H%M%S')}"; shutil.copy(a.db, backup); print("backup:", backup)
for q in a.only:
    p = by[q]; before = [x["questionNumber"] for x in p["answers"]]
    for ans, ques in zip(p["answers"], p["questions"]):
        ans["questionNumber"] = ques["questionNumber"]
    print(q, before, "->", [x["questionNumber"] for x in p["answers"]])
json.dump(db, open(a.db, "w"), ensure_ascii=False)
