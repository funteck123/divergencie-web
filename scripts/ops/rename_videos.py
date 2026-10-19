#!/usr/bin/env python3
"""Rename Drive recordings to the library's naming format, with a history file so every rename can be undone (TKT-0358).

Reads data/youtube/video_dataset.json (scripts/ops/build_video_dataset.py). A row is renamed only when it is a class video, has a proposedName and no needsReview note.
Before each rename the script checks that the file still has the name the dataset saw (it never renames a file someone changed meanwhile), appends the pair to
docs/recording-rename-history.csv (driveId, before, after, time, status), then renames. Only the name changes: id, link, folder and content stay the same.

  python3 scripts/ops/rename_videos.py [--limit N] [--dry-run]
  python3 scripts/ops/rename_videos.py --undo            restores every "renamed" row of the history to its before name

Needs GOOGLE_OAUTH_* in the environment (Drive scope).
"""
import csv, json, os, sys, time, urllib.parse, urllib.request

CID, CSEC, RT = (os.environ[k] for k in ("GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET", "GOOGLE_OAUTH_REFRESH_TOKEN"))
HISTORY = "docs/recording-rename-history.csv"
COLS = ["driveId", "before", "after", "time", "status"]
_tok = {"v": None, "e": 0}


def token():
    if time.time() > _tok["e"] - 120:
        r = json.load(urllib.request.urlopen(urllib.request.Request("https://oauth2.googleapis.com/token", urllib.parse.urlencode(
            {"client_id": CID, "client_secret": CSEC, "refresh_token": RT, "grant_type": "refresh_token"}).encode()), timeout=60))
        _tok["v"], _tok["e"] = r["access_token"], time.time() + r["expires_in"]
    return _tok["v"]


def call(fid, method="GET", name=None):
    url = f"https://www.googleapis.com/drive/v3/files/{fid}?fields=id,name&supportsAllDrives=true"
    data = json.dumps({"name": name}).encode() if name is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers={"Authorization": "Bearer " + token(), "Content-Type": "application/json"})
    return json.load(urllib.request.urlopen(req, timeout=60))


def read_history():
    if not os.path.exists(HISTORY):
        return []
    return list(csv.DictReader(open(HISTORY, encoding="utf8")))


def append(row):
    new = not os.path.exists(HISTORY)
    os.makedirs(os.path.dirname(HISTORY), exist_ok=True)
    with open(HISTORY, "a", newline="", encoding="utf8") as f:
        w = csv.DictWriter(f, COLS)
        if new:
            w.writeheader()
        w.writerow(row)


def main():
    args = sys.argv[1:]
    dry = "--dry-run" in args
    limit = int(args[args.index("--limit") + 1]) if "--limit" in args else None
    if "--undo" in args:
        last = {}
        for h in read_history():
            last[h["driveId"]] = h
        for fid, r in last.items():
            if r["status"] != "renamed":
                continue
            if call(fid)["name"] != r["after"]:
                print("skip (changed since):", fid); continue
            call(fid, "PATCH", r["before"])
            append({"driveId": fid, "before": r["after"], "after": r["before"], "time": time.strftime("%Y-%m-%dT%H:%M:%S"), "status": "undone"})
            print("restored", r["before"])
        return
    rows = [r for r in json.load(open("data/youtube/video_dataset.json")) if r["upload"] and r["proposedName"] and not r["needsReview"] and r["location"] == "Google Drive"]
    latest = {}
    for h in read_history():  # the last status of a file decides: renamed, then undone, means it can be renamed again
        latest[h["driveId"]] = h["status"]
    already = {fid for fid, st in latest.items() if st == "renamed"}
    n = 0
    for r in rows:
        if r["driveId"] in already or r["fileName"] == r["proposedName"]:
            continue
        if limit is not None and n >= limit:
            break
        try:
            current = call(r["driveId"])["name"]
        except Exception as e:
            print("cannot read", r["driveId"], str(e)[:80]); continue
        if current != r["fileName"]:
            print("skip (name changed since the dataset):", r["driveId"], current[:60]); continue
        print(f"{r['fileName'][:70]}\n   -> {r['proposedName']}")
        if dry:
            n += 1; continue
        row = {"driveId": r["driveId"], "before": r["fileName"], "after": r["proposedName"], "time": time.strftime("%Y-%m-%dT%H:%M:%S"), "status": "renamed"}
        append(dict(row, status="planned"))  # written before the call: a crash leaves a trace
        call(r["driveId"], "PATCH", r["proposedName"])
        append(row); n += 1
    print(n, "renamed" if not dry else "would be renamed")


if __name__ == "__main__":
    main()
