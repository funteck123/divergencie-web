#!/usr/bin/env python3
"""Upload the post-ready class recordings (dataset rows with readyToPost = yes) to the DivergenCIE YouTube channel as UNLISTED videos, chapter by chapter (TKT-0358).

Title and description come from the dataset's processedYouTubeTitle and processedYouTubeDescription (they follow the whiteboard; no student names). One upload costs 1600 of the 10,000
daily API quota units, so a run uploads at most --limit videos (default 6) and stops at the first failure (a quota error included). Every result is written at once to the ledger
(data/youtube/ledger.json, key "md5:<file md5>") and to the dataset (youtubeId, youtubePrivacy, youtubeLink), so a rerun never uploads the same file twice.
Needs GOOGLE_OAUTH_* in the environment (source .env.local).

  python3 scripts/ops/youtube_upload_ready.py [--limit 6] [--dry-run] [--dataset data/youtube/video_dataset] [--ledger data/youtube/ledger.json]
"""
import csv, json, os, re, sys, time, urllib.error

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import youtube_upload as yu


def chapter_no(row):
    m = re.search(r"\| Ch (\d+) ", row.get("processedYouTubeTitle", ""))
    return int(m.group(1)) if m else 99


def fit_title(t):
    """YouTube titles are at most 100 characters. A lesson that starts with its own chapter name ("Physical quantities and units: introduction ...") loses that repeated prefix; any
    other title that is too long is refused (None), never cut off."""
    if len(t) <= 100:
        return t
    parts = t.split(" | ")
    if len(parts) == 3:
        chapter, lesson = re.sub(r"^Ch \d+ ", "", parts[1]), parts[2]
        if lesson.lower().startswith(chapter.lower() + ": "):
            lesson = lesson[len(chapter) + 2:]
            short = " | ".join([parts[0], parts[1], lesson[:1].upper() + lesson[1:]])
            if len(short) <= 100:
                return short
        elif ": " in lesson:  # lesson starts with its syllabus component (for example "Probability and Statistics 1: ...")
            short = " | ".join([parts[0], parts[1], lesson.split(": ", 1)[1]])
            if len(short) <= 100:
                return short
    return None


def pending(rows, ledger):
    """Ready, not yet on YouTube, in teaching order: chapter, then recording date, then title."""
    todo = [r for r in rows if r.get("processedVideoPath") and r.get("readyToPost") == "yes" and not r.get("youtubeId") and f"md5:{r.get('processedMd5', '')}" not in ledger]
    return sorted(todo, key=lambda r: (chapter_no(r), r.get("recordedDate", ""), r.get("processedYouTubeTitle", "")))


def row_key(r):
    return os.path.basename(r.get("filePath") or r.get("localPaths") or "")


def save(ds, rows, js, items):
    fields = list(rows[0].keys())
    with open(ds + ".csv", "w", newline="", encoding="utf8") as f:
        w = csv.DictWriter(f, fieldnames=fields); w.writeheader(); w.writerows(rows)
    byfile = {row_key(r): r for r in rows}
    for it in items:
        src = byfile.get(os.path.basename(it.get("filePath") or it.get("localPaths") or ""))
        if src:
            it.update({c: src[c] for c in ("youtubeId", "youtubePrivacy", "youtubeLink") if c in src})
    json.dump(js, open(ds + ".json", "w", encoding="utf8"), indent=1)


def main():
    a = sys.argv[1:]
    opt = lambda name, default: a[a.index(name) + 1] if name in a else default
    limit, dry = int(opt("--limit", 6)), "--dry-run" in a
    ds, lp = opt("--dataset", "data/youtube/video_dataset"), opt("--ledger", "data/youtube/ledger.json")
    ledger = json.load(open(lp)) if os.path.exists(lp) else {}
    rows = list(csv.DictReader(open(ds + ".csv", newline="", encoding="utf8")))
    js = json.load(open(ds + ".json", encoding="utf8"))
    items = js if isinstance(js, list) else js.get("videos", js.get("rows", []))
    todo = pending(rows, ledger)
    print(f"{len(todo)} ready recordings are not on YouTube yet; this run does up to {limit}", flush=True)
    for r in todo[:limit]:
        path = r["processedVideoPath"]
        if not os.path.exists(path):
            print("MISSING FILE, stopping:", path); sys.exit(1)
        title = fit_title(r["processedYouTubeTitle"])
        if not title:
            print("TITLE OVER 100 CHARACTERS AND CANNOT BE SHORTENED SAFELY, stopping:", r["processedYouTubeTitle"]); sys.exit(1)
        size = os.path.getsize(path)
        print("uploading", title, round(size / 1e6), "MB", flush=True)
        if dry:
            continue
        try:
            res = yu.stream(None, size, title, r["processedYouTubeDescription"], local_path=path)
        except urllib.error.HTTPError as e:
            print("FAILED", e.code, e.read().decode()[:500]); sys.exit(1)
        ledger[f"md5:{r['processedMd5']}"] = {"youtubeId": res["id"], "title": title, "privacyStatus": res["status"]["privacyStatus"], "localFile": os.path.basename(path), "uploadedAt": time.strftime("%Y-%m-%dT%H:%M:%S")}
        json.dump(ledger, open(lp, "w"), indent=1)
        r["youtubeId"], r["youtubePrivacy"], r["youtubeLink"] = res["id"], res["status"]["privacyStatus"], f"https://www.youtube.com/watch?v={res['id']}"
        save(ds, rows, js, items)
        print("  ->", res["id"], res["status"]["privacyStatus"], flush=True)


if __name__ == "__main__":
    main()
