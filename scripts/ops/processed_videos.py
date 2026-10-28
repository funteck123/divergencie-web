#!/usr/bin/env python3
"""Merge the processed-video ledger into the recordings dataset (TKT-0384).

The ledger (data/youtube/processed_ledger.json, one entry per source file name) says where the post-ready copy of each recording is and what was done to it.
This adds these columns to data/youtube/video_dataset.csv and .json, and fills them only for rows the ledger knows (other rows keep empty cells):
  processedVideoPath, processingNote, processedWidth, processedHeight, processedDurationMin, processedSizeMB, processedMd5, processedAt,
  recordedDate, batchFromBoard, readyToPost (yes / no / hold), holdReason, youtubeLink, processedYouTubeDescription
A ledger entry with notDuplicate (a text saying why) clears an older, wrong duplicateOf flag on that row.
A copy of a file that is already processed (same bytes) points at the same processed path, has duplicateOf set and readyToPost "no".
Nothing is uploaded: youtubeLink stays empty until the row has a youtubeId. Run it again after rebuilding the dataset with build_video_dataset.py.

  python3 scripts/ops/processed_videos.py [--dataset data/youtube/video_dataset] [--ledger data/youtube/processed_ledger.json]
"""
import csv, json, os, re, sys, time

NEW = ["processedVideoPath", "processingNote", "processedWidth", "processedHeight", "processedDurationMin", "processedSizeMB", "processedMd5", "processedAt",
       "recordedDate", "batchFromBoard", "readyToPost", "holdReason", "youtubeLink", "processedYouTubeDescription"]
MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def long_date(iso):
    y, m, d = iso.split("-")
    return f"{int(d)} {MONTHS[int(m) - 1]} {y}"


def description(row, entry, duration):
    ch = re.search(r"\| Ch (\d+) ", row.get("youtubeTitle", ""))
    code = row.get("subjectCode") or "9702"
    parts = [f"DivergenCIE class recording. {row['level']} {row['subject']} ({code})."]
    if row.get("component"): parts.append(f"Component: {row['component']}.")
    if row.get("chapterTitle"): parts.append(f"Chapter {ch.group(1) + ': ' if ch else ''}{row['chapterTitle']}.")
    if row.get("topic"): parts.append(f"Lesson: {row['topic']}.")
    if entry.get("date"): parts.append(f"Recorded: {long_date(entry['date'])}.")
    if entry.get("batch"): parts.append(f"Batch {entry['batch']}.")
    if row.get("instructor"): parts.append(f"Taught by {row['instructor']}.")
    parts.append(f"Duration: {round(duration)} min.")
    return " ".join(parts)


def main():
    a = sys.argv[1:]
    ds = a[a.index("--dataset") + 1] if "--dataset" in a else "data/youtube/video_dataset"
    lp = a[a.index("--ledger") + 1] if "--ledger" in a else "data/youtube/processed_ledger.json"
    ledger = json.load(open(lp))
    rows = list(csv.DictReader(open(ds + ".csv", newline="")))
    fields = list(rows[0].keys()) + [c for c in NEW if c not in rows[0]]
    touched = 0
    for r in rows:
        fn = os.path.basename(r.get("filePath") or r.get("localPaths") or "")
        e = ledger.get(fn)
        for c in NEW: r.setdefault(c, "")
        if not e: continue
        src = ledger.get(e["duplicateOf"]) if e.get("duplicateOf") else e
        r["processedVideoPath"] = e["processedPath"]
        if e.get("duplicateOf"):
            r["duplicateOf"] = e["duplicateOf"]; r["readyToPost"] = "no"; r["holdReason"] = "Byte-identical copy of " + e["duplicateOf"]
            r["processingNote"] = "Same file as " + e["duplicateOf"] + "; the processed copy is shared. Post only one."
        else:
            r["processingNote"] = e["note"]; r["holdReason"] = e.get("hold", "")
            if e.get("notDuplicate"):   # an older duplicateOf flag was checked against the bytes and is wrong
                r["processingNote"] += f" Dataset flag duplicateOf={r['duplicateOf']} cleared: {e['notDuplicate']}"; r["duplicateOf"] = ""
            r["readyToPost"] = "yes" if e.get("verified") and not e.get("hold") else ("hold" if e.get("hold") else "no")
        r["processedWidth"], r["processedHeight"], r["processedDurationMin"], r["processedSizeMB"], r["processedMd5"] = (src[k] for k in ("width", "height", "durationMin", "sizeMB", "md5"))
        r["recordedDate"], r["batchFromBoard"] = src.get("date", ""), src.get("batch", "")
        r["processedAt"] = time.strftime("%Y-%m-%d")
        r["youtubeLink"] = f"https://www.youtube.com/watch?v={r['youtubeId']}" if r.get("youtubeId") else ""
        r["processedYouTubeDescription"] = description(r, src, float(src["durationMin"]))
        touched += 1
    with open(ds + ".csv", "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields); w.writeheader(); w.writerows(rows)
    js = json.load(open(ds + ".json"))
    items = js if isinstance(js, list) else js.get("videos", js.get("rows", []))
    byfile = {os.path.basename(r.get("filePath") or r.get("localPaths") or ""): r for r in rows}
    for it in items:
        src = byfile.get(os.path.basename(it.get("filePath") or it.get("localPaths") or ""))
        if src: it.update({c: src[c] for c in NEW})
    json.dump(js, open(ds + ".json", "w"), indent=1)
    print(f"{touched} rows updated, {len(rows)} rows, {len(NEW)} new columns")


if __name__ == "__main__":
    main()
