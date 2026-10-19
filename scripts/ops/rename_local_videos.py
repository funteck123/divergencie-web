#!/usr/bin/env python3
"""Rename local copies of recordings (found on C, D, E) to the library name, with a history file so each rename can be undone (TKT-0358).

Uses data/youtube/video_dataset.json: a row with localPaths, a proposedName and no needsReview is renamed in place (same folder, same drive). A target that already exists is skipped.
Each rename is first written to docs/recording-local-rename-history.csv (path before, path after, time, status).

  python3 scripts/ops/rename_local_videos.py [--dry-run]
  python3 scripts/ops/rename_local_videos.py --undo
"""
import csv, json, os, sys, time

HISTORY = "docs/recording-local-rename-history.csv"
COLS = ["before", "after", "time", "status"]


def history():
    return list(csv.DictReader(open(HISTORY, encoding="utf8"))) if os.path.exists(HISTORY) else []


def append(row):
    new = not os.path.exists(HISTORY)
    with open(HISTORY, "a", newline="", encoding="utf8") as f:
        w = csv.DictWriter(f, COLS)
        if new:
            w.writeheader()
        w.writerow(row)


def main():
    if "--undo" in sys.argv:
        last = {}
        for h in history():
            last[h["after"]] = h
        for after, h in last.items():
            if h["status"] == "renamed" and os.path.exists(after) and not os.path.exists(h["before"]):
                os.rename(after, h["before"]); append({"before": after, "after": h["before"], "time": time.strftime("%Y-%m-%dT%H:%M:%S"), "status": "undone"}); print("restored", h["before"][-80:])
        return
    dry = "--dry-run" in sys.argv
    n = 0
    for r in json.load(open("data/youtube/video_dataset.json")):
        if not (r["proposedName"] and not r["needsReview"] and r["upload"]):
            continue
        for path in r["localPaths"]:
            new = os.path.join(os.path.dirname(path), r["proposedName"])
            if path == new or not os.path.exists(path):
                continue
            if os.path.exists(new):
                print("skip, target exists:", new[-80:]); continue
            print(os.path.basename(path)[:70], "\n   ->", r["proposedName"])
            if not dry:
                append({"before": path, "after": new, "time": time.strftime("%Y-%m-%dT%H:%M:%S"), "status": "planned"})
                os.rename(path, new)
                append({"before": path, "after": new, "time": time.strftime("%Y-%m-%dT%H:%M:%S"), "status": "renamed"})
            n += 1
    print(n, "would be renamed" if dry else "renamed")


if __name__ == "__main__":
    main()
